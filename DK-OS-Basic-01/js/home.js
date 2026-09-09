/**
 * The DK-OS home screen: a text-mode launcher.
 *
 * Two panels side by side — the app menu on the left, a details pane on the
 * right that follows the selection — over a key hint bar. This is the screen
 * the machine boots into; every app is reachable from here.
 */

import { panel, Menu, keyBar } from "./tui.js";

/** The installed apps. `state` is the engine state each one launches into. */
export const APPS = [
  {
    id: "game",
    label: "Game 1",
    hint: "[1]",
    state: "game",
    description: [
      "A game. It is being played.",
      "",
      "Launches into the game screen. Press Q or Esc in-game",
      "to come back here.",
    ],
  },
  {
    id: "draw",
    label: "Draw",
    hint: "[2]",
    state: "draw",
    description: [
      "ASCII sketchpad.",
      "",
      "Move the cursor with the arrow keys and press Space to",
      "lay down a character.",
    ],
  },
  {
    id: "pictures",
    label: "Pictures",
    hint: "[3]",
    state: "pictures",
    description: ["Image gallery.", "", "Browse the pictures stored on this machine."],
  },
  {
    id: "terminal",
    label: "Terminal",
    hint: "[4]",
    state: "shell",
    description: [
      "Command shell.",
      "",
      "A full text terminal with a virtual filesystem.",
      "Type `help` once inside for the command list.",
    ],
  },
  {
    id: "settings",
    label: "Settings",
    hint: "[5]",
    state: "settings",
    description: ["System settings.", "", "Display, sound and system preferences."],
  },
];

/**
 * Builds the home screen into `root`.
 *
 * @param {HTMLElement} root - Mount point.
 * @param {(app: Object) => void} onLaunch - Called when an entry is activated.
 * @returns {{focus: () => void}} Handle so the screen can take focus on show.
 */
export function createHome(root, onLaunch) {
  root.innerHTML = "";
  root.classList.add("tui-screen");

  const columns = document.createElement("div");
  columns.className = "tui-columns";

  const apps = panel({ title: "APPLICATIONS", className: "tui-panel-menu" });
  const details = panel({ title: "DETAILS", className: "tui-panel-details" });

  // Details are rebuilt on every move rather than diffed: the pane is a few
  // lines of text, so replacing it is simpler and cheaper than patching it.
  function renderDetails(app) {
    details.body.innerHTML = "";
    if (!app) return;

    const name = document.createElement("div");
    name.className = "tui-detail-name";
    name.textContent = app.label;

    const body = document.createElement("pre");
    body.className = "tui-detail-body";
    body.textContent = app.description.join("\n");

    details.body.append(name, body);
  }

  const menu = new Menu({
    items: APPS,
    onSelect: (app) => renderDetails(app),
    onActivate: (app) => onLaunch(app),
  });

  apps.body.append(menu.el);
  renderDetails(menu.selected);

  columns.append(apps.el, details.el);

  root.append(
    columns,
    keyBar([
      ["↑↓", "Move"],
      ["Enter", "Launch"],
      ["1-5", "Jump"],
      ["R", "Reboot"],
    ]),
  );

  return { focus: () => menu.focus() };
}
