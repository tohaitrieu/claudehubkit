# claudehubkit

**Claude + GitHub Kit** - CLI tool để quản lý GitHub issues với Claude Code.

## Features

- 🔐 Xác thực GitHub an toàn qua `gh` CLI (không lưu token)
- 📦 Tải slash commands cho Claude Code
- 🤖 Tự động fetch và solve issues
- ⚡ Workflow nhanh gọn từ terminal

## Installation

### Yêu cầu
- Node.js >= 16
- [GitHub CLI (gh)](https://cli.github.com/)

### Cài đặt GitHub CLI

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
winget install GitHub.cli
```

### Cài đặt claudehubkit

```bash
npm install -g claudehubkit
```

## Quick Start

```bash
# 1. Vào thư mục dự án
cd my-project

# 2. Khởi tạo
chk init

# 3. Sử dụng trong Claude Code
/chk:bug Login không hoạt động
/chk:feature Thêm dark mode
/chk:work
```

## Update

### Cập nhật CLI

```bash
npm update -g claudehubkit
```

### Cập nhật commands trong dự án

```bash
cd your-project
chk update
```

## Commands

### CLI Commands

```bash
chk init              # Khởi tạo trong dự án
chk update            # Cập nhật commands
chk status            # Kiểm tra trạng thái
chk list              # Liệt kê commands có sẵn
chk auth              # Kiểm tra GitHub auth
chk auth --login      # Đăng nhập GitHub
chk auth --logout     # Đăng xuất
chk help-commands     # Hướng dẫn sử dụng
```

### Claude Code Slash Commands

| Command | Mô tả |
|---------|-------|
| `/chk:bug [mô tả]` | Tạo bug issue |
| `/chk:feature [mô tả]` | Tạo feature request |
| `/chk:task [mô tả]` | Tạo task |
| `/chk:hotfix [mô tả]` | Tạo urgent issue |
| `/chk:new [mô tả]` | Smart - tự nhận diện loại |
| `/chk:list [filter]` | Liệt kê issues |
| `/chk:view [number]` | Xem chi tiết issue |
| `/chk:close [number]` | Đóng issue |
| `/chk:work [number]` | Fetch & solve issues |
| `/chk:next` | Suggest issue tiếp theo |
| `/chk:pr` | Quản lý pull requests |

## Workflow Example

```
> /chk:work

📋 Open issues (5):
#45 🚨 [urgent] API crash on production
#42 🐛 [bug] Login fails với email có dấu
#38 ✨ [feature] Dark mode

🎯 Đề xuất: #45 (urgent)
Work on this issue? (y/n)

> y

[Claude analyzes, implements fix, creates PR]

✅ PR #67 created!
```

## Configuration

Config lưu tại `~/.claudehubkit/config.json` (không chứa token):

```json
{
  "commands_repo": "https://github.com/...",
  "projects": {
    "/path/to/project": {
      "initialized": true
    }
  }
}
```

## Security

- ✅ Không lưu GitHub token - sử dụng `gh auth`
- ✅ Token được quản lý bởi GitHub CLI (system keychain)
- ✅ Config file không chứa thông tin nhạy cảm

## License

MIT
