import { GameStateManager, UIManager, createEventBus } from "./koz.js";
import { Terminal } from "./terminal.js";
import { FileSystem } from "./filesystem.js";
import { Shell } from "./shell.js";
import { createHome, APPS } from "./home.js";
import { panel, keyBar } from "./tui.js";

const state = new GameStateManager();
const fs = new FileSystem();

// The engine's UI layer, not a bare screen controller: UIManager wraps
// UIScreenController and adds the state binding and frame loop below.
const ui = new UIManager({ logger: console });

// One bus for cross-screen messages, so screens never reach into each other.
const bus = createEventBus();

/** Lines the boot screen types out, with the pause that follows each. */
const BOOT_SEQUENCE = [
  ["DK-OS BASIC 1.0.0", 260],
  ["", 60],
  ["Detecting hardware ............ ok", 180],
  ["Mounting /dev/futureon ........ ok", 180],
  ["Loading kernel modules ........ ok", 180],
  ["Starting desktop .............. ok", 220],
  ["", 120],
  ["Ready.", 400],
];

// Home is the hub: boot enters it, every app returns to it. Apps never
// transition into each other, which keeps "back" unambiguous everywhere.
// The "*" entry covers the initial transition (previous state is null, so no
// per-state rule can match) and doubles as a reboot-from-anywhere escape hatch.
const APP_STATES = APPS.map((app) => app.state);
state.setTransitionRules({
  "*": ["boot"],
  boot: ["home"],
  home: APP_STATES,
  ...Object.fromEntries(APP_STATES.map((name) => [name, ["home"]])),
});

/** Wraps a DOM element in the show/hide contract the screen controller expects. */
function element(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing screen element: #${id}`);
  return {
    show: () => el.removeAttribute("hidden"),
    hide: () => el.setAttribute("hidden", ""),
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const goHome = () => state.setState("home");

/* ---------------------------------------------------------------- boot ---- */

const bootLog = document.getElementById("boot-log");

/**
 * Types the boot log out one line at a time, then hands over to home.
 * `token` guards against a reboot fired mid-sequence: the run that owns the
 * screen is the one whose token still matches, so an interrupted run stops
 * writing instead of racing the new one.
 */
let bootToken = 0;
async function runBoot() {
  const token = ++bootToken;
  bootLog.textContent = "";

  for (const [line, delay] of BOOT_SEQUENCE) {
    if (token !== bootToken) return;
    bootLog.textContent += `${line}\n`;
    await sleep(delay);
  }

  if (token === bootToken) {
    bus.emit("system:ready", { at: Date.now() });
    goHome();
  }
}

ui.registerScreen("bootloader", {
  create: () => element("bootloader"),
  validStates: ["boot"],
});

/* ---------------------------------------------------------------- home ---- */

let home = null;

ui.registerScreen("home", {
  create: () => {
    // Launching goes through the bus so the menu never touches the state
    // machine directly; main.js stays the only place transitions are decided.
    home = createHome(document.getElementById("home"), (app) =>
      bus.emit("app:launch", { id: app.id, state: app.state }),
    );
    return element("home");
  },
  // Focus follows visibility so the menu is arrow-key ready without a click.
  show: () => home?.focus(),
  validStates: ["home"],
});

bus.on("app:launch", ({ state: next }) => state.setState(next));

/* -------------------------------------------------------------- the apps -- */

// Built on first use by the screen controller's lazy create(), which is also
// where listeners get bound — exactly once, no matter how often it is visited.
let term = null;

ui.registerScreen("terminal", {
  create: () => {
    term = new Terminal(document.getElementById("terminal"));
    const shell = new Shell({ term, fs, state, bus });

    term.write(fs.read("/etc/motd"), "accent");
    term.write("");
    term.write("Type `help` for commands, `exit` to return home.", "dim");
    term.write("");
    shell.updatePrompt();

    return element("terminal-app");
  },
  show: () => term?.focus(),
  validStates: ["shell"],
});

/** Placeholder apps share one screen; only the title and body copy differ. */
function stubScreen(id, stateName, title, body) {
  ui.registerScreen(id, {
    create: () => {
      const root = document.getElementById(id);
      root.classList.add("tui-screen");
      const pane = panel({ title });

      const text = document.createElement("pre");
      text.className = "tui-detail-body";
      text.textContent = body;
      pane.body.append(text);

      root.append(pane.el, keyBar([["Esc", "Back"], ["Q", "Back"]]));
      return element(id);
    },
    show: () => document.getElementById(id).focus(),
    validStates: [stateName],
  });
}

stubScreen("game-player", "game", "GAME 1", "Game is being played WOWWOWOWOWOW");
stubScreen("draw-app", "draw", "DRAW", "Sketchpad coming soon.");
stubScreen("pictures-app", "pictures", "PICTURES", "No pictures yet.");
stubScreen("settings-app", "settings", "SETTINGS", "Nothing configurable yet.");

/**
 * Esc / Q return to home from anywhere.
 *
 * Bound once on the document rather than per screen so a new app gets the
 * behaviour for free. The terminal is exempt: there, those keys are text, and
 * `exit` is the way out.
 */
document.addEventListener("keydown", (event) => {
  if (state.is("home") || state.is("boot") || state.is("shell")) return;
  if (event.key === "Escape" || event.key === "q" || event.key === "Q") {
    event.preventDefault();
    goHome();
  }
});

/**
 * Enters fullscreen if allowed.
 *
 * Browsers only honour requestFullscreen() during a user gesture, so this
 * cannot fire on page load alone. When the immediate attempt is rejected we
 * arm a one-shot listener and go fullscreen on the next click or keypress.
 * A reboot triggered from the menu is already inside a gesture, so that
 * path succeeds immediately.
 */
function enterFullscreen() {
  if (document.fullscreenElement) return;

  const request = () => document.documentElement.requestFullscreen();

  const armOnce = () => {
    const handler = () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("keydown", handler);
      request().catch(() => {});
    };
    document.addEventListener("pointerdown", handler, { once: true });
    document.addEventListener("keydown", handler, { once: true });
  };

  try {
    const p = request();
    if (p && typeof p.catch === "function") p.catch(armOnce);
  } catch {
    armOnce();
  }
}

state.addState("boot", {
  onEnter: () => {
    enterFullscreen();
    runBoot();
  },
});

state.addState("home", {});
state.addState("game", {
  onEnter: () => bus.emit("game:start"),
  onExit: () => bus.emit("game:end"),
});
state.addState("shell", {});
state.addState("draw", {});
state.addState("pictures", {});
state.addState("settings", {});

// R reboots from the home menu. Registered after the states exist so the
// transition it triggers is always legal.
document.addEventListener("keydown", (event) => {
  if (!state.is("home")) return;
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    state.setState("boot");
  }
});

/* -------------------------------------------------------------- chrome ---- */

const clock = document.getElementById("clock");
const screenName = document.getElementById("screen-name");

const TITLES = {
  boot: "BOOT",
  home: "HOME",
  game: "GAME 1",
  shell: "TERMINAL",
  draw: "DRAW",
  pictures: "PICTURES",
  settings: "SETTINGS",
};

// The status bar sits outside every screen, so it is registered as a screen
// that is valid in all of them. That puts its clock on the engine's frame loop
// instead of a private setInterval, and keeps every redraw in one place.
ui.registerScreen("status-bar", {
  create: () => {
    // Always visible: show/hide are no-ops so the bar never blinks out.
    const el = document.getElementById("status-bar");
    return { show: () => el.removeAttribute("hidden"), hide: () => {} };
  },
  update: () => {
    const now = new Date().toLocaleTimeString();
    // Guard the write: update() runs every frame, and the clock only changes
    // once a second.
    if (clock.textContent !== now) clock.textContent = now;
  },
  validStates: ["boot", "home", "game", "shell", "draw", "pictures", "settings"],
});

// Screens follow state. bindToStateManager subscribes to onChange and syncs
// the current state immediately, so no manual onChange plumbing is needed.
ui.bindToStateManager(state, { initialSync: false });

// The title tracks state alongside the screen swap the binding performs.
state.onChange((_from, to) => {
  screenName.textContent = TITLES[to] || to.toUpperCase();
});

// Drives update() on every visible screen; the status bar clock rides on this.
ui.startAutoUpdate();

state.setState("boot");

// Exposed for console poking during development.
window.DKOS = { state, ui, bus, fs, get term() { return term; } };
