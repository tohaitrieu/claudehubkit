const fs = require('fs');
const path = require('path');
const { CONFIG_DIR, CONFIG_FILE } = require('./constants');

class ConfigManager {
  constructor() {
    this.ensureConfigDir();
  }

  ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
  }

  load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      // Config corrupted, return empty
    }
    return {};
  }

  save(config) {
    this.ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  }

  get(key) {
    const config = this.load();
    return config[key];
  }

  set(key, value) {
    const config = this.load();
    config[key] = value;
    this.save(config);
  }

  // Project specific config
  getProjectConfig(projectPath) {
    const projects = this.get('projects') || {};
    return projects[projectPath] || {};
  }

  setProjectConfig(projectPath, projectConfig) {
    const projects = this.get('projects') || {};
    projects[projectPath] = {
      ...projects[projectPath],
      ...projectConfig,
      updated_at: new Date().toISOString(),
    };
    this.set('projects', projects);
  }

  // Commands repo
  getCommandsRepo() {
    return this.get('commands_repo');
  }

  setCommandsRepo(repo) {
    this.set('commands_repo', repo);
  }
}

module.exports = new ConfigManager();
