// Module d'entrée : définit les touches contrôlées par le jeu et
// fournit des helpers pour tester les touches pressées.
// `CONTROLLED_KEYS` : ensemble de codes clavier gérés par le jeu
export const CONTROLLED_KEYS = new Set([
  "KeyQ",
  "KeyA",
  "KeyD",
  "KeyZ",
  "KeyW",
  "Space",
]);

// Regroupement logique des touches pour les actions du joueur.
export const PLAYER_KEYS = {
  left: ["KeyQ", "KeyA"],
  right: ["KeyD"],
  jump: ["Space", "KeyZ", "KeyW"],
};

// Helper : retourne true si l'une des `codes` est présente dans le set `pressedKeys`.
export const isPressed = (pressedKeys, codes) =>
  codes.some((code) => pressedKeys.has(code));
