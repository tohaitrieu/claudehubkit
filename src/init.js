const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const config = require('./config');
const authManager = require('./auth');
const CommandsManager = require('./commands');
const { COMMANDS_REPO, COMMAND_PREFIX } = require('./constants');

async function selectProjectDirectory() {
  const cwd = process.cwd();

  const { projectPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectPath',
      message: 'Thư mục dự án:',
      default: cwd,
      validate: (input) => {
        const resolved = path.resolve(input);
        if (!fs.existsSync(resolved)) {
          return `Thư mục không tồn tại: ${resolved}`;
        }
        if (!fs.statSync(resolved).isDirectory()) {
          return 'Đường dẫn không phải là thư mục';
        }
        return true;
      },
    },
  ]);

  return path.resolve(projectPath);
}

async function init(options) {
  console.log(chalk.cyan.bold('\n🚀 claudehubkit init\n'));

  // Step 1: Select project directory
  console.log(chalk.cyan('📁 Bước 1: Chọn thư mục dự án\n'));
  
  let projectPath;
  if (options.path) {
    projectPath = path.resolve(options.path);
    if (!fs.existsSync(projectPath)) {
      console.log(chalk.red(`❌ Thư mục không tồn tại: ${projectPath}`));
      process.exit(1);
    }
  } else {
    projectPath = await selectProjectDirectory();
  }

  console.log(chalk.green(`\n✅ Dự án: ${projectPath}\n`));

  // Check if it's a git repo
  const isGitRepo = fs.existsSync(path.join(projectPath, '.git'));
  if (!isGitRepo) {
    console.log(chalk.yellow('⚠️  Thư mục này không phải git repository.'));
    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Tiếp tục?',
        default: false,
      },
    ]);

    if (!continueAnyway) {
      console.log(chalk.dim('\nHủy bỏ. Chạy `git init` trước hoặc chọn thư mục khác.\n'));
      process.exit(0);
    }
  }

  // Step 2: GitHub Authentication (via gh CLI)
  console.log(chalk.cyan('\n🔑 Bước 2: Xác thực GitHub\n'));
  const authSuccess = await authManager.ensureAuth();
  
  if (!authSuccess) {
    console.log(chalk.red('\n❌ Không thể xác thực GitHub. Vui lòng thử lại.\n'));
    process.exit(1);
  }

  // Step 3: Commands repo
  console.log(chalk.cyan('\n📦 Bước 3: Tải commands cho Claude Code\n'));

  const { commandsRepo } = await inquirer.prompt([
    {
      type: 'input',
      name: 'commandsRepo',
      message: 'Commands repo URL (Enter để dùng mặc định):',
      default: config.getCommandsRepo() || COMMANDS_REPO,
    },
  ]);

  const commandsManager = new CommandsManager(projectPath);
  await commandsManager.pull(commandsRepo);

  // Step 4: Save project config
  config.setProjectConfig(projectPath, {
    initialized: true,
    commands_repo: commandsRepo,
  });

  // Done!
  console.log(chalk.green.bold('\n✅ Khởi tạo thành công!\n'));
  console.log(chalk.cyan('Cách sử dụng trong Claude Code:\n'));
  console.log(`  ${chalk.yellow(`/${COMMAND_PREFIX}:bug`)} [mô tả]     - Tạo bug issue`);
  console.log(`  ${chalk.yellow(`/${COMMAND_PREFIX}:feature`)} [mô tả] - Tạo feature request`);
  console.log(`  ${chalk.yellow(`/${COMMAND_PREFIX}:task`)} [mô tả]    - Tạo task`);
  console.log(`  ${chalk.yellow(`/${COMMAND_PREFIX}:work`)}            - Fetch & solve issues`);
  console.log(`  ${chalk.yellow(`/${COMMAND_PREFIX}:next`)}            - Suggest issue tiếp theo`);
  console.log(`  ${chalk.yellow(`/${COMMAND_PREFIX}:list`)}            - Liệt kê issues`);
  console.log('');
}

module.exports = init;
