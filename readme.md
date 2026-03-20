# CyberJump — Brief 6

Petit jeu multijoueur local (Socket.IO) développé en React + Node.js.

## Structure

- `api/` : serveur Node.js + Socket.IO (point d'entrée : `api/index.js`).
- `web/` : client React (Vite). Contient le jeu `CyberJump`.

## Prérequis

- Node.js (>=18 recommandé)
- pnpm (le workspace utilise `pnpm`)

## Installation

Depuis la racine du repo :

```bash
pnpm install
pnpm -w install
```

## Lancer en dev

1. Démarrer l'API :

```bash
cd api
pnpm dev
```

2. Démarrer le client :

```bash
cd web
pnpm dev
```

Ouvrir le site (Vite) affiché dans la console (généralement http://localhost:5173).

## Démo en ligne

Le jeu est déployé sur : https://realtime-room-web.onrender.com/

## Tests

Le client utilise `vitest`. Pour lancer les tests :

```bash
cd web
pnpm test
# ou pour exécuter en une passe
pnpm run test:run
```

Remarque : je peux exécuter et corriger les tests si vous me donnez l'autorisation d'exécuter les commandes dans votre environnement.

## Changements récents / points importants

- Santé du joueur gérée en pourcentage (0–100).
- Dégâts des projectiles ajustés (~10% par hit).
- Vitesse des projectiles réglée (valeur paramétrée dans `web/src/game/cyberjump/Game.jsx`).
- Cooldown de tir dynamique : mode rapide en début de partie et mode lent hors partie.
- Bouclier activable (clic droit) : 3s d'activation, 10s de cooldown (server + client).
- HUD de capacité ajouté, avec visuel et sons (`music-8bit.mp3`, `tirson.mp3`).
- Le fond du niveau change à chaque début de partie (entre `Fond-Jeu-Video.gif` et `paysage.gif`).
- Obstacles désactivés côté client (no-op) sur demande.

## Où regarder

- `web/src/game/cyberjump/Game.jsx` — logique de jeu, sons, HUD, toggle de fond, cooldowns.
- `web/src/game/cyberjump/projectiles.jsx` — gestion des projectiles.
- `api/index.js` — logique serveur (vie, dégâts, bouclier).

## Prochaines étapes suggérées

- Lancer la suite de tests (`pnpm test`) et corriger les erreurs éventuelles.
- Commit / push des changements locaux.
- Ajustements d'équilibrage (vitesse, dégâts, durée bouclier).

Si vous voulez, je peux :

- Exécuter et corriger les tests maintenant.
- Créer les commits et fournir les commandes Git.
- Ajouter un bouton dans le menu pour forcer le changement de fond.

Dites-moi ce que vous préférez que je fasse en priorité.
