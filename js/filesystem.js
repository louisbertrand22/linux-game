class VirtualFS {
  constructor() {
    this.home = '/home/player';
    this.reset();
  }

  reset() {
    this._tree = {
      type: 'dir', name: '/', permissions: 'rwxr-xr-x', owner: 'root',
      children: {
        home: {
          type: 'dir', name: 'home', permissions: 'rwxr-xr-x', owner: 'root',
          children: {
            player: {
              type: 'dir', name: 'player', permissions: 'rwxr-xr-x', owner: 'player',
              children: {}
            }
          }
        },
        etc: {
          type: 'dir', name: 'etc', permissions: 'rwxr-xr-x', owner: 'root',
          children: {
            hosts: { type: 'file', name: 'hosts', permissions: 'rw-r--r--', owner: 'root', content: '127.0.0.1\tlocalhost\n192.168.1.1\trouter' },
            passwd: { type: 'file', name: 'passwd', permissions: 'rw-r--r--', owner: 'root', content: 'root:x:0:0:root:/root:/bin/bash\nplayer:x:1000:1000::/home/player:/bin/bash' }
          }
        },
        tmp: { type: 'dir', name: 'tmp', permissions: 'rwxrwxrwx', owner: 'root', children: {} }
      }
    };
  }

  normalize(path) {
    const parts = path.split('/').filter(p => p !== '');
    const result = [];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') result.pop();
      else result.push(p);
    }
    return '/' + result.join('/');
  }

  resolve(path, cwd) {
    if (!path) return cwd;
    if (path === '~') return this.home;
    if (path.startsWith('~/')) return this.normalize(this.home + '/' + path.slice(2));
    if (path.startsWith('/')) return this.normalize(path);
    return this.normalize(cwd + '/' + path);
  }

  get(absPath) {
    if (absPath === '/') return this._tree;
    const parts = absPath.split('/').filter(p => p !== '');
    let node = this._tree;
    for (const part of parts) {
      if (!node || node.type !== 'dir' || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  _splitPath(absPath) {
    const idx = absPath.lastIndexOf('/');
    if (idx === 0) return { parent: '/', name: absPath.slice(1) };
    return { parent: absPath.slice(0, idx), name: absPath.slice(idx + 1) };
  }

  exists(absPath) { return this.get(absPath) !== null; }
  isDir(absPath) { const n = this.get(absPath); return n && n.type === 'dir'; }
  isFile(absPath) { const n = this.get(absPath); return n && n.type === 'file'; }

  list(absPath) {
    const node = this.get(absPath);
    if (!node || node.type !== 'dir') return null;
    return Object.keys(node.children);
  }

  listDetails(absPath) {
    const node = this.get(absPath);
    if (!node || node.type !== 'dir') return null;
    return Object.values(node.children).map(child => ({
      name: child.name,
      type: child.type,
      permissions: (child.type === 'dir' ? 'd' : '-') + child.permissions,
      owner: child.owner || 'player',
      size: child.type === 'file' ? child.content.length : 4096
    }));
  }

  readFile(absPath) {
    const node = this.get(absPath);
    return (node && node.type === 'file') ? node.content : null;
  }

  mkdir(absPath) {
    const { parent, name } = this._splitPath(absPath);
    const parentNode = this.get(parent);
    if (!parentNode || parentNode.type !== 'dir') return false;
    if (parentNode.children[name]) return false;
    parentNode.children[name] = { type: 'dir', name, permissions: 'rwxr-xr-x', owner: 'player', children: {} };
    return true;
  }

  touch(absPath) {
    const { parent, name } = this._splitPath(absPath);
    const parentNode = this.get(parent);
    if (!parentNode || parentNode.type !== 'dir') return false;
    if (!parentNode.children[name]) {
      parentNode.children[name] = { type: 'file', name, permissions: 'rw-r--r--', owner: 'player', content: '' };
    }
    return true;
  }

  writeFile(absPath, content) {
    const { parent, name } = this._splitPath(absPath);
    const parentNode = this.get(parent);
    if (!parentNode || parentNode.type !== 'dir') return false;
    if (parentNode.children[name] && parentNode.children[name].type !== 'file') return false;
    if (parentNode.children[name]) {
      parentNode.children[name].content = content;
    } else {
      parentNode.children[name] = { type: 'file', name, permissions: 'rw-r--r--', owner: 'player', content };
    }
    return true;
  }

  remove(absPath, recursive = false) {
    const { parent, name } = this._splitPath(absPath);
    const parentNode = this.get(parent);
    if (!parentNode || !parentNode.children[name]) return { ok: false, msg: 'No such file or directory' };
    const node = parentNode.children[name];
    if (node.type === 'dir' && !recursive) {
      if (Object.keys(node.children).length > 0)
        return { ok: false, msg: `cannot remove '${name}': Is a directory` };
      return { ok: false, msg: `cannot remove '${name}': Is a directory` };
    }
    delete parentNode.children[name];
    return { ok: true };
  }

  copy(srcPath, dstPath) {
    const src = this.get(srcPath);
    if (!src) return { ok: false, msg: 'No such file or directory' };
    let target = dstPath;
    const dstNode = this.get(dstPath);
    if (dstNode && dstNode.type === 'dir') target = dstPath + '/' + src.name;
    const { parent, name } = this._splitPath(target);
    const parentNode = this.get(parent);
    if (!parentNode || parentNode.type !== 'dir') return { ok: false, msg: 'No such directory' };
    parentNode.children[name] = JSON.parse(JSON.stringify(src));
    parentNode.children[name].name = name;
    return { ok: true };
  }

  move(srcPath, dstPath) {
    const result = this.copy(srcPath, dstPath);
    if (!result.ok) return result;
    this.remove(srcPath, true);
    return { ok: true };
  }

  chmod(absPath, mode) {
    const node = this.get(absPath);
    if (!node) return false;
    if (/^\d{3}$/.test(mode)) {
      node.permissions = this._octalToRWX(mode);
      return true;
    }
    if (/^[ugo]*[+-][rwx]+$/.test(mode)) {
      node.permissions = this._applySymbolic(node.permissions, mode);
      return true;
    }
    return false;
  }

  _octalToRWX(octal) {
    const toRWX = n => ((n & 4) ? 'r' : '-') + ((n & 2) ? 'w' : '-') + ((n & 1) ? 'x' : '-');
    return octal.split('').map(Number).map(toRWX).join('');
  }

  _applySymbolic(current, mode) {
    const op = mode.match(/[+-]/)[0];
    const perms = mode.replace(/^[ugo]*[+-]/, '');
    const p = current.split('');
    const map = { r: [0, 3, 6], w: [1, 4, 7], x: [2, 5, 8] };
    for (const ch of perms) {
      if (!map[ch]) continue;
      for (const pos of map[ch]) p[pos] = op === '+' ? ch : '-';
    }
    return p.join('');
  }
}
