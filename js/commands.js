class CommandExecutor {
  constructor(fs) {
    this.fs = fs;
  }

  execute(input, cwd) {
    const trimmed = input.trim();
    if (!trimmed) return { output: '', newCwd: cwd };
    if (trimmed.includes('|')) return this._executePipe(trimmed, cwd);
    const parsed = this._parse(trimmed);
    return this._run(parsed, cwd);
  }

  _executePipe(input, cwd) {
    const parts = input.split('|').map(p => p.trim());
    let pipedInput = null;
    let result = { output: '', newCwd: cwd };
    for (const part of parts) {
      const parsed = this._parse(part);
      result = this._run(parsed, result.newCwd, pipedInput);
      pipedInput = result.output;
    }
    return result;
  }

  _parse(input) {
    const tokens = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (inQuote) {
        if (ch === quoteChar) inQuote = false;
        else current += ch;
      } else if (ch === '"' || ch === "'") {
        inQuote = true; quoteChar = ch;
      } else if (ch === ' ' || ch === '\t') {
        if (current) { tokens.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    if (current) tokens.push(current);
    const cmd = tokens[0] || '';
    const allArgs = tokens.slice(1);
    const flags = allArgs.filter(t => t.startsWith('-'));
    const args = allArgs.filter(t => !t.startsWith('-'));
    return { cmd, args, flags, allArgs };
  }

  _run({ cmd, args, flags, allArgs }, cwd, pipedInput = null) {
    if (!cmd) return { output: '', newCwd: cwd };

    const dispatch = {
      pwd:    () => ({ output: cwd, newCwd: cwd }),
      ls:     () => this._ls(args, flags, cwd),
      cd:     () => this._cd(args, cwd),
      cat:    () => this._cat(args, cwd, pipedInput),
      mkdir:  () => this._mkdir(args, flags, cwd),
      touch:  () => this._touch(args, cwd),
      rm:     () => this._rm(args, flags, cwd),
      cp:     () => this._cp(args, cwd),
      mv:     () => this._mv(args, cwd),
      echo:   () => ({ output: args.join(' '), newCwd: cwd }),
      grep:   () => this._grep(args, flags, cwd, pipedInput),
      find:   () => this._find(args, allArgs, cwd),
      chmod:  () => this._chmod(args, cwd),
      wc:     () => this._wc(args, flags, cwd, pipedInput),
      head:   () => this._headTail(args, flags, cwd, pipedInput, 'head'),
      tail:   () => this._headTail(args, flags, cwd, pipedInput, 'tail'),
      sort:   () => this._sort(args, flags, cwd, pipedInput),
      clear:  () => ({ output: '__CLEAR__', newCwd: cwd }),
      whoami: () => ({ output: 'player', newCwd: cwd }),
      date:   () => ({ output: new Date().toString(), newCwd: cwd }),
      uname:  () => ({ output: flags.includes('-a') ? 'Linux linux-game 5.15.0 #1 SMP x86_64 GNU/Linux' : 'Linux', newCwd: cwd }),
      help:   () => ({ output: this._helpText(), newCwd: cwd }),
      man:    () => ({ output: this._manText(args[0]), newCwd: cwd }),
    };

    if (dispatch[cmd]) {
      try { return dispatch[cmd](); }
      catch (e) { return { output: `${cmd}: ${e.message}`, newCwd: cwd, error: true }; }
    }
    return { output: `${cmd}: commande introuvable\nTapez 'help' pour voir les commandes disponibles.`, newCwd: cwd, error: true };
  }

  _ls(args, flags, cwd) {
    const showAll  = flags.some(f => f.includes('a'));
    const showLong = flags.some(f => f.includes('l'));
    const target   = args[0] ? this.fs.resolve(args[0], cwd) : cwd;

    if (!this.fs.exists(target))
      return { output: `ls: cannot access '${args[0]}': No such file or directory`, newCwd: cwd, error: true };

    if (this.fs.isFile(target)) {
      const node = this.fs.get(target);
      const item = { name: node.name, type: 'file', permissions: '-' + node.permissions, owner: node.owner || 'player', size: node.content.length };
      return { output: showLong ? this._fmtLong(item) : node.name, newCwd: cwd };
    }

    let items = this.fs.listDetails(target);
    if (!showAll) items = items.filter(e => !e.name.startsWith('.'));
    items.sort((a, b) => a.name.localeCompare(b.name));

    if (showLong) {
      const lines = [`total ${items.length}`];
      if (showAll) {
        lines.push(`drwxr-xr-x  player   player      4096 .`);
        lines.push(`drwxr-xr-x  player   player      4096 ..`);
      }
      items.forEach(i => lines.push(this._fmtLong(i)));
      return { output: lines.join('\n'), newCwd: cwd };
    }

    return { output: items.map(i => i.name).join('  ') || '', newCwd: cwd, lsItems: items, lsPath: target };
  }

  _fmtLong(item) {
    return `${item.permissions}  ${item.owner.padEnd(8)} ${item.owner.padEnd(8)} ${String(item.size).padStart(6)}  ${item.name}`;
  }

  _cd(args, cwd) {
    const target = args[0] ? this.fs.resolve(args[0], cwd) : this.fs.home;
    if (!this.fs.exists(target))
      return { output: `cd: ${args[0]}: No such file or directory`, newCwd: cwd, error: true };
    if (!this.fs.isDir(target))
      return { output: `cd: ${args[0]}: Not a directory`, newCwd: cwd, error: true };
    return { output: '', newCwd: target };
  }

  _cat(args, cwd, pipedInput) {
    if (pipedInput !== null && args.length === 0) return { output: pipedInput, newCwd: cwd };
    if (!args.length) return { output: 'cat: missing operand', newCwd: cwd, error: true };
    const out = [];
    for (const arg of args) {
      const path = this.fs.resolve(arg, cwd);
      if (!this.fs.exists(path)) { out.push(`cat: ${arg}: No such file or directory`); continue; }
      if (this.fs.isDir(path))   { out.push(`cat: ${arg}: Is a directory`); continue; }
      out.push(this.fs.readFile(path));
    }
    return { output: out.join('\n'), newCwd: cwd };
  }

  _mkdir(args, flags, cwd) {
    if (!args.length) return { output: 'mkdir: missing operand', newCwd: cwd, error: true };
    const makeParents = flags.some(f => f.includes('p'));
    const errs = [];
    for (const arg of args) {
      const path = this.fs.resolve(arg, cwd);
      if (this.fs.exists(path)) { if (!makeParents) errs.push(`mkdir: cannot create directory '${arg}': File exists`); continue; }
      const { parent } = this.fs._splitPath(path);
      if (!this.fs.exists(parent)) {
        if (!makeParents) { errs.push(`mkdir: cannot create directory '${arg}': No such file or directory`); continue; }
        const parts = path.split('/').filter(Boolean);
        let cur = '';
        for (const p of parts) { cur += '/' + p; if (!this.fs.exists(cur)) this.fs.mkdir(cur); }
      } else {
        this.fs.mkdir(path);
      }
    }
    return { output: errs.join('\n'), newCwd: cwd, error: errs.length > 0 };
  }

  _touch(args, cwd) {
    if (!args.length) return { output: 'touch: missing file operand', newCwd: cwd, error: true };
    for (const arg of args) this.fs.touch(this.fs.resolve(arg, cwd));
    return { output: '', newCwd: cwd };
  }

  _rm(args, flags, cwd) {
    if (!args.length) return { output: 'rm: missing operand', newCwd: cwd, error: true };
    const recursive = flags.some(f => f.includes('r') || f.includes('R'));
    const errs = [];
    for (const arg of args) {
      const path = this.fs.resolve(arg, cwd);
      if (!this.fs.exists(path)) { errs.push(`rm: cannot remove '${arg}': No such file or directory`); continue; }
      const result = this.fs.remove(path, recursive);
      if (!result.ok) errs.push(`rm: ${result.msg}`);
    }
    return { output: errs.join('\n'), newCwd: cwd, error: errs.length > 0 };
  }

  _cp(args, cwd) {
    if (args.length < 2) return { output: 'cp: missing destination file operand', newCwd: cwd, error: true };
    const src = this.fs.resolve(args[0], cwd);
    const dst = this.fs.resolve(args[1], cwd);
    if (!this.fs.exists(src)) return { output: `cp: '${args[0]}': No such file or directory`, newCwd: cwd, error: true };
    const result = this.fs.copy(src, dst);
    return result.ok ? { output: '', newCwd: cwd } : { output: `cp: ${result.msg}`, newCwd: cwd, error: true };
  }

  _mv(args, cwd) {
    if (args.length < 2) return { output: 'mv: missing destination file operand', newCwd: cwd, error: true };
    const src = this.fs.resolve(args[0], cwd);
    const dst = this.fs.resolve(args[1], cwd);
    if (!this.fs.exists(src)) return { output: `mv: '${args[0]}': No such file or directory`, newCwd: cwd, error: true };
    const result = this.fs.move(src, dst);
    return result.ok ? { output: '', newCwd: cwd } : { output: `mv: ${result.msg}`, newCwd: cwd, error: true };
  }

  _grep(args, flags, cwd, pipedInput) {
    if (!args.length) return { output: 'grep: missing pattern', newCwd: cwd, error: true };
    const caseI = flags.some(f => f.includes('i'));
    const pattern = args[0];
    let text = '';
    if (pipedInput !== null && args.length === 1) {
      text = pipedInput;
    } else if (args.length >= 2) {
      const path = this.fs.resolve(args[1], cwd);
      if (!this.fs.exists(path)) return { output: `grep: ${args[1]}: No such file or directory`, newCwd: cwd, error: true };
      text = this.fs.readFile(path) || '';
    } else {
      return { output: 'grep: missing file operand', newCwd: cwd, error: true };
    }
    let regex;
    try { regex = new RegExp(pattern, caseI ? 'i' : ''); }
    catch { regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseI ? 'i' : ''); }
    const lines = text.split('\n').filter(l => regex.test(l));
    return { output: lines.join('\n'), newCwd: cwd };
  }

  _find(args, allArgs, cwd) {
    const searchPath = args[0] ? this.fs.resolve(args[0], cwd) : cwd;
    let namePattern = null;
    let typeFilter = null;
    for (let i = 0; i < allArgs.length; i++) {
      if (allArgs[i] === '-name' && allArgs[i + 1]) {
        const glob = allArgs[++i];
        namePattern = new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      } else if (allArgs[i] === '-type' && allArgs[i + 1]) {
        typeFilter = allArgs[++i];
      }
    }
    if (!this.fs.exists(searchPath)) return { output: `find: '${args[0]}': No such file or directory`, newCwd: cwd, error: true };
    const results = [];
    const walk = (path, node) => {
      const name = path === '/' ? '/' : path.split('/').pop();
      let match = true;
      if (namePattern) match = match && namePattern.test(name);
      if (typeFilter === 'f') match = match && node.type === 'file';
      if (typeFilter === 'd') match = match && node.type === 'dir';
      if (match) results.push(path);
      if (node.type === 'dir') {
        for (const [childName, child] of Object.entries(node.children)) {
          walk((path === '/' ? '' : path) + '/' + childName, child);
        }
      }
    };
    walk(searchPath, this.fs.get(searchPath));
    return { output: results.join('\n'), newCwd: cwd };
  }

  _chmod(args, cwd) {
    if (args.length < 2) return { output: 'chmod: missing operand', newCwd: cwd, error: true };
    const path = this.fs.resolve(args[1], cwd);
    if (!this.fs.exists(path)) return { output: `chmod: cannot access '${args[1]}': No such file or directory`, newCwd: cwd, error: true };
    if (!this.fs.chmod(path, args[0])) return { output: `chmod: invalid mode: '${args[0]}'`, newCwd: cwd, error: true };
    return { output: '', newCwd: cwd };
  }

  _wc(args, flags, cwd, pipedInput) {
    let text = '';
    if (pipedInput !== null && !args.length) { text = pipedInput; }
    else if (args.length) {
      const path = this.fs.resolve(args[0], cwd);
      if (!this.fs.exists(path)) return { output: `wc: ${args[0]}: No such file or directory`, newCwd: cwd, error: true };
      text = this.fs.readFile(path) || '';
    }
    const lines = text ? text.split('\n').length : 0;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    if (flags.some(f => f.includes('l'))) return { output: String(lines), newCwd: cwd };
    if (flags.some(f => f.includes('w'))) return { output: String(words), newCwd: cwd };
    if (flags.some(f => f.includes('c'))) return { output: String(chars), newCwd: cwd };
    return { output: `  ${lines}  ${words} ${chars}`, newCwd: cwd };
  }

  _headTail(args, flags, cwd, pipedInput, mode) {
    let n = 10;
    const nFlag = flags.find(f => /^-\d+$/.test(f));
    if (nFlag) n = parseInt(nFlag.slice(1));
    let text = '';
    if (pipedInput !== null && !args.length) { text = pipedInput; }
    else if (args.length) {
      const path = this.fs.resolve(args[0], cwd);
      if (!this.fs.exists(path)) return { output: `${mode}: ${args[0]}: No such file or directory`, newCwd: cwd, error: true };
      text = this.fs.readFile(path) || '';
    }
    const lines = text.split('\n');
    const result = mode === 'head' ? lines.slice(0, n) : lines.slice(-n);
    return { output: result.join('\n'), newCwd: cwd };
  }

  _sort(args, flags, cwd, pipedInput) {
    let text = '';
    if (pipedInput !== null && !args.length) { text = pipedInput; }
    else if (args.length) {
      const path = this.fs.resolve(args[0], cwd);
      if (!this.fs.exists(path)) return { output: `sort: ${args[0]}: No such file or directory`, newCwd: cwd, error: true };
      text = this.fs.readFile(path) || '';
    }
    const lines = text.split('\n');
    lines.sort();
    if (flags.some(f => f.includes('r'))) lines.reverse();
    return { output: lines.join('\n'), newCwd: cwd };
  }

  _helpText() {
    return `Commandes disponibles :
  Navigation :    pwd, ls [-la], cd [rép]
  Fichiers :      cat, touch, mkdir [-p], rm [-r], cp, mv
  Recherche :     grep [-i] motif [fichier], find [chemin] [-name motif] [-type f/d]
  Texte :         echo, head [-n], tail [-n], sort [-r], wc [-lwc]
  Permissions :   chmod mode fichier  (ex. chmod 755 ou chmod +x)
  Pipes :         cmd1 | cmd2
  Infos :         clear, help, man <cmd>, whoami, date, uname`;
  }

  _manText(cmd) {
    const pages = {
      pwd:   'pwd - affiche le répertoire courant\nUsage : pwd\nAffiche le chemin complet du répertoire actuel.',
      ls:    'ls - liste le contenu d\'un répertoire\nUsage : ls [-la] [chemin]\n  -l  format long (permissions, taille, propriétaire)\n  -a  affiche les fichiers cachés (commençant par .)',
      cd:    'cd - change de répertoire\nUsage : cd [répertoire]\n  Sans argument : retourne au dossier personnel (~)\n  cd ..   remonte d\'un niveau',
      cat:   'cat - affiche le contenu d\'un fichier\nUsage : cat fichier...\nConcatène et affiche les fichiers dans le terminal.',
      mkdir: 'mkdir - crée des répertoires\nUsage : mkdir [-p] répertoire...\n  -p  crée les répertoires parents si nécessaire',
      touch: 'touch - crée un fichier vide ou met à jour son horodatage\nUsage : touch fichier...',
      rm:    'rm - supprime des fichiers\nUsage : rm [-r] fichier...\n  -r  supprime les répertoires récursivement\nATTENTION : pas de corbeille sous Linux !',
      cp:    'cp - copie des fichiers\nUsage : cp source destination',
      mv:    'mv - déplace ou renomme des fichiers\nUsage : mv source destination',
      grep:  'grep - recherche des motifs dans du texte\nUsage : grep [-i] motif [fichier]\n  -i  recherche sans distinction majuscules/minuscules\nLit depuis un fichier ou une entrée via pipe.',
      find:  'find - recherche des fichiers\nUsage : find [chemin] [-name motif] [-type f|d]\n  -name  filtre par nom (supporte le joker *)\n  -type  f=fichier, d=répertoire',
      chmod: 'chmod - modifie les permissions d\'un fichier\nUsage : chmod mode fichier\n  Octal : chmod 755 fichier\n  Symbolique : chmod +x fichier, chmod -w fichier\n  Bits : r=lecture(4) w=écriture(2) x=exécution(1)',
      echo:  'echo - affiche du texte\nUsage : echo [texte]\nAffiche le texte dans le terminal.',
      wc:    'wc - compte les mots\nUsage : wc [-lwc] [fichier]\n  -l  nombre de lignes\n  -w  nombre de mots\n  -c  nombre de caractères',
    };
    if (!cmd) return 'Usage : man <commande>\nSaisissez un nom de commande pour lire son manuel.';
    return pages[cmd] || `Aucune entrée de manuel pour '${cmd}'`;
  }
}
