/**
 * Terminal emulator core.
 *
 * Owns the screen buffer and the keyboard, and knows nothing about which
 * commands exist: callers hand it a `onSubmit(line)` handler and it hands back
 * a `write()` for output. That split keeps the shell (js/shell.js) free of DOM
 * work and lets other screens borrow the terminal for their own input loop.
 *
 * Output is a list of lines rather than an ever-growing innerHTML string so a
 * long-running session cannot blow up memory: MAX_LINES caps the scrollback and
 * old lines are dropped from the front.
 */

const MAX_LINES = 500;
const MAX_HISTORY = 100;

/** Characters that must not reach the DOM as markup. */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export class Terminal {
  /**
   * @param {HTMLElement} root - Container the terminal renders into.
   * @param {Object} [options]
   * @param {string} [options.prompt] - Text drawn before the input caret.
   */
  constructor(root, { prompt = "dkos> " } = {}) {
    this.root = root;
    this.prompt = prompt;
    this.lines = [];
    this.input = "";
    this.cursor = 0;
    this.history = [];
    this.historyIndex = null;
    this.draft = "";
    this.locked = false;
    this.onSubmit = () => {};
    this.onInterrupt = null;
    this.completer = null;

    root.classList.add("terminal");
    root.innerHTML =
      '<div class="term-output" aria-live="polite"></div>' +
      '<div class="term-line term-input-line"></div>';
    this.outputEl = root.querySelector(".term-output");
    this.inputEl = root.querySelector(".term-input-line");

    // Clicking anywhere in the terminal should focus it, the way a real
    // terminal window behaves. The root carries tabindex so it can hold focus
    // without an <input>, which would bring its own caret and mobile quirks.
    root.tabIndex = 0;
    root.addEventListener("mousedown", (event) => {
      // Let text selection through; only steal focus on a plain click.
      if (window.getSelection()?.toString()) return;
      event.preventDefault();
      root.focus();
    });
    root.addEventListener("keydown", (event) => this._onKeyDown(event));

    this.renderInput();
  }

  /** Appends one or more lines of output. `cls` styles them (e.g. "err"). */
  write(text = "", cls = "") {
    for (const raw of String(text).split("\n")) {
      this.lines.push({ text: raw, cls });
    }
    if (this.lines.length > MAX_LINES) {
      this.lines.splice(0, this.lines.length - MAX_LINES);
    }
    this.renderOutput();
  }

  /** Convenience wrapper for error-coloured output. */
  writeError(text) {
    this.write(text, "err");
  }

  /** Clears the scrollback. */
  clear() {
    this.lines = [];
    this.renderOutput();
  }

  /**
   * Blocks keyboard input while an async command runs, so a slow command
   * cannot interleave with the next one the user types.
   */
  setLocked(locked) {
    this.locked = locked;
    this.inputEl.hidden = locked;
    if (!locked) this.renderInput();
  }

  focus() {
    this.root.focus();
  }

  renderOutput() {
    this.outputEl.innerHTML = this.lines
      .map((line) => `<div class="term-line${line.cls ? ` ${line.cls}` : ""}">${escapeHtml(line.text) || "&nbsp;"}</div>`)
      .join("");
    this.scrollToBottom();
  }

  /**
   * Draws the prompt with the cursor sitting *on* a character rather than
   * between two, which is what block-cursor terminals do. The character under
   * the cursor is wrapped so CSS can invert it; at end-of-line it is a space.
   */
  renderInput() {
    const before = escapeHtml(this.input.slice(0, this.cursor));
    const at = escapeHtml(this.input.charAt(this.cursor) || " ") || "&nbsp;";
    const after = escapeHtml(this.input.slice(this.cursor + 1));
    this.inputEl.innerHTML =
      `<span class="term-prompt">${escapeHtml(this.prompt)}</span>` +
      `${before}<span class="term-cursor">${at}</span>${after}`;
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.root.scrollTop = this.root.scrollHeight;
  }

  /** Echoes the prompt + submitted text into the scrollback, as a shell does. */
  echoInput(text) {
    this.write(`${this.prompt}${text}`, "echo");
  }

  _onKeyDown(event) {
    if (this.locked) {
      // Ctrl+C stays live while locked so a runaway command can be stopped.
      if (event.key === "c" && event.ctrlKey && this.onInterrupt) {
        event.preventDefault();
        this.onInterrupt();
      }
      return;
    }

    const { key, ctrlKey, metaKey, altKey } = event;

    // Leave browser shortcuts (copy, paste, reload, devtools) alone, but claim
    // the handful of control chords a terminal is expected to own.
    if (metaKey || (ctrlKey && !["c", "l", "u", "a", "e", "k", "w"].includes(key))) return;
    if (altKey) return;

    if (ctrlKey) {
      event.preventDefault();
      this._handleControl(key);
      return;
    }

    switch (key) {
      case "Enter":
        event.preventDefault();
        this._submit();
        return;
      case "Backspace":
        event.preventDefault();
        if (this.cursor > 0) {
          this.input = this.input.slice(0, this.cursor - 1) + this.input.slice(this.cursor);
          this.cursor -= 1;
          this.renderInput();
        }
        return;
      case "Delete":
        event.preventDefault();
        if (this.cursor < this.input.length) {
          this.input = this.input.slice(0, this.cursor) + this.input.slice(this.cursor + 1);
          this.renderInput();
        }
        return;
      case "ArrowLeft":
        event.preventDefault();
        if (this.cursor > 0) { this.cursor -= 1; this.renderInput(); }
        return;
      case "ArrowRight":
        event.preventDefault();
        if (this.cursor < this.input.length) { this.cursor += 1; this.renderInput(); }
        return;
      case "ArrowUp":
        event.preventDefault();
        this._recallHistory(-1);
        return;
      case "ArrowDown":
        event.preventDefault();
        this._recallHistory(1);
        return;
      case "Home":
        event.preventDefault();
        this.cursor = 0;
        this.renderInput();
        return;
      case "End":
        event.preventDefault();
        this.cursor = this.input.length;
        this.renderInput();
        return;
      case "Tab":
        event.preventDefault();
        this._complete();
        return;
      default:
        break;
    }

    // Everything else: printable characters only. Named keys ("Shift",
    // "F5", ...) are longer than one code point, which filters them out.
    if (key.length === 1) {
      event.preventDefault();
      this.setInput(
        this.input.slice(0, this.cursor) + key + this.input.slice(this.cursor),
        this.cursor + 1,
      );
    }
  }

  _handleControl(key) {
    switch (key) {
      case "c":
        // Abandon the current line, exactly like a real ^C.
        this.echoInput(`${this.input}^C`);
        this.setInput("");
        if (this.onInterrupt) this.onInterrupt();
        return;
      case "l":
        this.clear();
        return;
      case "u":
        this.setInput(this.input.slice(this.cursor), 0);
        return;
      case "k":
        this.setInput(this.input.slice(0, this.cursor), this.cursor);
        return;
      case "a":
        this.cursor = 0;
        this.renderInput();
        return;
      case "e":
        this.cursor = this.input.length;
        this.renderInput();
        return;
      case "w": {
        // Delete the word behind the cursor, plus any spaces leading up to it.
        const head = this.input.slice(0, this.cursor).replace(/\S+\s*$/, "");
        this.setInput(head + this.input.slice(this.cursor), head.length);
        return;
      }
      default:
        return;
    }
  }

  /** Replaces the current line; cursor defaults to the end. */
  setInput(text, cursor = null) {
    this.input = text;
    this.cursor = cursor === null ? text.length : Math.max(0, Math.min(cursor, text.length));
    this.renderInput();
  }

  _submit() {
    const line = this.input;
    this.echoInput(line);
    this.setInput("");
    this.historyIndex = null;
    this.draft = "";

    const trimmed = line.trim();
    // Blank lines just move the prompt down, and repeating the previous command
    // in history is noise, so neither is recorded.
    if (trimmed && this.history[this.history.length - 1] !== trimmed) {
      this.history.push(trimmed);
      if (this.history.length > MAX_HISTORY) this.history.shift();
    }

    this.onSubmit(trimmed);
  }

  /**
   * Walks history. The in-progress line is stashed as `draft` on the way up so
   * arrowing back down past the newest entry restores what was being typed.
   */
  _recallHistory(direction) {
    if (!this.history.length) return;

    if (this.historyIndex === null) {
      if (direction > 0) return;
      this.draft = this.input;
      this.historyIndex = this.history.length - 1;
    } else {
      const next = this.historyIndex + direction;
      if (next < 0) return;
      if (next >= this.history.length) {
        this.historyIndex = null;
        this.setInput(this.draft);
        return;
      }
      this.historyIndex = next;
    }

    this.setInput(this.history[this.historyIndex]);
  }

  /**
   * Tab completion. The completer returns candidates for the word under the
   * cursor; a single match is inserted, several are listed the way bash does.
   */
  _complete() {
    if (!this.completer) return;

    const head = this.input.slice(0, this.cursor);
    const word = head.match(/\S*$/)[0];
    const matches = this.completer(word, head) || [];
    if (!matches.length) return;

    if (matches.length === 1) {
      const start = head.length - word.length;
      const completed = `${this.input.slice(0, start)}${matches[0]} ${this.input.slice(this.cursor)}`;
      this.setInput(completed, start + matches[0].length + 1);
      return;
    }

    // Extend as far as every candidate agrees, then show the alternatives.
    const prefix = commonPrefix(matches);
    if (prefix.length > word.length) {
      const start = head.length - word.length;
      this.setInput(
        `${this.input.slice(0, start)}${prefix}${this.input.slice(this.cursor)}`,
        start + prefix.length,
      );
    }
    this.echoInput(this.input);
    this.write(matches.join("  "));
  }
}

/** Longest string that starts every candidate. */
function commonPrefix(items) {
  if (!items.length) return "";
  let prefix = items[0];
  for (const item of items.slice(1)) {
    while (prefix && !item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}
