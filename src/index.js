const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const init = require('./init');
const config = require('./config');
const authManager = require('./auth');
const CommandsManager = require('./commands');
const { COMMAND_PREFIX } = require('./constants');

const program = new Command();

program
  .name('claudehubkit')
  .description('Claude + GitHub Kit - Manage GitHub issues with Claude Code')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Khởi tạo claudehubkit trong dự án')
  .option('-p, --path <path>', 'Đường dẫn thư mục dự án')
  .action(init);

// Update commands
program
  .command('update')
  .description('Cập nhật commands từ repo')
  .option('-p, --path <path>', 'Đường dẫn thư mục dự án', process.cwd())
  .action(async (options) => {
    const projectPath = path.resolve(options.path);
    const commandsManager = new CommandsManager(projectPath);
    await commandsManager.pull();
  });

// List commands
program
  .command('list')
  .alias('ls')
  .description('Liệt kê commands có sẵn')
  .option('-p, --path <path>', 'Đường dẫn thư mục dự án', process.cwd())
  .action((options) => {
    const projectPath = path.resolve(options.path);
    const commandsManager = new CommandsManager(projectPath);
    commandsManager.listCommands();
  });

// Auth management (replaces token command)
program
  .command('auth')
  .description('Quản lý GitHub authentication')
  .option('--login', 'Đăng nhập GitHub')
  .option('--logout', 'Đăng xuất GitHub')
  .option('--status', 'Kiểm tra trạng thái đăng nhập')
  .action(async (options) => {
    if (options.logout) {
      await authManager.logout();
    } else if (options.login) {
      await authManager.ensureAuth();
    } else {
      // Default: show status
      const status = await authManager.status();
      if (!status.installed) {
        console.log(chalk.red('❌ GitHub CLI (gh) chưa cài đặt'));
      } else if (status.authenticated) {
        console.log(chalk.green(`✅ Đã đăng nhập: ${status.username}`));
      } else {
        console.log(chalk.yellow('⚠️  Chưa đăng nhập. Chạy `claudehubkit auth --login`'));
      }
    }
  });

// Status
program
  .command('status')
  .description('Kiểm tra trạng thái claudehubkit')
  .option('-p, --path <path>', 'Đường dẫn thư mục dự án', process.cwd())
  .action(async (options) => {
    const projectPath = path.resolve(options.path);

    console.log(chalk.cyan.bold('\n📊 claudehubkit status\n'));

    // Check GitHub auth
    const authStatus = await authManager.status();
    if (!authStatus.installed) {
      console.log(`  gh CLI: ${chalk.red('❌')} Chưa cài đặt`);
      console.log(`  GitHub: ${chalk.dim('-')}`);
    } else {
      console.log(`  gh CLI: ${chalk.green('✅')} Đã cài đặt`);
      if (authStatus.authenticated) {
        console.log(`  GitHub: ${chalk.green('✅')} ${authStatus.username}`);
      } else {
        console.log(`  GitHub: ${chalk.yellow('⚠️')} Chưa đăng nhập`);
      }
    }

    // Check commands
    const commandsPath = path.join(projectPath, '.claude', 'commands', 'chk');
    if (fs.existsSync(commandsPath)) {
      const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.md'));
      console.log(`  Commands: ${chalk.green('✅')} ${files.length} commands`);
    } else {
      console.log(`  Commands: ${chalk.yellow('⚠️')} Chưa cài đặt`);
    }

    // Project config
    const projectConfig = config.getProjectConfig(projectPath);
    if (projectConfig.initialized) {
      console.log(`  Project: ${chalk.green('✅')} Initialized`);
    } else {
      console.log(`  Project: ${chalk.yellow('⚠️')} Chưa khởi tạo`);
    }

    console.log(chalk.dim(`\n  Path: ${projectPath}\n`));
  });

// Help with examples
program
  .command('help-commands')
  .description('Hướng dẫn sử dụng commands trong Claude Code')
  .action(() => {
    console.log(chalk.cyan.bold('\n📖 Hướng dẫn sử dụng claudehubkit với Claude Code\n'));
    
    console.log(chalk.yellow('Tạo issues:\n'));
    console.log(`  /${COMMAND_PREFIX}:bug Login không hoạt động khi nhập email có dấu cách`);
    console.log(`  /${COMMAND_PREFIX}:feature Thêm dark mode cho dashboard`);
    console.log(`  /${COMMAND_PREFIX}:task Setup CI/CD pipeline`);
    console.log(`  /${COMMAND_PREFIX}:hotfix Production database connection leak`);
    console.log(`  /${COMMAND_PREFIX}:new [mô tả] - Tự động nhận diện loại issue`);
    
    console.log(chalk.yellow('\nQuản lý issues:\n'));
    console.log(`  /${COMMAND_PREFIX}:list - Liệt kê tất cả issues`);
    console.log(`  /${COMMAND_PREFIX}:list bugs - Liệt kê bugs`);
    console.log(`  /${COMMAND_PREFIX}:close 42 - Đóng issue #42`);
    
    console.log(chalk.yellow('\nWorkflow:\n'));
    console.log(`  /${COMMAND_PREFIX}:work - Fetch issues và bắt đầu solve`);
    console.log(`  /${COMMAND_PREFIX}:work 42 - Solve issue #42`);
    console.log(`  /${COMMAND_PREFIX}:next - Suggest issue tiếp theo theo priority`);
    
    console.log('');
  });

program.parse();
