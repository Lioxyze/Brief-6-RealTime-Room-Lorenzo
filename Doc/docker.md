# 04 — Docker (fiche rapide)

## Objectif

Fournir une vue claire pour conteneuriser deux services :

- `api` : Node + Express + Socket.IO
- `web` : build Vite -> servie par Nginx

Cette fiche explique : concepts Docker simples, commandes usuelles, et détail pas à pas d'un `Dockerfile` (multi-stage pour `web`).

## Concepts rapides

- Image : snapshot exécutable d'un système contenant ton app.
- Container : instance en cours d'exécution d'une image.
- Dockerfile : recette pour construire une image.
- Multi-stage build : utiliser plusieurs étapes dans le Dockerfile pour produire une image finale légère (ex : builder -> runtime).

## Pourquoi multi-stage pour le front ?

- Le build (Vite) nécessite Node et toutes les dépendances dev.
- Le runtime (Nginx) n'a besoin que du dossier `dist` généré.
- Multi-stage : builder avec Node, copier seulement `dist` dans une image Nginx → image finale petite et sécurisée.

## Commandes utiles

```
# build image
docker build -t my-api:dev -f api/Dockerfile .
docker build -t my-web:dev -f web/Dockerfile .

# run containers
docker run --rm -p 3000:3000 my-api:dev
docker run --rm -p 8080:80 my-web:dev

# avec docker-compose (recommandé pour dev)
docker-compose up --build
```

## Exemple : détaillons `web/Dockerfile` (multi-stage)

Voici le `web/Dockerfile` utilisé dans ce repo (résumé) :

1. Stage builder

- Base : `node:20-alpine` pour construire rapidement.
- On active `corepack` et `pnpm` pour reproduire l'install.
- Copier `package.json` et `pnpm-lock.yaml` pour installer les dépendances.
- `pnpm -C web install --frozen-lockfile` installe en respectant le lockfile.
- `pnpm -C web build` produit `/app/web/dist`.

2. Stage runtime

- Base : `nginx:alpine` pour servir le contenu statique.
- Copier la conf Nginx (`web/nginx.conf`) dans `/etc/nginx/templates/default.conf.template`.
- Copier `dist` depuis l'étape builder vers `/usr/share/nginx/html`.
- Exposer le port `80` et lancer `nginx`.

Snippet (expliqué) :

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# activer corepack/pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# copier lockfiles pour installer fast (cacheable)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/package.json

# installer seulement pour le workspace web
RUN pnpm -C web install --frozen-lockfile
COPY web ./web

# builder le projet
RUN pnpm -C web build

FROM nginx:alpine
COPY web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Points à retenir sur ce Dockerfile :

- Placer les `COPY package.json` avant de copier tout le code permet de tirer parti du cache Docker lors des installations.
- `--frozen-lockfile` force l'usage du lockfile : reproducible builds.
- Copier uniquement `dist` dans l'image finale garde l'image légère et sans dépendances de build.

## Détail rapide de `api/Dockerfile`

- Base : `node:20-alpine`.
- On active `corepack` + `pnpm`.
- Copier les fichiers de lock et `api/package.json`, installer en prod (`pnpm -C api install --prod --frozen-lockfile`).
- Copier le code `api` et définir `CMD ["node","api/index.js"]`.
- Expose `3000`.

## Bonnes pratiques & conseils

- Versionnez vos `Dockerfile` et `docker-compose.yml` dans le repo.
- Utiliser `--no-cache` ou nettoyer le cache si tu suspectes des problèmes d'install.
- Respecte le lockfile (`--frozen-lockfile`) pour garantir que CI/Prod rebuilds produisent le même résultat.
- Définit les `ENV NODE_ENV=production` pour optimiser démarrage en prod.
- Eviter de stocker des secrets dans l'image ; passe les via variables d'environnement au `docker run` ou via le service (Render/Heroku/...) secrets.

## Tester localement

1. Build les images : `docker build -f web/Dockerfile -t my-web .` et `docker build -f api/Dockerfile -t my-api .`
2. Lancer les containers (ports exposés 80 → 8080 pour web, 3000 → 3000 pour api) :

```
docker run --rm -p 3000:3000 my-api
docker run --rm -p 8080:80 my-web
```

3. Ou utiliser `docker-compose up --build` pour orchestrer les deux et simplifier le flux de travail.

## Debugging & logs

- Voir les logs d'un container : `docker logs -f <container-id>`.
- Vérifier la sortie Nginx dans `/var/log/nginx/error.log` (dans l'image) si besoin.
- Pour remplacer dynamiquement `${API_URL}` dans `nginx.conf`, utiliser un entrypoint script qui fait `envsubst` au démarrage.

---

Si tu veux, je peux :

- Ajouter un exemple `docker-compose.yml` prêt pour dev pour ce repo, ou
- Générer un `entrypoint.sh` pour `web` qui remplace `${API_URL}` dans `nginx.conf` au runtime.
