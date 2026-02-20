# pnpm

## Objectif

- Donner un résumé pratique pour utiliser `pnpm` dans un projet (mono)repo.
- Commandes essentielles, bonnes pratiques, et pièges courants.

## Pourquoi `pnpm` ?

- Installation très rapide grâce au store global et au linking.
- Déduplication garantie et lockfile fiable (`pnpm-lock.yaml`).
- Bon pour les monorepos via `pnpm-workspace.yaml`.

## Installation

```bash
# installer pnpm (global)
corepack enable                # recommandé (Node 16.14+), active pnpm fourni
pnpm add -g pnpm               # ou npm i -g pnpm
```

## Commandes essentielles

- `pnpm install` : installe les dépendances.
- `pnpm add <pkg>` : ajoute une dépendance (ajoute en prod par défaut).
- `pnpm add -D <pkg>` : ajoute en devDependencies.
- `pnpm remove <pkg>` : supprime une dépendance.
- `pnpm exec <cmd>` ou `pnpm dlx <tool>` : exécute une commande dans le contexte du projet.
- `pnpm run <script>` : lance un script défini dans `package.json`.

## Monorepo (pnpm workspace)

- Créer `pnpm-workspace.yaml` à la racine :

```yaml
packages:
  - "packages/**"
  - "apps/**"
  - "web"
```

- `pnpm` installe les dépendances au niveau workspace, crée des liens entre packages locaux et maximise le partage du store.
- Utiliser `pnpm -w add <pkg>` pour ajouter au workspace root.

## Node modules & layout

- `pnpm` utilise un store global dans `~/.pnpm-store` et crée `node_modules/.pnpm` avec des liens.
- Les paquets sont hard-linked, ce qui économise de l’espace disque.

## Lockfile

- `pnpm-lock.yaml` garantit des installs reproductibles. Commettez-le.

## CI / cache

- Cacher `~/.pnpm-store` ou `node_modules/.pnpm` selon l’infra CI.
- Exemple GitHub Actions step : cache `~/.pnpm-store/v3` (ou `~/.pnpm-store` selon version).

## Tips rapides

- Pour forcer une réinstallation propre : `pnpm install --frozen-lockfile` ou `pnpm install --force`.
- Si conflits : supprimer `node_modules` et `pnpm-lock.yaml` puis `pnpm install` (dernier recours).
- Utiliser `pnpm -r` (recursive) pour exécuter dans tous les packages du workspace : `pnpm -r run build`.
- Pour exécuter dans un package spécifique : `pnpm --filter <pkg> run dev`.

## Intégration avec Vite / React

- `pnpm` fonctionne bien avec Vite. Assurez-vous que `node` et `pnpm` sont installés sur CI.
- Si problème de résolution, utiliser `pnpm install --shamefully-hoist` (dégradé, évitez si possible).

## Problèmes fréquents

- Modules non trouvés : vérifier `filters` et l’emplacement du package dans le workspace.
- Versions multiples : vérifier `pnpm-lock.yaml` et forcer version si nécessaire.

## Commandes utiles (recap)

```bash
pnpm install
pnpm add react
pnpm add -D vite
pnpm -w add -D eslint
pnpm -r run build
pnpm --filter web dev
```

---
