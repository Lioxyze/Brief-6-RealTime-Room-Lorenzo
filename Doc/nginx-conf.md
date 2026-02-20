# nginx.conf

Ce document explique simplement `nginx.conf` : rôle, sections importantes, et exemples pratiques (reverse proxy, WebSocket / Socket.IO, bonnes pratiques). Le but est d'avoir une fiche réutilisable, indépendante du projet.

## Rôle de `nginx.conf`

- Nginx est un serveur HTTP performant utilisé pour servir des fichiers statiques, faire du reverse-proxy vers une API, gérer la mise en cache et agir comme load balancer.
- Le fichier `nginx.conf` décrit le comportement du serveur : ports à écouter, racines (`root`), `location` (routage), en-têtes, et règles de proxy.

## Structure minimale

- `server { ... }` : contient la configuration d'un hôte virtuel (listen, server_name, root).
- `location /path/ { ... }` : règle pour un chemin précis (serve static, proxy_pass, try_files).

## Exemples clés

1. Servir une application SPA (Vite / React) :

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- `try_files $uri $uri/ /index.html;` permet aux routes côté client (SPA) de fonctionner : si le fichier demandé n'existe pas, renvoyer `index.html`.

2. Reverse-proxy vers une API (ex: `API_URL` fourni par build/env) :

```nginx
location /api/ {
  proxy_pass ${API_URL}/;    # API_URL remplacé au build / runtime
  proxy_http_version 1.1;

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

- `proxy_pass` redirige les requêtes vers le backend. Sur Render ou autres PaaS, utilisez l'URL publique ou la variable d'environnement fournie.

3. Support WebSocket / Socket.IO

WebSocket nécessite des headers `Upgrade`/`Connection`. Pour Socket.IO, qui peut utiliser WebSocket, ajoutez une location dédiée :

```nginx
location /socket.io/ {
  proxy_pass ${API_URL}/socket.io/;
  proxy_http_version 1.1;

  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

- Important : `proxy_http_version 1.1;` et `Upgrade`/`Connection` sont nécessaires pour permettre la montée de protocole.

## Variables et build-time replacement

- Dans des images Docker on remplace souvent `${API_URL}` par une variable d'environnement lors du build ou du démarrage (ou on injecte via un template). Sur Render, préférez définir `API_URL` dans les env vars du service `web`.

## Sécurité & performance (petits conseils)

- Ajouter headers de sécurité (ex: `add_header X-Frame-Options "SAMEORIGIN";`, `X-Content-Type-Options nosniff`).
- Activer gzip pour compresser les assets :

```nginx
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
```

- Configurer `client_max_body_size` si vous acceptez des uploads (ex: `client_max_body_size 10M;`).

## Déploiement et debug

- Tester localement avec `docker build` et `docker run` si vous utilisez Dockerfile.
- Vérifier les logs Nginx (`error.log`, `access.log`) pour diagnostiquer problèmes de proxy ou de websocket.

Commandes utiles :

```bash
# vérifier config syntax
nginx -t -c /etc/nginx/nginx.conf

# recharger la configuration sans arrêter
nginx -s reload
```
