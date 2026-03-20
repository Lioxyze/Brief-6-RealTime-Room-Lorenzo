import { clamp } from "./helpers.jsx";
import { createPlayer, resetPlayer, updatePlayer } from "./player.jsx";

// Calcule la position du sol (en pixels) en fonction de la hauteur du playfield.
// On garantit une valeur raisonnable entre 70 px et `fieldHeight - 90`.
export function getGroundY(fieldHeight) {
  return clamp(
    Math.round(fieldHeight * 0.22),
    70,
    Math.max(70, fieldHeight - 90),
  );
}

// État global minimal du jeu : démarré/non, score, joueur local et ennemis.
export function createGameState() {
  return {
    started: false,
    score: 0,
    player: createPlayer(),
    enemies: [],
  };
}

// Réinitialise l'état de jeu pour une nouvelle partie ou après un resize.
// Recalcule la position du joueur via `resetPlayer` en fonction du terrain.
export function resetGameState(state, fieldWidth, fieldHeight) {
  const ground = getGroundY(fieldHeight);

  return {
    ...state,
    score: 0,
    enemies: [],
    player: resetPlayer(state.player, fieldWidth, ground),
  };
}

// Met à jour l'état du jeu pour un pas de simulation `dt`.
// Pour l'instant on met à jour uniquement le joueur et on réinitialise
// la liste des ennemis (leur update est gérée ailleurs).
export function updateGameState(state, input, dt, world) {
  let next = { ...state };

  next.player = updatePlayer(next.player, input, dt, {
    ground: world.ground,
    maxX: world.maxX,
  });

  next.enemies = [];

  return next;
}
