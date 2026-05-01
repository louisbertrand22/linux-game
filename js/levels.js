const LEVELS = [
  {
    title: 'Où suis-je ?',
    objective: `Vous venez de vous connecter à un serveur Linux. Avant tout, trouvez <em>où vous êtes</em> dans le système de fichiers.\n\nUtilisez <code>pwd</code> pour afficher votre répertoire courant.`,
    hint: 'Tapez : pwd',
    setup(fs) {},
    validate({ command }) {
      return command.trim() === 'pwd';
    }
  },
  {
    title: 'Regarder autour',
    objective: `Vous savez où vous êtes. Voyons maintenant ce qu'il y a <em>dans</em> ce répertoire.\n\nUtilisez <code>ls</code> pour lister les fichiers et dossiers.`,
    hint: 'Tapez : ls',
    setup(fs) {
      fs.writeFile('/home/player/readme.txt', 'Bienvenue sur le serveur !\nVoici votre répertoire personnel.');
      fs.mkdir('/home/player/documents');
      fs.mkdir('/home/player/telechargements');
    },
    validate({ command }) {
      return /^ls(\s|$)/.test(command.trim());
    }
  },
  {
    title: 'Fichiers cachés',
    objective: `Sous Linux, les fichiers commençant par <code>.</code> sont <em>cachés</em>.\n\nUn fichier de configuration secret se cache ici. Utilisez <code>ls -a</code> pour afficher tous les fichiers, y compris les cachés.`,
    hint: 'L\'option -a signifie "all" (tous). Essayez : ls -a',
    setup(fs) {
      fs.writeFile('/home/player/.secret', 'motdepasse=linux4ever');
      fs.writeFile('/home/player/.bashrc', '# config du shell\nexport PS1="\\u@\\h:\\w$ "');
      fs.writeFile('/home/player/notes.txt', 'Fichier normal');
    },
    validate({ command }) {
      const parts = command.trim().split(/\s+/);
      return parts[0] === 'ls' && parts.some(p => p.startsWith('-') && p.includes('a'));
    }
  },
  {
    title: 'Détails des fichiers',
    objective: `<code>ls -l</code> affiche des informations détaillées sur chaque fichier :\npermissions, propriétaire, taille et nom.\n\nUtilisez <code>ls -l</code> pour voir ces détails.`,
    hint: 'Tapez : ls -l',
    setup(fs) {
      fs.writeFile('/home/player/rapport.txt', 'Résultats T1 : +15%\nRésultats T2 : +22%');
      fs.mkdir('/home/player/archives');
    },
    validate({ command }) {
      const parts = command.trim().split(/\s+/);
      return parts[0] === 'ls' && parts.some(p => p.startsWith('-') && p.includes('l'));
    }
  },
  {
    title: 'Naviguer !',
    objective: `Utilisez <code>cd</code> pour changer de répertoire.\n\nEntrez dans le dossier <code>documents</code>.\n\nAstuce : <code>cd ..</code> remonte d'un niveau.`,
    hint: 'Tapez : cd documents',
    setup(fs) {
      fs.mkdir('/home/player/documents');
      fs.writeFile('/home/player/documents/notes.txt', 'Voici mes notes.');
    },
    validate({ cwd }) {
      return cwd === '/home/player/documents';
    }
  },
  {
    title: 'Lire un fichier',
    objective: `Vous êtes dans le dossier documents.\nIl y a un fichier <code>notes.txt</code> ici.\n\nUtilisez <code>cat</code> pour lire et afficher son contenu.`,
    hint: 'Tapez : cat notes.txt',
    startCwd: '/home/player/documents',
    setup(fs) {
      fs.mkdir('/home/player/documents');
      fs.writeFile('/home/player/documents/notes.txt', 'Notes top secrètes :\n1. Apprendre les commandes Linux\n2. Pratiquer chaque jour\n3. Devenir un maître Linux !');
    },
    validate({ command }) {
      return /^cat\s/.test(command.trim()) && command.includes('notes.txt');
    }
  },
  {
    title: 'Créer un répertoire',
    objective: `Utilisez <code>mkdir</code> pour créer un nouveau répertoire.\n\nCréez un dossier appelé <code>projets</code> dans votre répertoire personnel.`,
    hint: 'Tapez : mkdir projets',
    setup(fs) {},
    validate({ fs: vfs }) {
      return vfs.isDir('/home/player/projets');
    }
  },
  {
    title: 'Créer un fichier',
    objective: `Utilisez <code>touch</code> pour créer un fichier vide.\n\nCréez un fichier appelé <code>todo.txt</code> dans votre répertoire personnel.`,
    hint: 'Tapez : touch todo.txt',
    setup(fs) {},
    validate({ fs: vfs }) {
      return vfs.isFile('/home/player/todo.txt');
    }
  },
  {
    title: 'Copier un fichier',
    objective: `Utilisez <code>cp</code> pour copier des fichiers.\n\nFaites une sauvegarde : copiez <code>donnees.txt</code> vers <code>donnees_backup.txt</code>.`,
    hint: 'Tapez : cp donnees.txt donnees_backup.txt',
    setup(fs) {
      fs.writeFile('/home/player/donnees.txt', 'Données importantes\nNe pas perdre !');
    },
    validate({ fs: vfs }) {
      return vfs.isFile('/home/player/donnees_backup.txt') && vfs.isFile('/home/player/donnees.txt');
    }
  },
  {
    title: 'Déplacer et renommer',
    objective: `<code>mv</code> déplace des fichiers — mais si la source et la destination sont dans le même dossier, il <em>renomme</em> le fichier.\n\nRenommez <code>brouillon.txt</code> en <code>final.txt</code>.`,
    hint: 'Tapez : mv brouillon.txt final.txt',
    setup(fs) {
      fs.writeFile('/home/player/brouillon.txt', 'Voici mon brouillon.');
    },
    validate({ fs: vfs }) {
      return vfs.isFile('/home/player/final.txt') && !vfs.isFile('/home/player/brouillon.txt');
    }
  },
  {
    title: 'Supprimer un fichier',
    objective: `Utilisez <code>rm</code> pour supprimer des fichiers.\n\nSupprimez le fichier <code>corbeille.txt</code>.\n\n⚠️ Attention : Linux n'a pas de corbeille !`,
    hint: 'Tapez : rm corbeille.txt',
    setup(fs) {
      fs.writeFile('/home/player/corbeille.txt', 'Supprimez-moi.');
      fs.writeFile('/home/player/garder.txt', 'Ne PAS supprimer celui-ci !');
    },
    validate({ fs: vfs }) {
      return !vfs.exists('/home/player/corbeille.txt') && vfs.isFile('/home/player/garder.txt');
    }
  },
  {
    title: 'Chercher dans les fichiers',
    objective: `Utilisez <code>grep</code> pour rechercher du texte <em>à l'intérieur</em> des fichiers.\n\nTrouvez la ligne contenant le mot <code>erreur</code> dans <code>serveur.log</code>.`,
    hint: 'Tapez : grep erreur serveur.log',
    setup(fs) {
      fs.writeFile('/home/player/serveur.log', '[INFO]  Serveur démarré sur le port 8080\n[INFO]  Connecté à la base de données\n[ERREUR] erreur : disque utilisé à 95%\n[INFO]  Requête traitée en 42ms\n[AVERT]  Utilisation mémoire élevée');
    },
    validate({ command, output }) {
      return /^grep\s/.test(command.trim()) && output.toLowerCase().includes('erreur');
    }
  },
  {
    title: 'Trouver des fichiers',
    objective: `Utilisez <code>find</code> pour localiser des fichiers par nom n'importe où dans le système.\n\nTrouvez tous les fichiers <code>.log</code> à partir de votre répertoire personnel.`,
    hint: "Tapez : find . -name '*.log'",
    setup(fs) {
      fs.mkdir('/home/player/logs');
      fs.mkdir('/home/player/logs/anciens');
      fs.writeFile('/home/player/logs/app.log', 'Application démarrée\nTout OK');
      fs.writeFile('/home/player/logs/anciens/systeme.log', 'Journal système précédent');
      fs.writeFile('/home/player/config.txt', 'env=production');
    },
    validate({ command, output }) {
      return /^find\s/.test(command.trim()) && output.includes('.log');
    }
  },
  {
    title: 'Permissions des fichiers',
    objective: `Chaque fichier a des <em>permissions</em> : qui peut le lire, l'écrire ou l'exécuter.\n\nLe fichier <code>deployer.sh</code> doit être exécutable.\nUtilisez <code>chmod +x deployer.sh</code> pour ajouter la permission d'exécution.`,
    hint: 'Tapez : chmod +x deployer.sh\n(ou : chmod 755 deployer.sh)',
    setup(fs) {
      fs.writeFile('/home/player/deployer.sh', '#!/bin/bash\necho "Déploiement en cours..."\necho "Terminé !"');
      fs.get('/home/player/deployer.sh').permissions = 'rw-r--r--';
    },
    validate({ fs: vfs }) {
      const node = vfs.get('/home/player/deployer.sh');
      return node && node.permissions.charAt(2) === 'x';
    }
  },
  {
    title: 'La puissance des pipes',
    objective: `L'opérateur <code>|</code> (pipe) connecte des commandes :\nla sortie de la première devient l'entrée de la seconde.\n\nListez votre répertoire et envoyez vers <code>grep</code> pour n'afficher que les fichiers <code>.txt</code> :\n<code>ls | grep .txt</code>`,
    hint: 'Tapez : ls | grep .txt',
    setup(fs) {
      fs.writeFile('/home/player/notes.txt', 'mes notes');
      fs.writeFile('/home/player/todo.txt', 'ma liste de tâches');
      fs.writeFile('/home/player/deployer.sh', '#!/bin/bash');
      fs.mkdir('/home/player/projets');
    },
    validate({ command, output }) {
      return command.includes('|') && command.includes('grep') && output.includes('.txt');
    }
  }
];
