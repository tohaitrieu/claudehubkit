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

  async pull(repoUrl) {
    const repo = repoUrl || config.getCommandsRepo() || COMMANDS_REPO;
    const spinner = ora(`Pulling commands từ ${repo}...`).start();

    try {
      // Ensure .claude/commands directory exists
      const claudeCommandsDir = path.join(this.projectPath, '.claude', 'commands');
      if (!fs.existsSync(claudeCommandsDir)) {
        fs.mkdirSync(claudeCommandsDir, { recursive: true });
      }

      // Check if gckit commands already exist
      if (fs.existsSync(this.commandsPath)) {
        // Update existing
        const git = simpleGit(this.commandsPath);
        await git.pull();
        spinner.succeed('Commands đã được cập nhật!');
      } else {
        // Clone new
        const git = simpleGit();
        await git.clone(repo, this.commandsPath, ['--depth', '1']);
        spinner.succeed('Commands đã được tải về!');
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
    // Create commands directory
    if (!fs.existsSync(this.commandsPath)) {
      fs.mkdirSync(this.commandsPath, { recursive: true });
    }

    // Embedded default commands
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
      const firstLine = content.split('\n')[0].replace(/^#*\s*/, '').substring(0, 50);
      
      console.log(`  ${chalk.green(`/${COMMAND_PREFIX}:${name}`)} - ${chalk.dim(firstLine)}`);
    });

    console.log('');
  }

  getEmbeddedCommands() {
    return {
      'bug.md': `Tạo GitHub issue cho BUG: $ARGUMENTS

Phân tích yêu cầu và tạo issue:

\`\`\`bash
gh issue create \\
  --title "🐛 Bug: [tóm tắt]" \\
  --label "bug" \\
  --body "## Mô tả
[mô tả bug]

## Steps to reproduce
1. 

## Expected vs Actual

## Environment
"
\`\`\`

Nếu có image, dùng \`--web\` để user paste trực tiếp.`,

      'feature.md': `Tạo GitHub issue cho FEATURE: $ARGUMENTS

\`\`\`bash
gh issue create \\
  --title "✨ Feature: [tóm tắt]" \\
  --label "enhancement" \\
  --body "## Mô tả tính năng
[mô tả]

## Proposed solution

## Checklist
- [ ] Implementation
- [ ] Testing
- [ ] Documentation"
\`\`\``,

      'task.md': `Tạo GitHub issue cho TASK: $ARGUMENTS

\`\`\`bash
gh issue create \\
  --title "📋 Task: [tóm tắt]" \\
  --label "task" \\
  --body "## Mô tả
[mô tả]

## Checklist
- [ ] "
\`\`\``,

      'hotfix.md': `Tạo GitHub issue HOTFIX (urgent): $ARGUMENTS

\`\`\`bash
gh issue create \\
  --title "🚨 HOTFIX: [tóm tắt]" \\
  --label "bug,urgent,priority:critical" \\
  --body "## ⚠️ URGENT

## Mô tả vấn đề

## Impact

## Workaround"
\`\`\``,

      'list.md': `Liệt kê GitHub issues: $ARGUMENTS

\`\`\`bash
# Tất cả issues đang mở
gh issue list

# Filter theo label
gh issue list --label "bug"
gh issue list --label "enhancement"

# Filter theo assignee
gh issue list --assignee "@me"
\`\`\``,

      'close.md': `Đóng GitHub issue: $ARGUMENTS

\`\`\`bash
gh issue close [number] --comment "Fixed in [commit/PR]"
\`\`\``,

      'work.md': `GitHub Issue Workflow - Fetch, Analyze, Solve: $ARGUMENTS

## Quy trình

1. Fetch open issues:
\`\`\`bash
gh issue list --state open --json number,title,body,labels
\`\`\`

2. Xem chi tiết issue:
\`\`\`bash
gh issue view [NUMBER]
\`\`\`

3. Tạo branch:
\`\`\`bash
git checkout -b fix/issue-[NUMBER]
\`\`\`

4. Implement fix, test, commit:
\`\`\`bash
git commit -m "Fix: [description] (#NUMBER)"
\`\`\`

5. Tạo PR:
\`\`\`bash
gh pr create --title "Fix: [title]" --body "Closes #NUMBER"
\`\`\`

**LUÔN hỏi confirm trước khi sửa code hoặc tạo PR.**`,

      'next.md': `Lấy issue tiếp theo để làm việc: $ARGUMENTS

\`\`\`bash
gh issue list --state open --json number,title,labels,createdAt --limit 10
\`\`\`

Priority:
1. 🚨 urgent/critical
2. 🔴 bug
3. 🟡 enhancement
4. ⚪ others (sort by createdAt)

Suggest issue phù hợp nhất và hỏi user confirm.`,

      'new.md': `Tạo GitHub issue thông minh: $ARGUMENTS

Phân tích $ARGUMENTS và tự động chọn loại:

| Keywords | Type |
|----------|------|
| lỗi, bug, crash, error | Bug 🐛 |
| thêm, feature, muốn có | Feature ✨ |
| task, việc, cần làm | Task 📋 |
| urgent, gấp | Hotfix 🚨 |
| refactor, clean | Refactor 🔧 |
| docs, document | Docs 📚 |

Tạo issue với format phù hợp.`,
    };
  }
}

module.exports = CommandsManager;
