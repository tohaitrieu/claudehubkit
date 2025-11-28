const chalk = require('chalk');
const inquirer = require('inquirer');
const open = require('open');
const ora = require('ora');
const config = require('./config');
const { GITHUB_TOKEN_URL, GITHUB_TOKEN_SCOPES } = require('./constants');

class TokenManager {
  async validateToken(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { valid: true, user };
      }

      if (response.status === 401) {
        return { valid: false, error: 'Token không hợp lệ hoặc đã hết hạn' };
      }

      return { valid: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async ensureToken() {
    const existingToken = config.getToken();

    if (existingToken) {
      const spinner = ora('Kiểm tra GitHub token...').start();
      const result = await this.validateToken(existingToken);

      if (result.valid) {
        spinner.succeed(`Đã xác thực: ${chalk.green(result.user.login)}`);
        return existingToken;
      }

      spinner.fail(result.error);
      console.log(chalk.yellow('\n⚠️  Token đã hết hạn hoặc không hợp lệ. Cần tạo token mới.\n'));
      config.clearToken();
    }

    return await this.requestNewToken();
  }

  async requestNewToken() {
    console.log(chalk.cyan('\n📋 Hướng dẫn tạo GitHub Personal Access Token:\n'));
    console.log('1. Mở trang GitHub Settings > Developer Settings > Personal Access Tokens');
    console.log('2. Click "Generate new token (classic)"');
    console.log(`3. Chọn scopes: ${chalk.yellow(GITHUB_TOKEN_SCOPES)}`);
    console.log('4. Copy token và paste vào đây\n');

    const tokenUrl = `${GITHUB_TOKEN_URL}?scopes=${GITHUB_TOKEN_SCOPES}&description=gckit-cli`;

    const { shouldOpen } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldOpen',
        message: 'Mở trang tạo token trong browser?',
        default: true,
      },
    ]);

    if (shouldOpen) {
      console.log(chalk.dim(`\nĐang mở: ${tokenUrl}\n`));
      await open(tokenUrl);
    } else {
      console.log(chalk.dim(`\nURL: ${tokenUrl}\n`));
    }

    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Paste GitHub token:',
        mask: '*',
        validate: (input) => {
          if (!input || input.length < 10) {
            return 'Token không hợp lệ';
          }
          return true;
        },
      },
    ]);

    const spinner = ora('Xác thực token...').start();
    const result = await this.validateToken(token);

    if (result.valid) {
      config.setToken(token);
      spinner.succeed(`Xác thực thành công! Xin chào ${chalk.green(result.user.login)}`);
      return token;
    }

    spinner.fail(result.error);
    console.log(chalk.red('\n❌ Token không hợp lệ. Vui lòng thử lại.\n'));

    // Retry
    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Thử lại?',
        default: true,
      },
    ]);

    if (retry) {
      return await this.requestNewToken();
    }

    process.exit(1);
  }
}

module.exports = new TokenManager();
