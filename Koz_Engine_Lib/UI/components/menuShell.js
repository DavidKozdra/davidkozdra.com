(function initMenuShellLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMenuShellApi() {
  'use strict';
  class MenuShell {
    constructor({ root, hiddenClass = 'hidden', onOpen = null, onClose = null } = {}) {
      this.root = root || null; this.hiddenClass = hiddenClass; this.onOpen = onOpen; this.onClose = onClose; this.opened = false;
    }
    open(context) { if (!this.root) return false; this.root.classList.remove(this.hiddenClass); this.root.setAttribute?.('aria-hidden', 'false'); this.opened = true; this.onOpen?.(context); return true; }
    close(context) { if (!this.root) return false; this.root.classList.add(this.hiddenClass); this.root.setAttribute?.('aria-hidden', 'true'); this.opened = false; this.onClose?.(context); return true; }
    toggle(context) { return this.opened ? this.close(context) : this.open(context); }
  }
  return { MenuShell };
});
