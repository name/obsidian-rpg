import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface RPGSettings {
  lastLoad: number;
  level: number;
  xp: number;
  xpPerSecond: number;
  xpPerFile: number;
  currentSessionDuration: number;
  displayStaringTimeAsHumanString: boolean;
}

const SETTINGS: RPGSettings = {
  lastLoad: Date.now(),
  level: 1,
  xp: 0,
  xpPerSecond: 1,
  xpPerFile: 50,
  currentSessionDuration: 0,
  displayStaringTimeAsHumanString: true
};

export default class RPG extends Plugin {
  settings: RPGSettings;
  statsStatusBar: HTMLElement;
  xpStatusBar: HTMLElement;
  levelStatusBar: HTMLElement;
  fileCount: number = 0;

  async onload() {
    await this.loadSettings();
    this.settings.lastLoad = Date.now();
    this.settings.currentSessionDuration = 0;
    this.statsStatusBar = this.addStatusBarItem();

    this.registerInterval(window.setInterval(() => {
        this.settings.currentSessionDuration += 1000;
        this.settings.xp += this.settings.xpPerSecond;
        this.updateStats();
        this.saveSettings();
    }, 1000));

    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on('create', () => {
        new Notice(`You gained ${this.settings.xpPerFile} XP for creating a file!`);
        this.updateStats();
      }));
    });

    this.registerInterval(window.setInterval(() => {
      this.saveSettings();
    }, 600000));

    this.addSettingTab(new RPGSettingsTab(this.app, this));
  }

  onunload() {
    this.saveSettings();
  }

  async loadSettings() {
    this.settings = Object.assign(SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  updateStats() {
    this.fileCount = this.app.vault.getFiles().length;
    const totalXP = this.settings.xp + (this.fileCount * this.settings.xpPerFile);
    const currentLevel = Math.floor(totalXP / 600) + 1;
    if (currentLevel > this.settings.level) {
      this.settings.level = currentLevel;
      new Notice(`You leveled up to level ${currentLevel}!`);
    }
    if (currentLevel < this.settings.level) {
      this.settings.level = currentLevel;
      new Notice(`You leveled down to level ${currentLevel}!`);
    }
    this.statsStatusBar.setText(`[${this.settings.level}] ${totalXP} XP gained`);
  }
}

class RPGSettingsTab extends PluginSettingTab {
  plugin: RPG;

  constructor(app: App, plugin: RPG) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h3', { text: 'RPG settings' });

    new Setting(containerEl)
      .setName('XP gained per second')
      .setDesc('Set the amount of XP gained for each second spent in the vault.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.xpPerSecond.toString())
          .onChange((value) => {
            this.plugin.settings.xpPerSecond = parseInt(value);
            this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('XP gained per file')
      .setDesc('Set the amount of XP gained for each file in the vault.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.xpPerFile.toString())
          .onChange((value) => {
            this.plugin.settings.xpPerFile = parseInt(value);
            this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName('Reset XP and level')
      .setDesc('WARNING: Enabling or Disabling this option will reset your XP and level to 0.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.displayStaringTimeAsHumanString)
          .onChange((value) => {
            this.plugin.settings.xp = 0;
            this.plugin.settings.level = 1;
            this.plugin.saveSettings();
          })
      );
  }
}
