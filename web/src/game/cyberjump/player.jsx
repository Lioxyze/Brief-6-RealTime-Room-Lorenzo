import { CONFIG } from "./config.jsx";
import { clamp } from "./helpers.jsx";

// Module de la logique du joueur : création, réinitialisation et mise à jour
// physique simple (accélération, friction, saut, gravité).
export function createPlayer() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    coyote: 0,
    jumpBuffer: 0,
    facing: 1,
    justJumped: false,
    jumpsLeft: 2,
  };
}

// Place le joueur sur le terrain lors d'un reset (nouvelle partie ou resize).
export function resetPlayer(player, fieldWidth, ground) {
  return {
    ...player,
    x: Math.round(fieldWidth * 0.62),
    y: ground,
    vx: 0,
    vy: 0,
    coyote: 0,
    jumpBuffer: 0,
    facing: 1,
    justJumped: false,
    jumpsLeft: 2,
  };
}

// Update physique du joueur pour un pas `dt`.
// Gère : input (left/right/jump), accélération, friction, coyote time,
// buffers de saut, gravité, clamp des positions, et limite de vitesse.
export function updatePlayer(player, input, dt, world) {
  const next = { ...player };
  const { ground, maxX } = world;

  next.justJumped = false;

  next.jumpBuffer = input.jump
    ? CONFIG.JUMP_BUFFER
    : Math.max(0, next.jumpBuffer - dt);

  const onGround = next.y <= ground + 0.1;
  next.coyote = onGround ? CONFIG.COYOTE_TIME : Math.max(0, next.coyote - dt);
  if (onGround) {
    next.jumpsLeft = 2;
  }

  if (input.left !== input.right) {
    const direction = input.right ? 1 : -1;
    next.facing = direction;
    next.vx += direction * CONFIG.RUN_ACCEL * dt;
  } else {
    if (next.vx > 0) {
      next.vx = Math.max(0, next.vx - CONFIG.RUN_FRICTION * dt);
    } else if (next.vx < 0) {
      next.vx = Math.min(0, next.vx + CONFIG.RUN_FRICTION * dt);
    }
  }

  next.vx = clamp(next.vx, -CONFIG.MAX_RUN_SPEED, CONFIG.MAX_RUN_SPEED);

  if (next.jumpBuffer > 0 && (next.coyote > 0 || next.jumpsLeft > 0)) {
    next.jumpBuffer = 0;
    next.coyote = 0;
    next.vy = CONFIG.JUMP_VELOCITY;
    next.justJumped = true;
    next.jumpsLeft = Math.max(0, next.jumpsLeft - 1);
  }

  next.vy -= CONFIG.GRAVITY * dt;
  next.x = clamp(next.x + next.vx * dt, 0, maxX);
  next.y += next.vy * dt;

  if (next.y < ground) {
    next.y = ground;
    next.vy = Math.max(0, next.vy);
  }

  return next;
}

// Coupe la vélocité verticale pour produire un effet de saut arrêté
// lorsque le joueur relâche la touche de saut (jump cut).
export function applyJumpCut(player) {
  return player.vy > 0
    ? {
        ...player,
        vy: player.vy * CONFIG.JUMP_CUT,
      }
    : player;
}
