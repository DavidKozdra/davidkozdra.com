(function initTabControllerLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTabControllerApi() {
  'use strict';

  class TabController {
    constructor(root, options = {}) {
      this.root = root;
      this.tabSelector = options.tabSelector || '[data-tab]';
      this.panelSelector = options.panelSelector || '[data-tab-panel]';
      this.activeClass = options.activeClass || 'active';
      this.hiddenClass = options.hiddenClass || 'hidden';
      this.panelForTab = options.panelForTab || (tab => this.root?.querySelector?.(`[data-tab-panel="${tab}"]`));
      this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
      this.activeTab = null;
    }
    tabs() { return Array.from(this.root?.querySelectorAll?.(this.tabSelector) || []); }
    panels() { return Array.from(this.root?.querySelectorAll?.(this.panelSelector) || []); }
    bind() { this.tabs().forEach(tab => tab.addEventListener('click', () => this.activate(tab.dataset.tab))); return this; }
    activate(tabId, { silent = false } = {}) {
      const tab = String(tabId || '');
      const button = this.tabs().find(candidate => candidate.dataset.tab === tab);
      const panel = this.panelForTab(tab);
      if (!button || !panel) return false;
      this.tabs().forEach(candidate => {
        const active = candidate === button;
        candidate.classList.toggle(this.activeClass, active);
        candidate.setAttribute?.('aria-selected', String(active));
      });
      this.panels().forEach(candidate => candidate.classList.toggle(this.hiddenClass, candidate !== panel));
      this.activeTab = tab;
      if (!silent) this.onChange?.(tab, button, panel);
      return true;
    }
  }
  function createTabController(root, options) { return new TabController(root, options); }
  return { TabController, createTabController };
});
