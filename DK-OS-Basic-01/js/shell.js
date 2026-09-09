/**
 * The DK-OS shell: command table, argument parsing and tab completion.
 *
 * Commands are data, not a switch statement — each entry carries its own help
 * text, so `help` is generated from the same table that dispatches, and the two
 * cannot drift apart. A command receives (args, ctx) and may return a promise;
 * the shell locks input until it settles.
 */

export class Shell {
  /**
   * @param {Object} deps
   * @param {import("./terminal.js").Terminal} deps.term
   * @param {import("./filesystem.js").FileSystem} deps.fs
   * @param {Object} deps.state - Engine GameStateManager, for `play` / `exit`.
   */
  constructor({ term, fs, state, bus = null }) {
    this.term = term;
    this.fs = fs;
    this.state = state;
    this.bus = bus;
    this.commands = buildCommands();

    term.onSubmit = (line) => this.run(line);
    term.completer = (word, head) => this.complete(word, head);
    this.updatePrompt();
  }

  /** Prompt tracks the working directory, as a shell prompt should. */
  updatePrompt() {
    this.term.prompt = `dk@dkos:${this.fs.displayCwd()}$ `;
    this.term.renderInput();
  }

  /**
   * Splits a line into words, honouring quotes so paths may contain spaces.
   * Deliberately simple: no pipes, globs or variable expansion.
   */
  static tokenize(line) {
    const tokens = [];
    const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      tokens.push(match[1] ?? match[2] ?? match[3]);
    }
    return tokens;
  }

  async run(line) {
    if (!line) return;

    const [name, ...args] = Shell.tokenize(line);
    const command = this.commands[name];

    if (!command) {
      this.term.writeError(`${name}: command not found`);
      this.term.write("Type `help` for a list of commands.");
      return;
    }

    const ctx = {
      term: this.term,
      fs: this.fs,
      state: this.state,
      bus: this.bus,
      shell: this,
      commands: this.commands,
    };

    // Async commands lock the keyboard so their output cannot interleave with
    // whatever the user types next; the lock is released either way.
    try {
      const result = command.run(args, ctx);
      if (result instanceof Promise) {
        this.term.setLocked(true);
        try {
          await result;
        } finally {
          this.term.setLocked(false);
        }
      }
    } catch (err) {
      this.term.writeError(`${name}: ${err.message}`);
    }

    this.updatePrompt();
  }

  /**
   * Completes command names in the first word and paths everywhere after,
   * which covers every command in the table.
   */
  complete(word, head) {
    const isFirstWord = !head.slice(0, head.length - word.length).trim();
    if (isFirstWord) {
      return Object.keys(this.commands).filter((name) => name.startsWith(word)).sort();
    }
    return this.fs.completePath(word);
  }
}

/** Pads a string so help output lines up in a column. */
function pad(text, width) {
  return text + " ".repeat(Math.max(0, width - text.length));
}

function buildCommands() {
  /** @type {Record<string, {usage: string, help: string, run: Function}>} */
  const commands = {
    help: {
      usage: "help [command]",
      help: "Show available commands",
      run: (args, { term, commands: table }) => {
        const [name] = args;
        if (name) {
          const command = table[name];
          if (!command) return term.writeError(`help: no such command: ${name}`);
          term.write(`${command.usage}`);
          term.write(`  ${command.help}`);
          return undefined;
        }
        term.write("DK-OS BASIC — available commands", "accent");
        term.write("");
        const width = Math.max(...Object.keys(table).map((key) => key.length)) + 2;
        for (const key of Object.keys(table).sort()) {
          term.write(`  ${pad(key, width)}${table[key].help}`);
        }
        term.write("");
        term.write("Tab completes, arrows recall history, ctrl+l clears.", "dim");
        return undefined;
      },
    },

    ls: {
      usage: "ls [path]",
      help: "List directory contents",
      run: (args, { term, fs }) => {
        const target = args[0] || ".";
        const entries = fs.list(target);
        if (entries === null) return term.writeError(`ls: ${target}: no such file or directory`);
        if (!entries.length) return undefined;
        term.write(entries.join("  "));
        return undefined;
      },
    },

    cd: {
      usage: "cd [path]",
      help: "Change the working directory",
      run: (args, { term, fs }) => {
        // Bare `cd` goes home, matching every shell anyone has used.
        const error = fs.chdir(args[0] || fs.home);
        if (error) term.writeError(`cd: ${error}`);
      },
    },

    pwd: {
      usage: "pwd",
      help: "Print the working directory",
      run: (_args, { term, fs }) => term.write(fs.cwd),
    },

    cat: {
      usage: "cat <file>...",
      help: "Print file contents",
      run: (args, { term, fs }) => {
        if (!args.length) return term.writeError("cat: missing operand");
        for (const path of args) {
          const content = fs.read(path);
          if (content === null) {
            term.writeError(`cat: ${path}: ${fs.isDir(path) ? "is a directory" : "no such file"}`);
          } else {
            term.write(content);
          }
        }
        return undefined;
      },
    },

    mkdir: {
      usage: "mkdir <dir>...",
      help: "Create a directory",
      run: (args, { term, fs }) => {
        if (!args.length) return term.writeError("mkdir: missing operand");
        for (const path of args) {
          const error = fs.mkdir(path);
          if (error) term.writeError(`mkdir: ${error}`);
        }
        return undefined;
      },
    },

    touch: {
      usage: "touch <file>...",
      help: "Create an empty file",
      run: (args, { term, fs }) => {
        if (!args.length) return term.writeError("touch: missing operand");
        for (const path of args) {
          // An existing file keeps its contents; only new ones start empty.
          if (fs.read(path) !== null) continue;
          const error = fs.write(path, "");
          if (error) term.writeError(`touch: ${error}`);
        }
        return undefined;
      },
    },

    write: {
      usage: "write <file> <text...>",
      help: "Write text to a file",
      run: (args, { term, fs }) => {
        if (args.length < 2) return term.writeError("write: usage: write <file> <text...>");
        const [path, ...rest] = args;
        const error = fs.write(path, rest.join(" "));
        if (error) term.writeError(`write: ${error}`);
        return undefined;
      },
    },

    rm: {
      usage: "rm [-r] <path>...",
      help: "Remove a file or directory",
      run: (args, { term, fs }) => {
        const recursive = args.includes("-r") || args.includes("-rf");
        const targets = args.filter((arg) => !arg.startsWith("-"));
        if (!targets.length) return term.writeError("rm: missing operand");
        for (const path of targets) {
          const error = fs.remove(path, { recursive });
          if (error) term.writeError(`rm: ${error}`);
        }
        return undefined;
      },
    },

    echo: {
      usage: "echo [text...]",
      help: "Print text",
      run: (args, { term }) => term.write(args.join(" ")),
    },

    clear: {
      usage: "clear",
      help: "Clear the screen",
      run: (_args, { term }) => term.clear(),
    },

    date: {
      usage: "date",
      help: "Show the current date and time",
      run: (_args, { term }) => term.write(new Date().toString()),
    },

    whoami: {
      usage: "whoami",
      help: "Print the current user",
      run: (_args, { term }) => term.write("dk"),
    },

    history: {
      usage: "history",
      help: "Show command history",
      run: (_args, { term }) => {
        term.history.forEach((entry, index) => {
          term.write(`  ${pad(String(index + 1), 4)}${entry}`);
        });
      },
    },

    sysinfo: {
      usage: "sysinfo",
      help: "Show system information",
      run: (_args, { term }) => {
        const rows = [
          ["OS", "DK-OS BASIC 1.0.0"],
          ["Kernel", "futureon-1.0.0-web"],
          ["Shell", "dksh"],
          ["Display", `${window.innerWidth}x${window.innerHeight}`],
          ["Host", navigator.platform || "unknown"],
          ["Memory", "640K (ought to be enough)"],
        ];
        term.write("");
        for (const [key, value] of rows) term.write(`  ${pad(key, 10)}${value}`, "accent");
        term.write("");
      },
    },

    motd: {
      usage: "motd",
      help: "Print the message of the day",
      run: (_args, { term, fs }) => term.write(fs.read("/etc/motd") || ""),
    },

    exit: {
      usage: "exit",
      help: "Return to the home menu",
      run: (_args, { state }) => state.setState("home"),
    },

    play: {
      usage: "play",
      help: "Launch the game",
      run: (_args, { state, bus }) => {
        // Apps launch from home, so hop through it to keep the transition legal.
        state.setState("home");
        // Same topic the home menu publishes, so launching has one code path.
        if (bus) bus.emit("app:launch", { id: "game", state: "game" });
        else state.setState("game");
      },
    },

    reboot: {
      usage: "reboot",
      help: "Restart the system",
      run: (_args, { state }) => state.setState("boot"),
    },
  };

  return commands;
}
