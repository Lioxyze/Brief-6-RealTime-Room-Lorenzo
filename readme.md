# Brief-6-RealTime-Room-Lorenzo

Courte démo d'une application de chat temps réel avec rooms dynamiques.

## Démo

- (Si démo en ligne) Lien : <mettre le lien ici>

## Stack

- Frontend : React
- Backend : Express
- Temps réel : Socket.IO

## Architecture

Séparation frontend / backend. Le frontend (dossier `web`) consomme une API temps réel exposée par le backend (dossier `api`).

## Installation

1. Installer les dépendances :

```
pnpm install
```

2. Lancer les services en développement (depuis la racine ou dans les dossiers) :

```
pnpm dev
```

Pour lancer uniquement le backend : lancez `pnpm dev` dans le dossier `api`.
Pour lancer uniquement le frontend : lancez `pnpm dev` dans le dossier `web`.

## Scripts utiles

- `pnpm dev` : démarre l'environnement de développement
- `pnpm build` : génère la build de production
- `pnpm lint` : lance linsing (si configuré)

## Workflow Git

Utiliser des commits conventionnels : `type(scope): message`

Exemple :

```
"feat: add room system "
```

## Fonctionnalités

- Chat en temps réel
- Rooms dynamiques (création/rejoindre)
- Synchronisation des participants et messages

## Contribution

Forker le repo, créer une branche feature, ouvrir une pull request.
