const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { execSync, spawn } = require('child_process');

class TokenManager {
  
  /**
   * Kiểm tra gh CLI đã cài đặt chưa
   */
  checkGhInstalled() {
    try {
      execSync('gh --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Kiểm tra đã login gh chưa
   */
  async checkGhAuth() {
    try {
      execSync('gh auth status', { stdio: 'ignore' });
      return { authenticated: true };
    } catch (error) {
      return { authenticated: false };
    }
  }

  /**
   * Lấy thông tin user đang login
   */
  async getAuthenticatedUser() {
    try {
      const username = execSync('gh api user -q .login', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      return { success: true, username };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Đảm bảo đã authenticate với GitHub
   */
  async ensureAuth() {
    // Check gh CLI installed
    if (!this.checkGhInstalled()) {
      console.log(chalk.red('\n❌ GitHub CLI (gh) chưa được cài đặt.\n'));
      console.log('Cài đặt:');
      console.log(chalk.cyan('  macOS:  ') + 'brew install gh');
      console.log(chalk.cyan('  Ubuntu: ') + 'sudo apt install gh');
      console.log(chalk.cyan('  Windows:') + 'winget install GitHub.cli');
      console.log(chalk.dim('\nXem thêm: https://cli.github.com/\n'));
      process.exit(1);
    }

    // Check gh auth status
    const spinner = ora('Kiểm tra GitHub authentication...').start();
    const authStatus = await this.checkGhAuth();

    if (authStatus.authenticated) {
      const user = await this.getAuthenticatedUser();
      if (user.success) {
        spinner.succeed(`Đã xác thực: ${chalk.green(user.username)} ${chalk.dim('(via gh auth)')}`);
        return true;
      }
    }

    spinner.fail('Chưa đăng nhập GitHub');
    console.log(chalk.yellow('\n⚠️  Bạn cần đăng nhập GitHub CLI.\n'));

    return await this.promptLogin();
  }

  /**
   * Hướng dẫn và thực hiện login
   */
  async promptLogin() {
    console.log(chalk.cyan('ℹ️  claudehubkit sử dụng GitHub CLI để xác thực.'));
    console.log(chalk.dim('   Token được quản lý bảo mật bởi gh, không lưu trong file config.\n'));

    const { shouldLogin } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldLogin',
        message: 'Đăng nhập GitHub ngay?',
        default: true,
      },
    ]);

    if (!shouldLogin) {
      console.log(chalk.dim('\nChạy `gh auth login` khi sẵn sàng.\n'));
      process.exit(0);
    }

    console.log(chalk.cyan('\n📋 Bắt đầu đăng nhập GitHub...\n'));

    // Run gh auth login interactively
    return new Promise((resolve) => {
      const ghLogin = spawn('gh', ['auth', 'login'], {
        stdio: 'inherit', // Interactive mode
      });

      ghLogin.on('close', async (code) => {
        if (code === 0) {
          const user = await this.getAuthenticatedUser();
          if (user.success) {
            console.log(chalk.green(`\n✅ Đăng nhập thành công! Xin chào ${user.username}\n`));
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          console.log(chalk.red('\n❌ Đăng nhập thất bại. Thử lại với `gh auth login`\n'));
          resolve(false);
        }
      });

      ghLogin.on('error', (err) => {
        console.log(chalk.red(`\n❌ Lỗi: ${err.message}\n`));
        resolve(false);
      });
    });
  }

  /**
   * Logout
   */
  async logout() {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Đăng xuất khỏi GitHub?',
        default: false,
      },
    ]);

    if (!confirm) return;

    try {
      const spinner = ora('Đang đăng xuất...').start();
      execSync('gh auth logout', { stdio: 'ignore' });
      spinner.succeed('Đã đăng xuất');
    } catch (error) {
      console.log(chalk.yellow('\nChạy `gh auth logout` để đăng xuất thủ công.\n'));
    }
  }

  /**
   * Hiển thị trạng thái auth
   */
  async status() {
    if (!this.checkGhInstalled()) {
      return { installed: false, authenticated: false };
    }

    const authStatus = await this.checkGhAuth();
    
    if (authStatus.authenticated) {
      const user = await this.getAuthenticatedUser();
      return { 
        installed: true, 
        authenticated: true, 
        username: user.username 
      };
    }
    
    return { installed: true, authenticated: false };
  }
}

module.exports = new TokenManager();
