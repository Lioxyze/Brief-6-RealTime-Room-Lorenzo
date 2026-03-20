// Constantes de configuration du moteur : physique, timings et volumes.
// Modifier ces valeurs influence directement la sensation de jeu.
export const CONFIG = {
  GRAVITY: 2600,
  RUN_ACCEL: 4200,
  RUN_FRICTION: 5200,
  MAX_RUN_SPEED: 720,
  JUMP_VELOCITY: 980,
  COYOTE_TIME: 0.09,
  JUMP_BUFFER: 0.11,
  JUMP_CUT: 0.55,

  ENEMY_BASE_SPAWN_MS: 1050,
  ENEMY_MIN_SPAWN_MS: 300,
  ENEMY_BASE_SPEED: 440,
  ENEMY_SPEED_PER_SCORE: 6,
  ENEMY_SPAWN_REDUCTION_PER_SCORE: 14,

  MASTER_VOLUME: 0.03,
};
