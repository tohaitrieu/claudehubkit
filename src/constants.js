const path = require('path');
const os = require('os');

module.exports = {
  // Config file location
  CONFIG_DIR: path.join(os.homedir(), '.claudehubkit'),
  CONFIG_FILE: path.join(os.homedir(), '.claudehubkit', 'config.json'),
  
  // Commands repo
  COMMANDS_REPO: 'https://github.com/tohaitrieu/claudehubkit-commands.git',
  COMMANDS_DIR: '.claude/commands/chk',
  
  // CLI prefix for Claude Code
  COMMAND_PREFIX: 'chk',
};
