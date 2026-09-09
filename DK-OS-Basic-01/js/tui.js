/**
 * TUI widget layer.
 *
 * Text-mode UI primitives: framed panels and a keyboard-driven menu, the kind
 * of thing htop or a BIOS setup screen is built from. Everything is real DOM
 * (so it stays selectable, clickable and accessible) styled to look like
 * box-drawing characters, rather than characters painted into a grid.
 *
 * Widgets know nothing about DK-OS screens; they raise callbacks and let the
 * caller decide what a selection means.
 */

/**
 * Builds a framed panel with a title sitting in the top border.
 * Returns the outer element plus the body callers fill in.
 */
export function panel({ title = "", className = "" } = {}) {
  const el = document.createElement("section");
  el.className = `tui-panel${className ? ` ${className}` : ""}`;

  if (title) {
    const heading = document.createElement("h2");
    heading.className = "tui-panel-title";
    heading.textContent = ` ${title} `;
    el.append(heading);
  }

  const body = document.createElement("div");
  body.className = "tui-panel-body";
  el.append(body);

  return { el, body };
}

/**
 * A vertical list where exactly one item is selected.
 *
 * Arrow keys / j / k move, Enter or Space activates, and clicking does both at
 * once. Selection wraps, which is what every text-mode menu does.
 *
 * The list is a real listbox: roving `aria-selected` plus a focusable container
 * means a screen reader announces the same thing the highlight shows.
 */
export class Menu {
  /**
   * @param {Object} options
   * @param {Array<{label: string, hint?: string, id: string}>} options.items
   * @param {(item: Object, index: number) => void} [options.onActivate]
   * @param {(item: Object, index: number) => void} [options.onSelect] - Fired on move.
   */
  constructor({ items = [], onActivate = () => {}, onSelect = () => {} } = {}) {
    this.items = items;
    this.onActivate = onActivate;
    this.onSelect = onSelect;
    this.index = 0;

    this.el = document.createElement("ul");
    this.el.className = "tui-menu";
    this.el.setAttribute("role", "listbox");
    this.el.tabIndex = 0;

    this.el.addEventListener("keydown", (event) => this._onKeyDown(event));
    // Focus lives on the list, not the rows, so the highlight is always the
    // single source of truth for "where am I".
    this.el.addEventListener("focus", () => this.render());
    this.el.addEventListener("blur", () => this.render());

    this._build();
    this.render();
  }

  _build() {
    this.el.innerHTML = "";
    this.rows = this.items.map((item, i) => {
      const row = document.createElement("li");
      row.className = "tui-menu-item";
      row.setAttribute("role", "option");
      row.dataset.index = String(i);

      // The pointer is drawn as content so the row reads correctly even with
      // stylesheets off, matching how a real TUI marks its cursor.
      const pointer = document.createElement("span");
      pointer.className = "tui-pointer";
      pointer.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "tui-label";
      label.textContent = item.label;

      row.append(pointer, label);

      if (item.hint) {
        const hint = document.createElement("span");
        hint.className = "tui-hint";
        hint.textContent = item.hint;
        row.append(hint);
      }

      row.addEventListener("mouseenter", () => this.select(i));
      row.addEventListener("click", () => {
        this.select(i);
        this.activate();
      });

      this.el.append(row);
      return row;
    });
  }

  /** Replaces the items and keeps the selection in range. */
  setItems(items) {
    this.items = items;
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
    this._build();
    this.render();
  }

  get selected() {
    return this.items[this.index] || null;
  }

  select(index) {
    if (!this.items.length) return;
    // Wrap in both directions: -1 lands on the last item, length lands on 0.
    const count = this.items.length;
    this.index = ((index % count) + count) % count;
    this.render();
    this.onSelect(this.selected, this.index);
  }

  move(delta) {
    this.select(this.index + delta);
  }

  activate() {
    if (this.selected) this.onActivate(this.selected, this.index);
  }

  focus() {
    this.el.focus();
  }

  render() {
    const active = document.activeElement === this.el;
    this.rows.forEach((row, i) => {
      const on = i === this.index;
      row.classList.toggle("is-selected", on);
      // Only the focused list shows a live cursor, so two menus on screen
      // cannot both look like they have the keyboard.
      row.classList.toggle("is-active", on && active);
      row.setAttribute("aria-selected", on ? "true" : "false");
      row.querySelector(".tui-pointer").textContent = on ? ">" : " ";
    });

    const current = this.rows[this.index];
    if (current) {
      this.el.setAttribute("aria-activedescendant", `tui-item-${this.index}`);
      current.id = `tui-item-${this.index}`;
      // Keep the highlight on screen in a scrolling panel.
      current.scrollIntoView({ block: "nearest" });
    }
  }

  _onKeyDown(event) {
    const { key } = event;

    switch (key) {
      case "ArrowUp":
      case "k":
        event.preventDefault();
        this.move(-1);
        return;
      case "ArrowDown":
      case "j":
        event.preventDefault();
        this.move(1);
        return;
      case "Home":
        event.preventDefault();
        this.select(0);
        return;
      case "End":
        event.preventDefault();
        this.select(this.items.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        this.activate();
        return;
      default:
        break;
    }

    // Number keys jump straight to an entry, the way boot menus allow.
    if (/^[1-9]$/.test(key)) {
      const target = Number(key) - 1;
      if (target < this.items.length) {
        event.preventDefault();
        this.select(target);
        this.activate();
      }
    }
  }
}

/**
 * The hint strip along the bottom of the screen listing active keys —
 * the row of shortcuts every full-screen text app puts there.
 */
export function keyBar(pairs) {
  const el = document.createElement("div");
  el.className = "tui-keybar";
  for (const [key, action] of pairs) {
    const item = document.createElement("span");
    item.className = "tui-keybar-item";

    const k = document.createElement("span");
    k.className = "tui-key";
    k.textContent = key;

    const a = document.createElement("span");
    a.className = "tui-action";
    a.textContent = action;

    item.append(k, a);
    el.append(item);
  }
  return el;
}
