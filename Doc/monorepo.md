## Monorepo

- **Structure claire** (front/back dans un seul projet)
- **CI plus simple** (1 pipeline)
- **Déploiement Blueprint plus simple** (Render voit tout au même endroit)
- Possibilité de **mutualiser** des scripts (lint/build) à la racine

## PNPM : c’est quoi ?

PNPM est un gestionnaire de paquets (comme npm/yarn), mais plus efficace :

- Installe les dépendances une seule fois dans un store global
- Crée des liens (symlinks) dans les projets
- Résultat : **plus rapide**, **moins lourd**, **plus propre**

## Workspace PNPM

Fichier `pnpm-workspace.yaml` :

```yaml
packages:
  - "api"
  - "web"
```
