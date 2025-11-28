# claudehubkit

**Claude + GitHub Kit** - CLI tool để quản lý GitHub issues với Claude Code.

## Features

- 🔐 Quản lý GitHub Personal Access Token (tự động mở browser để tạo)
- 📦 Tải slash commands cho Claude Code
- 🤖 Tự động fetch và solve issues
- ⚡ Workflow nhanh gọn từ terminal

## Installation

```bash
# Cài đặt global
npm install -g claudehubkit

# Hoặc dùng npx
npx claudehubkit init
```

## Quick Start

```bash
# 1. Vào thư mục dự án
cd my-project

# 2. Khởi tạo claudehubkit
claudehubkit init
# hoặc shortcut
chk init

# 3. Mở Claude Code và sử dụng commands
# /chk:bug, /chk:feature, /chk:work, ...
```

## Commands

### CLI Commands

```bash
claudehubkit init              # Khởi tạo trong dự án
claudehubkit update            # Cập nhật commands từ repo
claudehubkit list              # Liệt kê commands có sẵn
claudehubkit status            # Kiểm tra trạng thái
claudehubkit token --set       # Đặt GitHub token mới
claudehubkit token --check     # Kiểm tra token
claudehubkit token --clear     # Xóa token
claudehubkit help-commands     # Hướng dẫn sử dụng trong Claude Code

# Shortcut: dùng `chk` thay vì `claudehubkit`
chk init
chk status
```

### Claude Code Slash Commands

Sau khi `claudehubkit init`, bạn có thể dùng các commands sau trong Claude Code:

| Command | Mô tả |
|---------|-------|
| `/chk:bug [mô tả]` | Tạo bug issue |
| `/chk:feature [mô tả]` | Tạo feature request |
| `/chk:task [mô tả]` | Tạo task |
| `/chk:hotfix [mô tả]` | Tạo urgent issue |
| `/chk:new [mô tả]` | Tự động nhận diện loại issue |
| `/chk:list` | Liệt kê issues |
| `/chk:close [number]` | Đóng issue |
| `/chk:work` | Fetch & solve issues |
| `/chk:work [number]` | Solve issue cụ thể |
| `/chk:next` | Suggest issue tiếp theo |

## Workflow Example

```
> /chk:work

📋 Open issues (5):
#45 🚨 [urgent] API crash on production
#42 🐛 [bug] Login fails với email có dấu
#38 ✨ [feature] Dark mode
...

🎯 Đề xuất: #45 (urgent)
Solve issue này? (y/số khác/n)

> y

📖 Issue #45: API crash on production
[đọc body, comments...]

🔍 Tìm files liên quan...
- src/api/users.ts

📝 Phân tích: Lỗi null check ở line 42...

Tôi sẽ fix file này. OK? (y/n)

> y

[Claude fix, test, commit, tạo PR]

✅ PR #67 created!
```

## Configuration

Config được lưu tại `~/.claudehubkit/config.json`:

```json
{
  "github_token": "ghp_xxx...",
  "token_saved_at": "2024-01-01T00:00:00.000Z",
  "commands_repo": "https://github.com/user/claudehubkit-commands.git",
  "projects": {
    "/path/to/project": {
      "initialized": true,
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Custom Commands Repo

Bạn có thể host commands riêng:

```bash
# Tạo repo với cấu trúc:
# my-commands/
#   bug.md
#   feature.md
#   ...

# Khi init, nhập URL repo của bạn
claudehubkit init
# Commands repo URL: https://github.com/yourname/my-commands.git
```

## Requirements

- Node.js >= 16
- [GitHub CLI (gh)](https://cli.github.com/) - để tương tác với GitHub
- Claude Code

## License

MIT
