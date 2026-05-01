# Linux Command Game

Un jeu en navigateur pour apprendre les commandes Linux de base. Aucune installation requise — ouvrez simplement un fichier dans votre navigateur.

## Lancer le jeu

Ouvrez `index.html` directement dans votre navigateur :

```
# Double-cliquez sur index.html, ou depuis le terminal :
xdg-open index.html        # Linux
open index.html            # macOS
start index.html           # Windows
```

Pas de serveur, pas de dépendances, pas d'étape de build.

## Comment jouer

Chaque niveau vous donne une **mission** dans le panneau en haut. Tapez vos commandes dans le terminal en bas et appuyez sur **Entrée** pour les exécuter.

- Cliquez sur **Voir l'indice** si vous êtes bloqué
- Utilisez les flèches **↑ / ↓** pour naviguer dans l'historique des commandes
- Appuyez sur **Tab** pour compléter automatiquement les noms de fichiers et répertoires
- Tapez `help` pour lister toutes les commandes disponibles
- Tapez `man <commande>` pour lire le manuel d'une commande (ex. `man ls`)

Réussissez la mission pour passer au niveau suivant.

## Niveaux

| # | Titre | Commande |
|---|-------|----------|
| 1 | Où suis-je ? | `pwd` |
| 2 | Regarder autour | `ls` |
| 3 | Fichiers cachés | `ls -a` |
| 4 | Détails des fichiers | `ls -l` |
| 5 | Naviguer ! | `cd` |
| 6 | Lire un fichier | `cat` |
| 7 | Créer un répertoire | `mkdir` |
| 8 | Créer un fichier | `touch` |
| 9 | Copier un fichier | `cp` |
| 10 | Déplacer et renommer | `mv` |
| 11 | Supprimer un fichier | `rm` |
| 12 | Chercher dans les fichiers | `grep` |
| 13 | Trouver des fichiers | `find` |
| 14 | Permissions des fichiers | `chmod` |
| 15 | La puissance des pipes | `\|` |

## Commandes disponibles

```
Navigation :    pwd, ls [-la], cd [rép]
Fichiers :      cat, touch, mkdir [-p], rm [-r], cp, mv
Recherche :     grep [-i] motif [fichier], find [chemin] [-name motif] [-type f/d]
Texte :         echo, head [-n], tail [-n], sort [-r], wc [-lwc]
Permissions :   chmod mode fichier
Pipes :         cmd1 | cmd2
Infos :         clear, help, man <cmd>, whoami, date, uname
```

Le système de fichiers est virtuel — aucun vrai fichier n'est créé ou supprimé sur votre machine.
