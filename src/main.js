import {
  Notice,
  Plugin,
  PluginSettingTab,
  StyleSnippet,
} from "./pluginWorker.js";

const DEFAULT_SETTINGS = {
  draft: "",
  applied: "",
};

class CustomStylesSettingTab extends PluginSettingTab {
  constructor() {
    super();
    this.setName("Custom styles");
  }

  display() {
    this.containerEl.createEl("p", {
      cls: "plugin-setting-item-desc",
      text: "Paste custom CSS below.",
    });

    const textarea = this.containerEl.createEl("textarea", {
      cls: "custom-styles-textarea",
      attr: { placeholder: ".my-class { color: red; }" },
    });
    textarea.setText(this.plugin.settings.draft ?? "");
    textarea.onInput((event) => {
      this.plugin.settings.draft = event.target.value;
    });

    const buttons = this.containerEl.createDiv({
      cls: "custom-styles-buttons",
    });

    const busy = this.plugin.applying || this.plugin.clearing;

    const applyButton = buttons.createEl("button", {
      cls: "plugin-setting-button primary-button",
    });
    if (this.plugin.applying) {
      applyButton.setText("Applying");
      applyButton.createEl("div", { cls: "loading-spinner" });
    } else {
      applyButton.setText("Apply");
    }
    if (busy) applyButton.setAttr("disabled");
    applyButton.onClick(async () => {
      if (this.plugin.applying || this.plugin.clearing) return;
      const css = this.plugin.settings.draft ?? "";
      this.plugin.applying = true;
      this.refresh();
      try {
        await this.plugin.applyStyles(css);
        await this.plugin.saveData(this.plugin.settings);
      } catch (error) {
        const notice = new Notice(
          `Failed to apply styles: ${error.message ?? error}`,
          4000,
        );
        notice.noticeEl.addClass("error");
        return;
      } finally {
        this.plugin.applying = false;
        this.refresh();
      }
      const notice = new Notice(
        css.trim() ? "Styles applied" : "Styles cleared",
        2000,
      );
      notice.noticeEl.addClass("success");
    });

    const clearButton = buttons.createEl("button", {
      cls: "plugin-setting-button",
    });
    if (this.plugin.clearing) {
      clearButton.setText("Clearing");
      clearButton.createEl("div", { cls: "loading-spinner" });
    } else {
      clearButton.setText("Clear");
    }
    if (busy) clearButton.setAttr("disabled");
    clearButton.onClick(async () => {
      if (this.plugin.applying || this.plugin.clearing) return;
      this.plugin.clearing = true;
      this.refresh();
      try {
        this.plugin.clearStyles();
        this.plugin.settings.draft = "";
        await this.plugin.saveData(this.plugin.settings);
      } finally {
        this.plugin.clearing = false;
        this.refresh();
      }
      new Notice("Styles cleared", 2000);
    });
  }
}

class CustomStylesPlugin extends Plugin {
  async onload() {
    const saved = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
    this._snippet = null;
    this.applying = false;
    this.clearing = false;

    this.addSettingTab(new CustomStylesSettingTab());

    if (this.settings.applied) {
      this._snippet = new StyleSnippet(this.settings.applied);
    }
  }

  async applyStyles(cssText) {
    if (this._snippet) {
      this._snippet.remove();
      this._snippet = null;
    }
    if (cssText.trim()) {
      const snippet = new StyleSnippet(cssText);
      try {
        await snippet.ready;
      } catch (error) {
        snippet.remove();
        throw error;
      }
      this._snippet = snippet;
    }
    this.settings.applied = cssText;
  }

  clearStyles() {
    if (this._snippet) {
      this._snippet.remove();
      this._snippet = null;
    }
    this.settings.applied = "";
  }
}

CustomStylesPlugin.register();
