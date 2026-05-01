const LEVELS = [
  {
    title: 'Où suis-je ?',
    objective: `Vous venez de vous connecter à un serveur Linux. Avant tout, trouvez <em>où vous êtes</em> dans le système de fichiers.\n\nAfficher le répertoire courant.`,
    hint: 'Il existe une commande dédiée à ça.',
    setup(fs) {},
    validate({ command }) {
      return command.trim() === 'pwd';
    }
  },
  {
    title: 'Regarder autour',
    objective: `Vous savez où vous êtes. Voyons maintenant ce qu'il y a <em>dans</em> ce répertoire.\n\nListez les fichiers et dossiers présents ici.`,
    hint: 'Une seule lettre suffit pour cette commande.',
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
    objective: `Sous Linux, les fichiers commençant par <code>.</code> sont <em>cachés</em> et n'apparaissent pas dans un listing normal.\n\nUn fichier secret se cache ici — trouvez comment l'afficher.`,
    hint: 'ls possède une option pour afficher <em>tous</em> les fichiers.',
    setup(fs) {
      fs.writeFile('/home/player/.secret', 'motdepasse=linux4ever');
      fs.writeFile('/home/player/.bashrc', '# config du shell\nexport PS1="\\u@\\h:\\w$ "');
    },
    validate({ command }) {
      const parts = command.trim().split(/\s+/);
      return parts[0] === 'ls' && parts.some(p => p.startsWith('-') && p.includes('a'));
    }
  },
  {
    title: 'Détails des fichiers',
    objective: `Un simple <code>ls</code> ne montre que les noms.\n\nAffichez les détails complets : permissions, propriétaire, taille de chaque fichier.`,
    hint: 'ls a une option pour le format long.',
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
    objective: `Vous savez lister des fichiers, mais vous êtes toujours au même endroit.\n\nEntrez dans le dossier <code>documents</code>.\n\nAstuce : <code>..</code> désigne le répertoire parent.`,
    hint: 'Change Directory — cherchez l\'abréviation.',
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
    objective: `Il y a un fichier <code>notes.txt</code> dans votre dossier <code>documents</code>.\n\nNaviguez-y si besoin, puis affichez son contenu dans le terminal.`,
    hint: 'Cette commande s\'appelle comme un animal qui miaule.',
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
    objective: `Créez un dossier appelé <code>projets</code> dans votre répertoire personnel.\n\nSi vous n'y êtes plus, retournez-y d'abord avec <code>cd ~</code>.`,
    hint: 'make directory → pensez à l\'abréviation.',
    setup(fs) {},
    validate({ fs: vfs }) {
      return vfs.isDir('/home/player/projets');
    }
  },
  {
    title: 'Créer un fichier',
    objective: `Créez un fichier vide appelé <code>todo.txt</code> dans votre répertoire personnel.\n\nCette commande ne modifie pas le contenu — elle crée juste le fichier.`,
    hint: 'Pensez à effleurer... en anglais.',
    setup(fs) {},
    validate({ fs: vfs }) {
      return vfs.isFile('/home/player/todo.txt');
    }
  },
  {
    title: 'Copier un fichier',
    objective: `Faites une sauvegarde de <code>donnees.txt</code> en le copiant sous le nom <code>donnees_backup.txt</code>.\n\nLes deux fichiers doivent exister à la fin.`,
    hint: 'cp prend deux arguments : source puis destination.',
    setup(fs) {
      fs.writeFile('/home/player/donnees.txt', 'Données importantes\nNe pas perdre !');
    },
    validate({ fs: vfs }) {
      return vfs.isFile('/home/player/donnees_backup.txt') && vfs.isFile('/home/player/donnees.txt');
    }
  },
  {
    title: 'Déplacer et renommer',
    objective: `<code>mv</code> déplace des fichiers, mais utilisé dans le même dossier il <em>renomme</em>.\n\nRenommez <code>brouillon.txt</code> en <code>final.txt</code>.`,
    hint: 'mv source destination — source et destination dans le même dossier = renommage.',
    setup(fs) {
      fs.writeFile('/home/player/brouillon.txt', 'Voici mon brouillon.');
    },
    validate({ fs: vfs }) {
      return vfs.isFile('/home/player/final.txt') && !vfs.isFile('/home/player/brouillon.txt');
    }
  },
  {
    title: 'Supprimer un fichier',
    objective: `Supprimez <code>corbeille.txt</code>.\n\n⚠️ Sous Linux, il n'y a pas de corbeille. La suppression est définitive.`,
    hint: 'remove → rm. Soyez prudent.',
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
    objective: `Le fichier <code>serveur.log</code> contient plusieurs lignes.\nTrouvez uniquement la ligne contenant le mot <code>erreur</code>.\n\nSans grep, vous seriez obligé de tout lire.`,
    hint: 'grep motif fichier — le motif est une expression à rechercher.',
    setup(fs) {
      fs.writeFile('/home/player/serveur.log', '[INFO]  Serveur démarré sur le port 8080\n[INFO]  Connecté à la base de données\n[ERREUR] erreur : disque utilisé à 95%\n[INFO]  Requête traitée en 42ms\n[AVERT]  Utilisation mémoire élevée');
    },
    validate({ command, output }) {
      return /^grep\s/.test(command.trim()) && output.toLowerCase().includes('erreur');
    }
  },
  {
    title: 'Trouver des fichiers',
    objective: `Des fichiers <code>.log</code> sont éparpillés dans plusieurs sous-dossiers.\nTrouvez-les tous en une seule commande, à partir de votre répertoire courant.`,
    hint: 'find parcourt l\'arborescence. Essayez avec -name et un joker *.',
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
    objective: `Chaque fichier a des <em>permissions</em> : qui peut le lire (<code>r</code>), l'écrire (<code>w</code>), ou l'exécuter (<code>x</code>).\n\nLe fichier <code>deployer.sh</code> n'est pas exécutable. Ajoutez-lui ce droit.`,
    hint: 'chmod modifie les permissions. Les opérateurs + et - ajoutent ou retirent des droits.',
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
    objective: `L'opérateur <code>|</code> connecte deux commandes : la sortie de la première devient l'entrée de la seconde.\n\nListez votre répertoire et filtrez le résultat pour n'afficher que les fichiers <code>.txt</code>.`,
    hint: 'Combinez ls et grep avec le symbole |.',
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
