(function initSaveApiLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createSaveApiFactory() {
  class SaveAPI {
    constructor(options = {}) {
      this.driver = options.driver;
      if (!this.driver) throw new Error("SaveAPI requires a storage driver");
      this.serializer = options.serializer || JSON;
      this.key = String(options.key || "save_slot");
      this.sharePrefix = String(options.sharePrefix || "SAVE_V1:");
    }

    has() {
      return this.driver.has(this.key);
    }

    delete() {
      this.driver.remove(this.key);
    }

    readRaw() {
      return this.driver.get(this.key);
    }

    writeRaw(raw) {
      this.driver.set(this.key, String(raw));
    }

    save(payload) {
      const raw = this.serializer.stringify(payload);
      this.writeRaw(raw);
      return raw;
    }

    load() {
      const raw = this.readRaw();
      if (!raw) return null;
      return this.serializer.parse(raw);
    }

    exportShareToken(raw) {
      const text = String(raw || this.readRaw() || "");
      if (!text) return null;
      const encoded = btoa(unescape(encodeURIComponent(text)));
      return `${this.sharePrefix}${encoded}`;
    }

    importShareToken(input) {
      const text = String(input || "").trim();
      if (!text) throw new Error("empty");
      if (!text.startsWith(this.sharePrefix)) {
        this.writeRaw(text);
        return text;
      }
      const encoded = text.slice(this.sharePrefix.length).trim();
      const raw = decodeURIComponent(escape(atob(encoded)));
      this.writeRaw(raw);
      return raw;
    }
  }

  return { SaveAPI };
});
