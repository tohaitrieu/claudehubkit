const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const simpleGit = require('simple-git');
const config = require('./config');
const { COMMANDS_DIR, COMMANDS_REPO, COMMAND_PREFIX } = require('./constants');

class CommandsManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.commandsPath = path.join(projectPath, COMMANDS_DIR);
  }

  /**
   * Xóa commands cũ và file không hợp lệ trong thư mục chk
   */
  cleanOldCommands() {
    const claudeCommandsDir = path.join(this.projectPath, '.claude', 'commands');
    
    // Danh sách các thư mục cũ có thể tồn tại (từ các version trước)
    const oldFolderNames = ['gckit', 'claudehubkit'];
    
    let cleaned = false;
    
    // Xóa các thư mục tên cũ
    for (const folderName of oldFolderNames) {
      const oldPath = path.join(claudeCommandsDir, folderName);
      
      if (fs.existsSync(oldPath)) {
        try {
          fs.rmSync(oldPath, { recursive: true, force: true });
          console.log(chalk.dim(`  Đã xóa thư mục cũ: ${folderName}/`));
          cleaned = true;
        } catch (error) {
          console.log(chalk.yellow(`  ⚠️ Không thể xóa ${folderName}: ${error.message}`));
        }
      }
    }
    
    // Kiểm tra thư mục chk hiện tại
    if (fs.existsSync(this.commandsPath)) {
      const files = fs.readdirSync(this.commandsPath);
      
      for (const file of files) {
        const filePath = path.join(this.commandsPath, file);
        const stat = fs.statSync(filePath);
        
        // Xóa thư mục con (không nên có trong commands)
        if (stat.isDirectory()) {
          try {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(chalk.dim(`  Đã xóa thư mục: ${file}/`));
            cleaned = true;
          } catch (error) {
            // Ignore
          }
          continue;
        }
        
        // Xóa file không phải .md
        if (!file.endsWith('.md')) {
          try {
            fs.unlinkSync(filePath);
            console.log(chalk.dim(`  Đã xóa: ${file}`));
            cleaned = true;
          } catch (error) {
            // Ignore
          }
          continue;
        }
        
        // Kiểm tra file .md có đúng format (có frontmatter)
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.startsWith('---')) {
          try {
            fs.unlinkSync(filePath);
            console.log(chalk.dim(`  Đã xóa (format cũ): ${file}`));
            cleaned = true;
          } catch (error) {
            // Ignore
          }
        }
      }
    }
    
    return cleaned;
  }

  async pull(repoUrl) {
    const repo = repoUrl || config.getCommandsRepo() || COMMANDS_REPO;
    
    // Xóa commands cũ trước
    console.log(chalk.dim('\n🧹 Kiểm tra và dọn dẹp commands cũ...'));
    const cleaned = this.cleanOldCommands();
    if (!cleaned) {
      console.log(chalk.dim('  Không có commands cũ cần xóa.'));
    }
    
    const spinner = ora(`Pulling commands từ ${repo}...`).start();

    try {
      // Ensure .claude/commands directory exists
      const claudeCommandsDir = path.join(this.projectPath, '.claude', 'commands');
      if (!fs.existsSync(claudeCommandsDir)) {
        fs.mkdirSync(claudeCommandsDir, { recursive: true });
      }

      // Clone to temp directory first
      const tempDir = path.join(this.projectPath, '.claude', '.temp-chk-clone');
      
      // Clean temp if exists
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      // Clone repo
      const git = simpleGit();
      await git.clone(repo, tempDir, ['--depth', '1']);
      
      // Create commands directory
      if (!fs.existsSync(this.commandsPath)) {
        fs.mkdirSync(this.commandsPath, { recursive: true });
      }
      
      // Copy only .md files from temp to commands directory
      const files = fs.readdirSync(tempDir);
      let copiedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.md') && file !== 'README.md') {
          const srcPath = path.join(tempDir, file);
          const destPath = path.join(this.commandsPath, file);
          
          // Only copy if it's a file (not directory)
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
            copiedCount++;
          }
        }
      }
      
      // Also check for commands in a 'commands' subdirectory (if repo has that structure)
      const commandsSubdir = path.join(tempDir, 'commands');
      if (fs.existsSync(commandsSubdir)) {
        const subFiles = fs.readdirSync(commandsSubdir);
        for (const file of subFiles) {
          if (file.endsWith('.md')) {
            const srcPath = path.join(commandsSubdir, file);
            const destPath = path.join(this.commandsPath, file);
            
            if (fs.statSync(srcPath).isFile()) {
              fs.copyFileSync(srcPath, destPath);
              copiedCount++;
            }
          }
        }
      }
      
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      if (copiedCount > 0) {
        spinner.succeed(`Đã tải ${copiedCount} commands!`);
      } else {
        spinner.warn('Không tìm thấy commands trong repo. Tạo mặc định...');
        await this.createDefaultCommands();
        return true;
      }

      // Save repo URL for future updates
      config.setCommandsRepo(repo);

      // List available commands
      this.listCommands();

      return true;
    } catch (error) {
      spinner.fail(`Lỗi: ${error.message}`);
      
      // If clone failed, try to create from embedded commands
      console.log(chalk.yellow('\n⚠️  Không thể pull từ repo. Tạo commands mặc định...\n'));
      await this.createDefaultCommands();
      return true;
    }
  }

  async createDefaultCommands() {
    // Clean old commands first (chỉ trong thư mục chk)
    console.log(chalk.dim('\n🧹 Kiểm tra và dọn dẹp commands cũ...'));
    this.cleanOldCommands();
    
    // Create commands directory
    if (!fs.existsSync(this.commandsPath)) {
      fs.mkdirSync(this.commandsPath, { recursive: true });
    }

    // Embedded default commands with proper format
    const commands = this.getEmbeddedCommands();

    for (const [filename, content] of Object.entries(commands)) {
      const filePath = path.join(this.commandsPath, filename);
      fs.writeFileSync(filePath, content);
    }

    console.log(chalk.green('✅ Đã tạo commands mặc định!\n'));
    this.listCommands();
  }

  listCommands() {
    console.log(chalk.cyan(`\n📋 Commands available (prefix: /${COMMAND_PREFIX}):\n`));

    if (!fs.existsSync(this.commandsPath)) {
      console.log(chalk.dim('  Chưa có commands. Chạy `claudehubkit init` để tải về.'));
      return;
    }

    const files = fs.readdirSync(this.commandsPath).filter(f => f.endsWith('.md'));
    
    files.forEach(file => {
      const name = file.replace('.md', '');
      const content = fs.readFileSync(path.join(this.commandsPath, file), 'utf8');
      
      // Parse description from frontmatter
      const descMatch = content.match(/^---[\s\S]*?description:\s*(.+?)[\r\n]/m);
      const desc = descMatch ? descMatch[1].trim() : '';
      
      console.log(`  ${chalk.green(`/${COMMAND_PREFIX}:${name}`)} - ${chalk.dim(desc)}`);
    });

    console.log('');
  }

  getEmbeddedCommands() {
    return {
      'bug.md': `---
description: 🐛 Create a bug issue on GitHub
argument-hint: [bug description]
---

## Mission
Create a GitHub issue for this bug:
<bug>$ARGUMENTS</bug>

## Workflow
1. Analyze the bug description to extract key information
2. If user provides screenshots, describe the visual issue in detail
3. Generate a clear, concise title (max 60 chars)
4. Structure the issue body with proper sections
5. Run the \`gh issue create\` command
6. Report back with the issue URL

## Issue Template
\`\`\`bash
gh issue create \\
  --title "🐛 Bug: [concise title]" \\
  --label "bug" \\
  --body "## Description
[detailed description]

## Steps to Reproduce
1. [step 1]
2. [step 2]

## Expected Behavior
[what should happen]

## Actual Behavior
[what actually happens]

## Environment
- OS: 
- Browser/Node: 

## Screenshots
[if provided]"
\`\`\`

## Notes
- If user provides an image, use \`--web\` flag to open browser for direct image paste
- Ask for clarification if bug description is unclear
- Always confirm the issue was created successfully`,

      'feature.md': `---
description: ✨ Create a feature request on GitHub
argument-hint: [feature description]
---

## Mission
Create a GitHub issue for this feature request:
<feature>$ARGUMENTS</feature>

## Workflow
1. Analyze the feature request to understand the need
2. Generate a clear, actionable title
3. Structure the issue with motivation and proposed solution
4. Run the \`gh issue create\` command
5. Report back with the issue URL

## Issue Template
\`\`\`bash
gh issue create \\
  --title "✨ Feature: [concise title]" \\
  --label "enhancement" \\
  --body "## Description
[what feature is being requested]

## Motivation
[why this feature is needed]

## Proposed Solution
[how it could be implemented]

## Alternatives Considered
[other approaches, if any]

## Checklist
- [ ] Design/mockup
- [ ] Implementation
- [ ] Testing
- [ ] Documentation"
\`\`\`

## Notes
- Focus on the "why" behind the feature
- Keep scope realistic and well-defined`,

      'task.md': `---
description: 📋 Create a task issue on GitHub
argument-hint: [task description]
---

## Mission
Create a GitHub issue for this task:
<task>$ARGUMENTS</task>

## Workflow
1. Analyze the task to understand scope
2. Break down into actionable checklist items
3. Generate a clear title
4. Run the \`gh issue create\` command
5. Report back with the issue URL

## Issue Template
\`\`\`bash
gh issue create \\
  --title "📋 Task: [concise title]" \\
  --label "task" \\
  --body "## Description
[what needs to be done]

## Checklist
- [ ] [subtask 1]
- [ ] [subtask 2]

## Acceptance Criteria
[how we know this is done]"
\`\`\``,

      'hotfix.md': `---
description: 🚨 Create an urgent hotfix issue
argument-hint: [critical issue description]
---

## Mission
Create an URGENT GitHub issue:
<hotfix>$ARGUMENTS</hotfix>

## Workflow
1. Immediately analyze the severity
2. Create high-priority issue with urgent labels
3. Run the \`gh issue create\` command
4. Suggest immediate next steps

## Issue Template
\`\`\`bash
gh issue create \\
  --title "🚨 HOTFIX: [concise title]" \\
  --label "bug,urgent,priority:critical" \\
  --body "## ⚠️ URGENT - Requires Immediate Attention

## Problem
[what is broken]

## Impact
[how this affects users/system]

## Workaround
[if any exists]

## Proposed Fix
[immediate solution]"
\`\`\``,

      'list.md': `---
description: 📃 List GitHub issues with filters
argument-hint: [bugs|features|mine|all]
---

## Mission
List GitHub issues based on filter:
<filter>$ARGUMENTS</filter>

## Commands
\`\`\`bash
# All open issues
gh issue list --state open

# Bugs only
gh issue list --label "bug"

# Features
gh issue list --label "enhancement"

# My issues
gh issue list --assignee "@me"

# With details
gh issue list --json number,title,labels,assignees
\`\`\`

## Notes
- Default to showing open issues
- Suggest \`/chk:work\` for solving issues`,

      'close.md': `---
description: ✅ Close a GitHub issue
argument-hint: [issue number] [reason]
---

## Mission
Close this GitHub issue:
<issue>$ARGUMENTS</issue>

## Workflow
1. Parse issue number
2. Fetch issue details to confirm
3. Ask for confirmation
4. Close with comment

## Commands
\`\`\`bash
gh issue close [NUMBER] --comment "Fixed in [commit/PR]"
gh issue close [NUMBER] --reason "completed"
gh issue close [NUMBER] --reason "not planned"
\`\`\`

## Notes
- Always confirm before closing
- Add a closing comment`,

      'work.md': `---
description: 🔧 Fetch and solve GitHub issues [WORKFLOW]
argument-hint: [issue number or filter]
---

## Mission
Fetch, analyze, and solve GitHub issues:
<target>$ARGUMENTS</target>

## Workflow

### Phase 1: Fetch
\`\`\`bash
gh issue list --state open --json number,title,body,labels
gh issue view [NUMBER]
\`\`\`

### Phase 2: Analyze
1. Read issue details and comments
2. Identify related files in codebase
3. Plan the fix

### Phase 3: Implement
\`\`\`bash
git checkout -b fix/issue-[NUMBER]
# ... make changes ...
git commit -m "Fix: [description] (#NUMBER)"
\`\`\`

### Phase 4: Submit
\`\`\`bash
gh pr create --title "Fix: [title]" --body "Closes #[NUMBER]"
\`\`\`

## Safety Rules
- ⚠️ ALWAYS ask confirmation before modifying files
- ⚠️ ALWAYS ask confirmation before committing
- ⚠️ NEVER force push to main`,

      'next.md': `---
description: ⏭️ Get the next issue to work on
argument-hint: [bugs|features|mine]
---

## Mission
Suggest the next best issue to work on:
<filter>$ARGUMENTS</filter>

## Workflow
\`\`\`bash
gh issue list --state open --json number,title,labels,createdAt --limit 20
\`\`\`

## Priority Order
1. 🚨 urgent, priority:critical
2. 🔴 bug, priority:high
3. 🟡 priority:medium
4. 🟢 enhancement, priority:low
5. ⚪ No labels (oldest first)

## Notes
- Skip issues assigned to others
- Prefer issues with clear descriptions`,

      'new.md': `---
description: 🆕 Smart issue creation (auto-detect type)
argument-hint: [issue description]
---

## Mission
Analyze and create the appropriate issue type:
<description>$ARGUMENTS</description>

## Type Detection

| Keywords | Type | Labels |
|----------|------|--------|
| bug, lỗi, crash, error, broken | Bug 🐛 | bug |
| feature, thêm, add, muốn có | Feature ✨ | enhancement |
| task, việc, todo, setup | Task 📋 | task |
| urgent, critical, hotfix | Hotfix 🚨 | bug,urgent |
| refactor, clean, optimize | Refactor 🔧 | refactor |
| docs, document, readme | Docs 📚 | documentation |

## Workflow
1. Scan for keywords
2. If unclear, ask user
3. Create issue with appropriate template`,

      'view.md': `---
description: 👁️ View issue details
argument-hint: [issue number]
---

## Mission
Display detailed information about:
<issue>$ARGUMENTS</issue>

## Command
\`\`\`bash
gh issue view [NUMBER] --json number,title,body,state,labels,assignees,comments
\`\`\`

## Notes
- Analyze codebase to find related files
- Suggest next actions`,

      'pr.md': `---
description: 🔀 Create or manage pull requests
argument-hint: [create|list|view|merge]
---

## Mission
Manage GitHub pull requests:
<action>$ARGUMENTS</action>

## Commands
\`\`\`bash
# Create PR
gh pr create --title "[type]: [desc]" --body "Closes #[NUMBER]"

# List PRs
gh pr list

# View PR
gh pr view [NUMBER]

# Merge PR
gh pr merge [NUMBER] --squash
\`\`\`

## PR Title Conventions
- \`Fix:\` Bug fixes
- \`Feat:\` New features
- \`Refactor:\` Code refactoring
- \`Docs:\` Documentation`,
    };
  }
}

module.exports = CommandsManager;
