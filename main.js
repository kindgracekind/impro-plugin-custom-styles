// node_modules/@impro.social/impro-plugin/main.js
var SimpleUUID = class {
  constructor() {
    this._id = 0;
  }
  create() {
    return this._id++;
  }
};
var uuid = new SimpleUUID();
var callHandlers = /* @__PURE__ */ new Map();
var pendingHostCalls = /* @__PURE__ */ new Map();
function hostCall(method, ...args) {
  const hostCallId = uuid.create();
  return new Promise((resolve, reject) => {
    pendingHostCalls.set(hostCallId, { resolve, reject });
    self.postMessage({ type: "hostCall", method, hostCallId, args });
  });
}
var eventListeners = /* @__PURE__ */ new Map();
function addEventListener(event, listener) {
  let listeners = eventListeners.get(event);
  if (!listeners) {
    listeners = /* @__PURE__ */ new Set();
    eventListeners.set(event, listeners);
    const handlerId = uuid.create();
    callHandlers.set(handlerId, async (...args) => {
      const menu = new Menu();
      for (const eventListener of listeners) {
        try {
          await eventListener(menu, ...args);
        } catch (error) {
          console.error(`"${event}" listener threw:`, error);
        }
      }
      return menu._serialize();
    });
    self.postMessage({
      type: "register",
      target: "eventListener",
      event,
      handlerId
    });
  }
  listeners.add(listener);
}
var MenuItem = class {
  constructor() {
    this.title = "";
    this.icon = null;
    this._callback = () => {
    };
  }
  setTitle(title) {
    this.title = title;
    return this;
  }
  setIcon(icon) {
    this.icon = icon;
    return this;
  }
  onClick(callback) {
    this._callback = callback;
    return this;
  }
};
var Menu = class {
  constructor() {
    this.items = [];
  }
  addItem(builder) {
    const item = new MenuItem();
    builder(item);
    this.items.push(item);
    return this;
  }
  _serialize() {
    return this.items.map((item) => {
      const handlerId = uuid.create();
      callHandlers.set(handlerId, item._callback);
      return { title: item.title, icon: item.icon, handlerId };
    });
  }
};
var App = class {
  constructor() {
    this.currentUser = null;
  }
  on(event, listener) {
    addEventListener(event, listener);
  }
  refreshFeedFilters(feedURI = null) {
    return hostCall("refreshFeedFilters", feedURI);
  }
};
var Notice = class {
  constructor(message, timeout = 0) {
    this._toastId = uuid.create();
    this._timeout = timeout;
    this._hidden = false;
    this.noticeEl = new VirtualEl("div");
    this.noticeEl.addClass("toast");
    this.noticeEl.setText(message);
    queueMicrotask(() => {
      if (this._hidden) return;
      hostCall("showToast", {
        toastId: this._toastId,
        element: this.noticeEl._serialize(),
        timeout: this._timeout
      });
    });
  }
  setMessage(message) {
    this.noticeEl.setText(message);
    return this;
  }
  hide() {
    if (this._hidden) return;
    this._hidden = true;
    hostCall("hideToast", { toastId: this._toastId });
  }
};
var StyleSnippet = class {
  constructor(cssText) {
    this._snippetId = uuid.create();
    this._removed = false;
    this.ready = new Promise((resolve, reject) => {
      queueMicrotask(() => {
        if (this._removed) return resolve();
        hostCall("applyStyleSnippet", {
          snippetId: this._snippetId,
          cssText
        }).then(resolve, reject);
      });
    });
  }
  remove() {
    if (this._removed) return;
    this._removed = true;
    hostCall("removeStyleSnippet", { snippetId: this._snippetId });
  }
};
var registered = false;
var Plugin = class {
  constructor() {
    this.app = new App();
  }
  addSidebarItem(icon, title, callback = () => {
  }) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, callback);
    self.postMessage({
      type: "register",
      target: "sidebarItem",
      icon,
      title,
      handlerId
    });
  }
  async loadData() {
    return hostCall("loadData");
  }
  async saveData(data) {
    await hostCall("saveData", { data });
  }
  addSettingTab(tab) {
    tab.plugin = this;
    const displayHandlerId = uuid.create();
    callHandlers.set(displayHandlerId, () => {
      tab.containerEl = new VirtualEl("div");
      tab.display();
      return tab.containerEl._serialize();
    });
    self.postMessage({
      type: "register",
      target: "settingTab",
      name: tab.name ?? null,
      displayHandlerId
    });
    this._settingTab = tab;
  }
  addFeedFilter(callback = () => {
  }) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, callback);
    self.postMessage({
      type: "register",
      target: "feedFilter",
      handlerId
    });
  }
  onload() {
  }
  onunload() {
  }
  static register() {
    if (registered) return;
    registered = true;
    const instance = new this();
    hostCall("getCurrentUser").then((user) => {
      instance.app.currentUser = user;
      return instance.onload();
    }).then(
      () => self.postMessage({ type: "ready" }),
      (error) => self.postMessage({
        type: "ready",
        error: error?.message ?? String(error)
      })
    );
  }
};
var openModals = /* @__PURE__ */ new Map();
var PluginSettingTab = class {
  constructor() {
    this.containerEl = new VirtualEl("div");
    this.name = null;
  }
  setName(name) {
    this.name = name;
    return this;
  }
  display() {
  }
  refresh() {
    return hostCall("refreshSettingTab");
  }
};
var VirtualEl = class _VirtualEl {
  constructor(tag) {
    this.tag = tag;
    this.attrs = {};
    this.text = null;
    this.children = [];
    this.events = {};
  }
  onClick(fn) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, fn);
    this.events.click = handlerId;
    return this;
  }
  onChange(fn) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, fn);
    this.events.change = handlerId;
    return this;
  }
  onInput(fn) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, fn);
    this.events.input = handlerId;
    return this;
  }
  setText(text) {
    this.text = text;
    this.children = [];
    return this;
  }
  empty() {
    this.text = null;
    this.children = [];
    return this;
  }
  addClass(cls) {
    this.attrs.class = this.attrs.class ? `${this.attrs.class} ${cls}` : cls;
    return this;
  }
  setAttr(name, value) {
    this.attrs[name] = value === void 0 ? "" : value;
    return this;
  }
  createEl(tag, options = {}, callback) {
    const child = new _VirtualEl(tag);
    if (options.text != null) child.text = options.text;
    if (options.cls) {
      child.attrs.class = Array.isArray(options.cls) ? options.cls.join(" ") : options.cls;
    }
    if (options.attr) Object.assign(child.attrs, options.attr);
    this.children.push(child);
    if (typeof callback === "function") callback(child);
    return child;
  }
  createDiv(options = {}, callback) {
    return this.createEl("div", options, callback);
  }
  createSpan(options = {}, callback) {
    return this.createEl("span", options, callback);
  }
  _serialize() {
    return {
      tag: this.tag,
      attrs: this.attrs,
      text: this.text,
      children: this.children.map((child) => child._serialize()),
      events: this.events
    };
  }
};
self.onmessage = async (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;
  if (message.type === "call") {
    const fn = callHandlers.get(message.handlerId);
    if (!fn) {
      self.postMessage({
        type: "result",
        callId: message.callId,
        error: `unknown handler ${message.handlerId}`
      });
      return;
    }
    try {
      const value = await fn(...message.args);
      self.postMessage({ type: "result", callId: message.callId, value });
    } catch (error) {
      self.postMessage({
        type: "result",
        callId: message.callId,
        error: error.message ?? String(error)
      });
    }
    return;
  }
  if (message.type === "hostResult") {
    const pending = pendingHostCalls.get(message.hostCallId);
    if (!pending) return;
    pendingHostCalls.delete(message.hostCallId);
    if (message.error) pending.reject(new Error(message.error));
    else pending.resolve(message.value);
    return;
  }
  if (message.type === "event") {
    switch (message.event) {
      case "modalDismissed": {
        const modal = openModals.get(message.data.modalId);
        if (modal) {
          openModals.delete(message.data.modalId);
          modal.onClose();
        }
        return;
      }
    }
    return;
  }
};

// src/main.js
var DEFAULT_SETTINGS = {
  draft: "",
  applied: ""
};
var CustomStylesSettingTab = class extends PluginSettingTab {
  constructor() {
    super();
    this.setName("Custom styles");
  }
  display() {
    this.containerEl.createEl("p", {
      cls: "plugin-setting-item-desc",
      text: "Paste custom CSS below."
    });
    const textarea = this.containerEl.createEl("textarea", {
      cls: "custom-styles-textarea",
      attr: { placeholder: ".my-class { color: red; }" }
    });
    textarea.setText(this.plugin.settings.draft ?? "");
    textarea.onInput((event) => {
      this.plugin.settings.draft = event.target.value;
    });
    const buttons = this.containerEl.createDiv({
      cls: "custom-styles-buttons"
    });
    const busy = this.plugin.applying || this.plugin.clearing;
    const applyButton = buttons.createEl("button", {
      cls: "plugin-setting-button primary-button"
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
        const notice2 = new Notice(
          `Failed to apply styles: ${error.message ?? error}`,
          4e3
        );
        notice2.noticeEl.addClass("error");
        return;
      } finally {
        this.plugin.applying = false;
        this.refresh();
      }
      const notice = new Notice(
        css.trim() ? "Styles applied" : "Styles cleared",
        2e3
      );
      notice.noticeEl.addClass("success");
    });
    const clearButton = buttons.createEl("button", {
      cls: "plugin-setting-button"
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
      new Notice("Styles cleared", 2e3);
    });
  }
};
var CustomStylesPlugin = class extends Plugin {
  async onload() {
    const saved = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...saved ?? {} };
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
};
CustomStylesPlugin.register();
