class Game {
  constructor() {
    this.fs        = new VirtualFS();
    this.executor  = new CommandExecutor(this.fs);
    this.level     = 0;
    this.cwd       = '/home/player';
    this.freePlay  = false;
    this.history   = [];
    this.histIdx   = -1;

    this.$output        = document.getElementById('terminal-output');
    this.$input         = document.getElementById('terminal-input');
    this.$prompt        = document.getElementById('prompt');
    this.$badge         = document.getElementById('level-badge');
    this.$title         = document.getElementById('level-title');
    this.$bar           = document.getElementById('level-progress-fill');
    this.$objective     = document.getElementById('mission-objective');
    this.$hintBtn       = document.getElementById('hint-btn');
    this.$hintText      = document.getElementById('hint-text');
    this.$completeModal = document.getElementById('level-complete');
    this.$completeMsg   = document.getElementById('level-complete-msg');
    this.$titlebar      = document.getElementById('terminal-title');

    this._bindEvents();
    this._startLevel(0);
  }

  _bindEvents() {
    this.$input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = this.$input.value;
        this.$input.value = '';
        this._submit(val);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); this._histUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); this._histDown();
      } else if (e.key === 'Tab') {
        e.preventDefault(); this._tabComplete();
      }
    });

    this.$hintBtn.addEventListener('click', () => {
      if (this.freePlay) {
        this.freePlay = false;
        this.history = []; this.histIdx = -1;
        this.$hintBtn.style.borderColor = '';
        this.$hintBtn.style.color = '';
        this._startLevel(0);
        return;
      }
      const hidden = this.$hintText.classList.toggle('hidden');
      this.$hintBtn.textContent = hidden ? '💡 Voir l\'indice' : '🙈 Cacher l\'indice';
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
      this.$completeModal.classList.add('hidden');
      this._startLevel(this.level + 1);
    });

    document.getElementById('terminal-container').addEventListener('click', () => this.$input.focus());
  }

  _startLevel(idx) {
    if (idx >= LEVELS.length) { this._startFreePlay(); return; }
    this.level = idx;
    const lvl  = LEVELS[idx];

    // Réinitialise le FS uniquement au début du jeu
    if (idx === 0) {
      this.fs.reset();
      this.cwd = '/home/player';
    }
    // Ajoute les fichiers nécessaires au niveau sans effacer l'existant
    if (lvl.setup) lvl.setup(this.fs);

    this.$badge.textContent    = `Niveau ${idx + 1} / ${LEVELS.length}`;
    this.$badge.style.background = '';
    this.$title.textContent    = lvl.title;
    this.$bar.style.width      = `${(idx / LEVELS.length) * 100}%`;
    this.$objective.innerHTML  = lvl.objective.replace(/\n/g, '<br>');
    this.$hintText.textContent = lvl.hint;
    this.$hintText.classList.add('hidden');
    this.$hintBtn.textContent  = '💡 Voir l\'indice';

    this.$output.innerHTML = '';
    this._printInfo(`─── Niveau ${idx + 1} : ${lvl.title} ───`);
    if (idx === 0) {
      this._print('Bienvenue dans Linux Command Game !');
      this._print('Tapez vos commandes ci-dessous. Utilisez "help" pour la liste complète.');
      this._print('');
    }
    this._updatePrompt();
    this.$input.focus();
  }

  _startFreePlay() {
    this.freePlay = true;

    this.$badge.textContent      = '✓ Terminé';
    this.$badge.style.background = '#e3b341';
    this.$title.textContent      = 'Mode Libre';
    this.$bar.style.width        = '100%';
    this.$objective.innerHTML    =
      'Vous avez complété tous les niveaux.<br><br>' +
      'Le terminal est maintenant entièrement libre.<br>' +
      'Explorez, créez, supprimez — le système de fichiers construit pendant le jeu est intact.';

    this.$hintText.classList.add('hidden');
    this.$hintBtn.textContent    = '↺ Rejouer';
    this.$hintBtn.style.borderColor = 'var(--green)';
    this.$hintBtn.style.color       = 'var(--green)';

    this.$output.innerHTML = '';
    this._printInfo('─── Mode Libre ───');
    this._print('Félicitations ! Vous maîtrisez maintenant les bases du terminal Linux.');
    this._print('Continuez à explorer. Tapez "help" pour voir toutes les commandes.');
    this._print('');
    this._updatePrompt();
    this.$input.focus();
  }

  _submit(raw) {
    const input = raw.trim();
    if (!input) return;

    this.history.unshift(input);
    if (this.history.length > 200) this.history.pop();
    this.histIdx = -1;

    this._printPrompt(input);

    const prevCwd = this.cwd;
    const result  = this.executor.execute(input, this.cwd);

    if (result.output === '__CLEAR__') {
      this.$output.innerHTML = '';
      this._updatePrompt();
      return;
    }

    if (result.newCwd) this.cwd = result.newCwd;

    if (result.output) {
      const cmd = input.trim().split(/\s+/)[0];
      if (cmd === 'ls' && result.lsItems) {
        this._printLs(result.output, result.lsItems, result.lsPath || this.cwd);
      } else if (result.error) {
        this._printError(result.output);
      } else {
        this._print(result.output);
      }
    }

    this._updatePrompt();
    this._scroll();

    if (this.freePlay) return;

    const lvl = LEVELS[this.level];
    if (lvl.validate({ command: input, output: result.output || '', cwd: this.cwd, prevCwd, fs: this.fs })) {
      setTimeout(() => this._showComplete(), 2000);
    }
  }

  _printLs(output, _items, dirPath) {
    if (!output) return;
    const div = document.createElement('div');
    div.className = 'output-line';
    const names = output.split('  ').filter(n => n.trim());
    names.forEach((name, i) => {
      const trimmed = name.trim();
      const abs = dirPath.endsWith('/') ? dirPath + trimmed : dirPath + '/' + trimmed;
      const span = document.createElement('span');
      span.textContent = name + (i < names.length - 1 ? '  ' : '');
      span.className   = this.fs.isDir(abs) ? 'ls-dir' : 'ls-file';
      div.appendChild(span);
    });
    div.appendChild(document.createTextNode('\n'));
    this.$output.appendChild(div);
  }

  _printPrompt(cmd) {
    const div = document.createElement('div');
    div.className = 'output-line';
    const ps = document.createElement('span');
    ps.className = 'out-prompt'; ps.textContent = this._promptStr();
    const cc = document.createElement('span');
    cc.className = 'out-cmd'; cc.textContent = cmd;
    div.appendChild(ps); div.appendChild(cc);
    this.$output.appendChild(div);
  }

  _print(text) {
    const div = document.createElement('div');
    div.className = 'output-line out-text';
    div.textContent = text;
    this.$output.appendChild(div);
  }

  _printError(text) {
    const div = document.createElement('div');
    div.className = 'output-line out-error';
    div.textContent = text;
    this.$output.appendChild(div);
  }

  _printInfo(text) {
    const div = document.createElement('div');
    div.className = 'output-line out-info';
    div.textContent = text;
    this.$output.appendChild(div);
  }

  _promptStr() {
    const rel = this.cwd.startsWith(this.fs.home)
      ? '~' + this.cwd.slice(this.fs.home.length)
      : this.cwd;
    return `player@linux-game:${rel}$ `;
  }

  _updatePrompt() {
    this.$prompt.textContent   = this._promptStr();
    this.$titlebar.textContent = `player@linux-game: ${this._promptStr().split(':')[1].replace('$ ', '')}`;
  }

  _scroll() { this.$output.scrollTop = this.$output.scrollHeight; }

  _histUp() {
    if (this.histIdx < this.history.length - 1) {
      this.histIdx++;
      this.$input.value = this.history[this.histIdx];
    }
  }

  _histDown() {
    if (this.histIdx > 0) { this.histIdx--; this.$input.value = this.history[this.histIdx]; }
    else { this.histIdx = -1; this.$input.value = ''; }
  }

  _tabComplete() {
    const val   = this.$input.value;
    const parts = val.split(' ');
    const last  = parts[parts.length - 1];
    if (!last && parts.length <= 1) return;

    const slashIdx  = last.lastIndexOf('/');
    const dirPart   = slashIdx >= 0 ? last.substring(0, slashIdx + 1) : '';
    const prefix    = slashIdx >= 0 ? last.substring(slashIdx + 1) : last;
    const searchDir = dirPart ? this.fs.resolve(dirPart, this.cwd) : this.cwd;

    const entries = this.fs.list(searchDir) || [];
    const matches = entries.filter(e => e.startsWith(prefix));

    if (matches.length === 1) {
      const completed = dirPart + matches[0];
      const abs = this.fs.resolve(completed, this.cwd);
      parts[parts.length - 1] = completed + (this.fs.isDir(abs) ? '/' : '');
      this.$input.value = parts.join(' ');
    } else if (matches.length > 1) {
      this._print(matches.join('  '));
      this._scroll();
    }
  }

  _showComplete() {
    this.$completeMsg.textContent = `Bravo ! Vous avez maîtrisé « ${LEVELS[this.level].title} ».`;
    this.$bar.style.width = `${((this.level + 1) / LEVELS.length) * 100}%`;
    this.$completeModal.classList.remove('hidden');
  }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new Game(); });
