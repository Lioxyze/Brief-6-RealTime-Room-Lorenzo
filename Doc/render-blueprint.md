## Qu'est-ce que `render.yaml` ?

`render.yaml` est un fichier de configuration (blueprint) que Render (render.com) utilise pour créer et maintenir les services directement depuis le dépôt. Il permet de décrire :

- les services à déployer (web, api, workers, cron jobs),
- la façon de builder (commande, Dockerfile),
- la commande de démarrage,
- les variables d'environnement et les secrets,
- les paramètres d'auto‑déploiement / branche, health checks, plan, etc.

Placer `render.yaml` à la racine du repo permet à Render de détecter automatiquement la configuration lors d'un premier import ou d'un push.

## Exemple simple (API + WEB en Docker)

Ce qui suit est un exemple illustratif — adaptez les chemins/commands à votre repo.

```yaml
services:
	- type: service
		name: api-service
		env: docker
		dockerfilePath: api/Dockerfile
		branch: main
		autoDeploy: true
		healthCheckPath: /health

	- type: service
		name: web-frontend
		env: docker
		dockerfilePath: web/Dockerfile
		branch: main
		autoDeploy: true
		# si site statique, utiliser type: static and publishCommand

```

### Remarques sur cet exemple

- `env: docker` indique que Render doit builder via Dockerfile (ou image).
- `dockerfilePath` doit pointer vers le Dockerfile dans le repo.
- `healthCheckPath` aide Render à savoir si le service est prêt.
- `autoDeploy: true` active le déploiement automatique sur push.

## Adresse interne et communication web ↔ api

- Contrairement à `docker-compose`, Render ne propose pas de noms de services DNS internes que vous pouvez hardcoder localement.
- Pour que le frontend atteigne l'API, utilisez :
  - soit une URL publique fournie par Render (ex: `https://api-votreapp.onrender.com`) dans une variable d'env `VITE_API_URL` ou `REACT_APP_API_URL` ;
  - soit la toute‑petite fonctionnalité interne de Render (si vous avez besoin d'une adresse interne privée, consultez la doc Render pour `internal` networking selon votre plan).

En pratique :

- Déclarez une variable d'environnement côté `web` : `API_URL=https://api-votreapp.onrender.com` (ou utilisez le secret côté Render).
- Dans le code frontend, lisez `import.meta.env.VITE_API_URL` (Vite) ou `process.env.REACT_APP_API_URL` (CRA) — évitez d'encoder une URL en dur.

## Bonnes pratiques

- Ne stockez pas de secrets en clair dans `render.yaml` — utilisez les secrets/variables d'environnement du dashboard Render.
- Commitez `render.yaml` pour versionner l'infrastructure.
- Testez d'abord sur une branche de staging avant de mettre `autoDeploy: true` sur `main`.
- Ajoutez `healthCheckPath` et `startCommand` clairs pour éviter les deployments qui plantent.
- Pour socket/temps réel : si vous utilisez Socket.IO et plusieurs instances, configurez un adapter (Redis) et assurez‑vous que le load balancer de Render supporte WebSocket.

## Exemple de workflow rapide

1. Pousser votre branche `main` sur GitHub.
2. Dans Render → New → Blueprint → sélectionner le repo.
3. Render lit `render.yaml` et propose de créer les services.
4. Vérifier les variables d'environnement et secrets dans le dashboard.
5. Lancer le deploy et suivre les logs via l'interface Render.

---
