/**
 * In-memory virtual filesystem.
 *
 * Nodes are plain objects so the whole tree serialises to JSON for free:
 *   directory -> { type: "dir", children: { name: node } }
 *   file      -> { type: "file", content: "..." }
 *
 * Paths follow POSIX conventions ("/", ".", "..", "~"), which is what makes the
 * shell commands feel like the real thing.
 */

const HOME = "/home/dk";

function dir(children = {}) {
  return { type: "dir", children };
}

function file(content = "") {
  return { type: "file", content };
}

/** The disk image DK-OS boots with. */
function initialTree() {
  return dir({
    home: dir({
      dk: dir({
        "readme.txt": file(
          [
            "DK-OS BASIC v1.0",
            "",
            "This is a text-mode workstation. Everything happens at the prompt.",
            "Type `help` for the command list, or `ls` to look around.",
            "",
            "Tab completes commands and paths. Arrow keys walk your history.",
          ].join("\n"),
        ),
        "notes.txt": file(
          [
            "- the boot sequence is cosmetic, but it is load-bearing for vibes",
            "- ctrl+l clears the screen",
            "- `sysinfo` prints the machine spec",
          ].join("\n"),
        ),
        projects: dir({
          "futureon.md": file(
            [
              "# Project Futureon",
              "",
              "Status: in progress",
              "A terminal-first operating system that never needed a mouse.",
            ].join("\n"),
          ),
        }),
      }),
    }),
    etc: dir({
      "motd": file("Welcome to DK-OS. Be excellent to each other."),
      "version": file("DK-OS BASIC 1.0.0"),
    }),
    var: dir({
      log: dir({
        "boot.log": file(
          [
            "[0.000] kernel: DK-OS BASIC 1.0.0 booting",
            "[0.412] memory: 640K conventional, and that ought to be enough",
            "[0.884] display: text mode 80x25",
            "[1.203] input: keyboard attached",
            "[1.997] init: entering shell",
          ].join("\n"),
        ),
      }),
    }),
  });
}

export class FileSystem {
  constructor() {
    this.root = initialTree();
    this.cwd = HOME;
  }

  get home() {
    return HOME;
  }

  /**
   * Turns any user-supplied path into an absolute, normalised one.
   * Relative paths resolve against the current directory.
   */
  resolve(path) {
    if (!path || path === ".") return this.cwd;

    let start = path;
    if (start === "~") start = HOME;
    else if (start.startsWith("~/")) start = HOME + start.slice(1);

    const absolute = start.startsWith("/") ? start : `${this.cwd}/${start}`;

    const parts = [];
    for (const part of absolute.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return `/${parts.join("/")}`;
  }

  /** Returns the node at `path`, or null when nothing lives there. */
  lookup(path) {
    const abs = this.resolve(path);
    if (abs === "/") return this.root;

    let node = this.root;
    for (const part of abs.split("/").filter(Boolean)) {
      if (node.type !== "dir") return null;
      node = node.children[part];
      if (!node) return null;
    }
    return node;
  }

  /** Splits an absolute path into its parent node and final name. */
  parentOf(path) {
    const abs = this.resolve(path);
    const parts = abs.split("/").filter(Boolean);
    const name = parts.pop();
    const parent = this.lookup(`/${parts.join("/")}`);
    return { parent, name, abs };
  }

  isDir(path) {
    return this.lookup(path)?.type === "dir";
  }

  /** Directory entry names, alphabetical, directories marked with a "/". */
  list(path = ".") {
    const node = this.lookup(path);
    if (!node) return null;
    if (node.type === "file") return [basename(this.resolve(path))];
    return Object.keys(node.children)
      .sort()
      .map((name) => (node.children[name].type === "dir" ? `${name}/` : name));
  }

  read(path) {
    const node = this.lookup(path);
    if (!node || node.type !== "file") return null;
    return node.content;
  }

  /** Creates or overwrites a file. Returns an error string, or null on success. */
  write(path, content) {
    const { parent, name } = this.parentOf(path);
    if (!parent || parent.type !== "dir") return "no such directory";
    const existing = parent.children[name];
    if (existing && existing.type === "dir") return `${name}: is a directory`;
    parent.children[name] = file(content);
    return null;
  }

  mkdir(path) {
    const { parent, name } = this.parentOf(path);
    if (!parent || parent.type !== "dir") return "no such directory";
    if (parent.children[name]) return `${name}: already exists`;
    parent.children[name] = dir();
    return null;
  }

  remove(path, { recursive = false } = {}) {
    const abs = this.resolve(path);
    if (abs === "/") return "refusing to remove /";
    const { parent, name } = this.parentOf(abs);
    const node = parent?.children?.[name];
    if (!node) return `${path}: no such file or directory`;
    if (node.type === "dir" && !recursive && Object.keys(node.children).length) {
      return `${path}: directory not empty`;
    }
    // Removing the directory you are standing in would strand the prompt at a
    // path that no longer resolves, so step back to its parent first.
    if (this.cwd === abs || this.cwd.startsWith(`${abs}/`)) {
      this.cwd = parentPath(abs);
    }
    delete parent.children[name];
    return null;
  }

  chdir(path) {
    const abs = this.resolve(path);
    const node = this.lookup(abs);
    if (!node) return `${path}: no such file or directory`;
    if (node.type !== "dir") return `${path}: not a directory`;
    this.cwd = abs;
    return null;
  }

  /** Path shown in the prompt, with the home directory abbreviated to "~". */
  displayCwd() {
    if (this.cwd === HOME) return "~";
    if (this.cwd.startsWith(`${HOME}/`)) return `~${this.cwd.slice(HOME.length)}`;
    return this.cwd;
  }

  /**
   * Completion candidates for a partial path. Returns whole words (including
   * any directory prefix the user already typed) so the terminal can splice
   * them straight back into the line.
   */
  completePath(partial) {
    const slash = partial.lastIndexOf("/");
    const dirPart = slash === -1 ? "." : partial.slice(0, slash + 1) || "/";
    const filePart = slash === -1 ? partial : partial.slice(slash + 1);

    const node = this.lookup(dirPart);
    if (!node || node.type !== "dir") return [];

    return Object.keys(node.children)
      .filter((name) => name.startsWith(filePart))
      .sort()
      .map((name) => {
        const suffix = node.children[name].type === "dir" ? "/" : "";
        return (slash === -1 ? "" : partial.slice(0, slash + 1)) + name + suffix;
      });
  }
}

function basename(path) {
  return path.split("/").filter(Boolean).pop() || "/";
}

function parentPath(path) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}`;
}
