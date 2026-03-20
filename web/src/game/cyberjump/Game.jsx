import { useEffect, useRef, useState } from "react";
import "../../styles/components/cyberjump.scss";
import bgGif from "../../assets/cyberjump/Fond-Jeu-Video.gif";
import David from "../../assets/cyberjump/David.png";
import Lucy from "../../assets/cyberjump/Lucy.png";
import corpGif from "../../assets/cyberjump/LioCorp-20-03-2024.gif";
import { CONTROLLED_KEYS, PLAYER_KEYS, isPressed } from "./input.jsx";
import {
  createGameState,
  resetGameState,
  updateGameState,
  getGroundY,
} from "./gameState.jsx";
import { applyJumpCut } from "./player.jsx";
import { createParticleController } from "./particles.jsx";
import { createProjectileController } from "./projectiles.jsx";
import { createObstacleController } from "./obstacles.jsx";
import CyberJumpHud from "./Hud.jsx";
import CyberJumpMenu from "./Menu.jsx";
import CyberJumpRules from "./Rules.jsx";
import { buildHealthPanels } from "./health.jsx";
import useCyberJumpRoomSocket from "./useRoomSocket.jsx";

const AVATARS = {
  david: David,
  lucy: Lucy,
};

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;
const PLAYER_SPRITE_WIDTH = 60;
const REMOTE_LERP_SPEED = 14;

const SHOOT_COOLDOWN_MS = 120;
const PROJECTILE_SPEED = 1120;
const PARTICLE_TRAIL_MS = 42;

const PARTICLE_COLORS = {
  david: "rgba(66, 201, 255, 0.95)",
  lucy: "rgba(255, 77, 202, 0.95)",
};

const setLeft = (el, value) => {
  const field = el.parentElement;
  const scale = field ? field.clientWidth / WORLD_WIDTH : 1;
  el.style.left = `${Math.round(value * scale)}px`;
};

const setBottom = (el, value) => {
  const field = el.parentElement;
  const scale = field ? field.clientHeight / WORLD_HEIGHT : 1;
  el.style.bottom = `${Math.round(value * scale)}px`;
};

const getParticleColor = (currentAvatar) =>
  PARTICLE_COLORS[currentAvatar] || PARTICLE_COLORS.david;

// Composant principal du jeu .
// - initialiser et nettoyer le DOM du playfield
// - maintenir l'état de jeu dans des refs pour des mises à jour performantes
// - exécuter la boucle de jeu (tick) via requestAnimationFrame
// - connecter les handlers socket (projectiles, obstacles, état joueur)
export default function CyberJumpGame({ socket, room }) {
  const rootRef = useRef(null);
  const playfieldRef = useRef(null);
  const playerRef = useRef(null);
  const logoCorpRef = useRef(null);

  const rafRef = useRef(null);
  const scoreIntervalRef = useRef(null);
  const pressedRef = useRef(new Set());
  const jumpQueuedRef = useRef(false);
  const lastTrailAtRef = useRef(0);
  const lastFrameTimeRef = useRef(null);
  const startedRef = useRef(false);
  const pausedRef = useRef(false);
  const matchEndedRef = useRef(false);
  const lastShootAtRef = useRef(0);
  const gameStateRef = useRef(createGameState());

  const [menuOpen, setMenuOpen] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [avatar, setAvatar] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [localSide, setLocalSide] = useState("left");
  const [matchResult, setMatchResult] = useState("");
  const [healthSnapshot, setHealthSnapshot] = useState({});
  const localSideRef = useRef("left");
  const countdownIntervalRef = useRef(null);
  const remotePlayersRef = useRef(new Map());
  const remotePlayersDataRef = useRef(new Map());
  const [remotePlayersDataState, setRemotePlayersDataState] = useState({});

  const particleControllerRef = useRef(null);
  if (!particleControllerRef.current) {
    particleControllerRef.current = createParticleController({
      playfieldRef,
      setLeft,
      setBottom,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    });
  }

  function getTargetRemotePlayer() {
    for (const [id, data] of remotePlayersDataRef.current.entries()) {
      if (data) return { id, data };
    }
    return null;
  }

  const projectileControllerRef = useRef(null);
  if (!projectileControllerRef.current) {
    projectileControllerRef.current = createProjectileController({
      playfieldRef,
      setLeft,
      setBottom,
      worldWidth: WORLD_WIDTH,
      remotePlayersRef,
      getTargetRemotePlayer,
      onHitRemote: ({ socket, room, targetId }) => {
        socket?.emit("player:hit", { room, targetId });
      },
    });
  }

  const obstacleControllerRef = useRef(null);
  if (!obstacleControllerRef.current) {
    obstacleControllerRef.current = createObstacleController({
      playfieldRef,
      setLeft,
      setBottom,
      worldWidth: WORLD_WIDTH,
    });
  }

  const syncPlayerDom = () => {
    const playerEl = playerRef.current;
    const player = gameStateRef.current.player;

    if (!playerEl || !player) return;

    setLeft(playerEl, player.x);
    setBottom(playerEl, player.y);
    playerEl.style.transform =
      player.facing === -1 ? "scaleX(-1)" : "scaleX(1)";
  };

  const clearParticlesDom = () =>
    particleControllerRef.current.clearParticles();

  const createParticleBurst = (...args) =>
    particleControllerRef.current.burst(...args);

  const createTrailParticle = (...args) =>
    particleControllerRef.current.trail(...args);

  const updateParticlesDom = (dt) => particleControllerRef.current.update(dt);

  const unlockAudio = () => Promise.resolve();

  const playMusic = () => {};
  const playJumpSound = () => {};
  const playShootSound = () => {};

  const clearProjectilesDom = () =>
    projectileControllerRef.current.clearProjectiles();

  const spawnProjectile = (...args) =>
    projectileControllerRef.current.spawnProjectile(...args);

  const updateProjectilesDom = (dt) => {
    const playerEl = playerRef.current;
    const localRect = playerEl?.getBoundingClientRect() || null;

    projectileControllerRef.current.updateProjectiles(dt, {
      localRect,
      socket,
      room,
    });
  };

  const clearObstaclesDom = () =>
    obstacleControllerRef.current.clearObstacles();

  const spawnObstacle = (...args) =>
    obstacleControllerRef.current.spawnObstacle(...args);

  const updateObstaclesDom = (dt) =>
    obstacleControllerRef.current.updateObstacles(dt);

  const detectPlayerCollisions = () => {
    const playerEl = playerRef.current;
    if (!playerEl) return false;

    return obstacleControllerRef.current.hasPlayerCollision(
      playerEl.getBoundingClientRect(),
    );
  };

  const updateRemotePlayersDom = (dt) => {
    for (const [id, data] of remotePlayersDataRef.current.entries()) {
      const el = remotePlayersRef.current.get(id);
      if (!el) continue;

      const targetX = data.x ?? 0;
      const targetY = data.y ?? getGroundY(WORLD_HEIGHT);
      const currentX = data.currentX ?? targetX;
      const currentY = data.currentY ?? targetY;
      const alpha = Math.min(1, dt * REMOTE_LERP_SPEED);
      const nextX = currentX + (targetX - currentX) * alpha;
      const nextY = currentY + (targetY - currentY) * alpha;

      remotePlayersDataRef.current.set(id, {
        ...data,
        currentX: nextX,
        currentY: nextY,
      });

      setLeft(el, nextX);
      setBottom(el, nextY);

      if (data.facing != null) {
        el.style.transform = data.facing === -1 ? "scaleX(-1)" : "scaleX(1)";
      }
    }
  };

  const shootRobot = () => {
    if (
      !socket ||
      !startedRef.current ||
      pausedRef.current ||
      matchEndedRef.current
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastShootAtRef.current < SHOOT_COOLDOWN_MS) return;
    lastShootAtRef.current = now;

    const player = gameStateRef.current.player;
    if (!player) return;

    const direction = player.facing === -1 ? -1 : 1;
    const projectileId = `${socket.id}-${now}`;

    spawnProjectile({
      id: projectileId,
      ownerId: socket.id,
      x: player.x + (direction === 1 ? PLAYER_SPRITE_WIDTH - 4 : -18),
      y: player.y + 18,
      direction,
      speed: PROJECTILE_SPEED,
    });

    try {
      socket.emit("player:shoot", {
        room,
        x: player.x + (direction === 1 ? PLAYER_SPRITE_WIDTH - 4 : -18),
        y: player.y + 18,
        direction,
        speed: PROJECTILE_SPEED,
      });
    } catch (e) {}

    try {
      playShootSound();
    } catch (e) {}
  };

  const getOrCreateRemoteEl = (id, avatarName) => {
    let el = remotePlayersRef.current.get(id);
    if (el) return el;

    el = document.createElement("img");
    el.className = "cyberjump__character cyberjump__character--remote";
    el.src = AVATARS[avatarName] || AVATARS.david;

    if (avatarName == null) {
      el.classList.add("cyberjump__character--placeholder");
    }

    el.alt = "Joueur distant";
    el.style.position = "absolute";
    el.style.userSelect = "none";
    el.draggable = false;

    remotePlayersRef.current.set(id, el);
    playfieldRef.current?.appendChild(el);

    remotePlayersDataRef.current.set(id, { avatar: avatarName, ready: false });
    setRemotePlayersDataState(Object.fromEntries(remotePlayersDataRef.current));

    return el;
  };

  const removeRemoteEl = (id) => {
    const el = remotePlayersRef.current.get(id);
    if (el) {
      el.remove();
      remotePlayersRef.current.delete(id);
    }

    if (remotePlayersDataRef.current.has(id)) {
      remotePlayersDataRef.current.delete(id);
      setRemotePlayersDataState(
        Object.fromEntries(remotePlayersDataRef.current),
      );
    }
  };

  const clearEnemiesDom = () => {
    clearObstaclesDom();
  };

  const stopLoops = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (scoreIntervalRef.current) {
      clearInterval(scoreIntervalRef.current);
      scoreIntervalRef.current = null;
    }
  };

  const stopMusic = () => {
    // no-op (audio removed)
  };

  const resetPositions = () => {
    const field = playfieldRef.current;
    const logoEl = logoCorpRef.current;
    if (!field || !logoEl) return;

    gameStateRef.current = resetGameState(
      gameStateRef.current,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    );

    const player = gameStateRef.current.player;
    const side = localSideRef.current;
    const spawnX =
      side === "left"
        ? Math.round(WORLD_WIDTH * 0.12)
        : Math.round(WORLD_WIDTH * 0.78) - PLAYER_SPRITE_WIDTH;

    gameStateRef.current = {
      ...gameStateRef.current,
      player: {
        ...player,
        x: spawnX,
        y: getGroundY(WORLD_HEIGHT),
        vx: 0,
        vy: 0,
        facing: side === "left" ? 1 : -1,
        coyote: 0,
        jumpBuffer: 0,
        justJumped: false,
      },
    };

    syncPlayerDom();
    clearEnemiesDom();
    clearProjectilesDom();
    clearParticlesDom();

    logoEl.style.right = "10px";
    logoEl.style.bottom = "10px";
  };

  // Termine proprement une partie : notifie le serveur, annule timers
  // et réinitialise l'état/DOM local lié à la partie en cours.
  const endGame = () => {
    try {
      socket?.emit("game:ready", { ready: false, room });
    } catch (e) {}

    setIsReady(false);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    stopLoops();
    stopMusic();
    clearEnemiesDom();
    clearProjectilesDom();
    clearParticlesDom();

    startedRef.current = false;
    lastFrameTimeRef.current = null;
    pressedRef.current.clear();
    matchEndedRef.current = false;
    lastShootAtRef.current = 0;

    gameStateRef.current = {
      ...gameStateRef.current,
      started: false,
      score: 0,
      enemies: [],
    };

    setScore(0);
    setMenuOpen(true);
    setRulesOpen(false);
  };

  const startScoreLoop = () => {
    if (scoreIntervalRef.current) return;

    const incrementScore = () => {
      gameStateRef.current = {
        ...gameStateRef.current,
        score: gameStateRef.current.score + 1,
      };
      setScore(gameStateRef.current.score);
    };

    incrementScore();
    scoreIntervalRef.current = setInterval(incrementScore, 1000);
  };

  const handlePlayfieldPointerDown = (event) => {
    const target = event.target;
    if (target?.closest?.(".cyberjump__btn")) return;
    unlockAudio();
    shootRobot();
  };

  // Tick : fonction appelée par requestAnimationFrame pour mettre à
  // jour la simulation et le DOM. `now` est un timestamp fourni par RAF.
  const tick = (now) => {
    if (!startedRef.current) return;
    if (pausedRef.current) return;

    if (lastFrameTimeRef.current == null) {
      lastFrameTimeRef.current = now;
    }

    const dt = Math.min(0.05, (now - lastFrameTimeRef.current) / 1000);
    lastFrameTimeRef.current = now;

    const field = playfieldRef.current;
    const playerEl = playerRef.current;
    if (!field || !playerEl) return;

    const ground = getGroundY(WORLD_HEIGHT);
    const maxX = Math.max(0, WORLD_WIDTH - PLAYER_SPRITE_WIDTH);

    const input = {
      left: isPressed(pressedRef.current, PLAYER_KEYS.left),
      right: isPressed(pressedRef.current, PLAYER_KEYS.right),
      jump: jumpQueuedRef.current,
    };

    gameStateRef.current = updateGameState(gameStateRef.current, input, dt, {
      ground,
      maxX,
      fieldWidth: WORLD_WIDTH,
      fieldHeight: WORLD_HEIGHT,
    });

    if (gameStateRef.current.player.justJumped) {
      playJumpSound();

      const player = gameStateRef.current.player;
      const color = getParticleColor(avatar);
      const isDoubleJump = player.jumpsLeft === 0;

      createParticleBurst({
        x: player.x + PLAYER_SPRITE_WIDTH * 0.5,
        y: player.y + 16,
        color,
        count: isDoubleJump ? 12 : 7,
        spread: isDoubleJump ? 220 : 150,
        upward: isDoubleJump ? 460 : 300,
        size: isDoubleJump ? 7 : 5,
        life: isDoubleJump ? 0.55 : 0.38,
      });
    }

    if (
      Math.abs(gameStateRef.current.player.vx) > 120 &&
      Math.abs(gameStateRef.current.player.y - ground) < 2
    ) {
      const nowTrail = Date.now();

      if (nowTrail - lastTrailAtRef.current > PARTICLE_TRAIL_MS) {
        lastTrailAtRef.current = nowTrail;
        const player = gameStateRef.current.player;
        const color = getParticleColor(avatar);
        const direction = player.facing === -1 ? 1 : -1;

        createTrailParticle({
          x: player.x + (direction === 1 ? 12 : PLAYER_SPRITE_WIDTH - 12),
          y: player.y + 8,
          color,
          direction,
        });
      }
    }

    jumpQueuedRef.current = false;

    syncPlayerDom();
    updateRemotePlayersDom(dt);
    updateObstaclesDom(dt);
    updateProjectilesDom(dt);
    updateParticlesDom(dt);

    if (detectPlayerCollisions()) {
      try {
        socket?.emit("player:lost", { room });
      } catch (e) {
        endGame();
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const sendPlayerState = () => {
    if (!socket || !startedRef.current) return;

    try {
      const p = gameStateRef.current.player;

      socket.emit("player:state", {
        room,
        x: p.x,
        y: p.y,
        facing: p.facing,
        avatar,
      });
    } catch (e) {}
  };

  const pauseGame = () => {
    if (!startedRef.current) return;
    if (pausedRef.current) return;

    pausedRef.current = true;
    setPaused(true);
    stopLoops();
    try {
      stopMusic();
    } catch (e) {}
  };

  const resumeGame = () => {
    if (!startedRef.current) return;
    if (!pausedRef.current) return;

    pausedRef.current = false;
    setPaused(false);
    startScoreLoop();
    lastFrameTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    try {
      playMusic();
    } catch (e) {}
  };

  const togglePause = () => {
    if (!startedRef.current) return;
    if (pausedRef.current) resumeGame();
    else pauseGame();
  };

  // Démarre la boucle de jeu : réinitialise positions, démarre le
  // compteur de score et lance la boucle RAF (tick).
  const startGame = async () => {
    if (startedRef.current) return;

    startedRef.current = true;
    matchEndedRef.current = false;
    setMenuOpen(false);
    setRulesOpen(false);
    setMatchResult("");
    clearProjectilesDom();
    clearParticlesDom();
    lastTrailAtRef.current = 0;

    gameStateRef.current = {
      ...gameStateRef.current,
      started: true,
      score: 0,
    };

    setScore(0);
    resetPositions();
    startScoreLoop();

    lastFrameTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    try {
      await unlockAudio();
    } catch (e) {}
    playMusic();
  };

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  const handleKeyDown = (e) => {
    if (!startedRef.current) return;

    if (e.code === "Escape") {
      e.preventDefault();
      togglePause();
      return;
    }

    unlockAudio();

    if (CONTROLLED_KEYS.has(e.code)) {
      e.preventDefault();
    }

    if (PLAYER_KEYS.jump.includes(e.code) && !pressedRef.current.has(e.code)) {
      jumpQueuedRef.current = true;
    }

    pressedRef.current.add(e.code);
  };

  const handleKeyUp = (e) => {
    if (!startedRef.current) return;

    if (CONTROLLED_KEYS.has(e.code)) {
      e.preventDefault();
    }

    pressedRef.current.delete(e.code);

    if (PLAYER_KEYS.jump.includes(e.code)) {
      gameStateRef.current = {
        ...gameStateRef.current,
        player: applyJumpCut(gameStateRef.current.player),
      };
    }
  };

  // Hook socket : enregistre tous les handlers réseau nécessaires
  // (état joueurs, tirs, obstables, countdown, start/over...). Le
  // hook utilise les callbacks locaux (spawnProjectile, sendPlayerState...).
  useCyberJumpRoomSocket({
    socket,
    room,
    avatar,
    localSideRef,
    setLocalSide,
    remotePlayersRef,
    remotePlayersDataRef,
    setRemotePlayersDataState,
    getOrCreateRemoteEl,
    removeRemoteEl,
    spawnProjectile,
    spawnObstacle,
    countdownIntervalRef,
    setCountdown,
    setAvatar,
    setHealthSnapshot,
    sendPlayerState,
    startGame,
    endGame,
    matchEndedRef,
    setMatchResult,
  });

  useEffect(() => {
    resetPositions();

    const handleResize = () => {
      if (startedRef.current) {
        resetPositions();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      pressedRef.current.clear();

      try {
        socket?.emit("game:ready", { ready: false, room });
      } catch (e) {}

      setIsReady(false);
      setCountdown(null);
      endGame();

      remotePlayersRef.current.forEach((el) => el.remove());
      remotePlayersRef.current.clear();
    };
  }, []);

  return (
    <section
      className="cyberjump"
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onPointerDown={() => rootRef.current?.focus()}
      onBlur={() => pressedRef.current.clear()}
      style={{ "--cyberjump-bg": `url(${bgGif})` }}
      aria-label="CyberJump"
    >
      <CyberJumpMenu
        open={menuOpen}
        paused={paused}
        matchResult={matchResult}
        avatar={avatar}
        isReady={isReady}
        countdown={countdown}
        remotePlayersDataState={remotePlayersDataState}
        onStartReady={() => {
          if (!avatar) return;
          const next = !isReady;
          setIsReady(next);
          try {
            socket?.emit("game:ready", { ready: next, room });
          } catch (e) {}
        }}
        onReleaseAvatar={() => {
          setAvatar(null);
          setIsReady(false);
          try {
            socket?.emit("player:select", { avatar: null, room });
          } catch (e) {}
        }}
        onChooseAvatar={setAvatar}
        onOpenRules={() => setRulesOpen(true)}
        onQuit={endGame}
        onToggleFullscreen={toggleFullscreen}
        onResume={resumeGame}
      />

      <div
        className="cyberjump__playfield"
        ref={playfieldRef}
        onPointerDown={handlePlayfieldPointerDown}
      >
        <CyberJumpHud
          score={score}
          countdown={countdown}
          healthPanels={buildHealthPanels({
            socketId: socket?.id,
            localSide,
            localAvatar: avatar,
            playersHealth: healthSnapshot,
            remotePlayersDataState,
          })}
        />

        <img
          ref={playerRef}
          src={AVATARS[avatar] || AVATARS.david}
          alt="Personnage"
          className={`cyberjump__character ${avatar == null ? "cyberjump__character--placeholder" : ""}`}
          draggable={false}
        />

        <img
          ref={logoCorpRef}
          src={corpGif}
          alt="LioCorp"
          className="cyberjump__corp"
          draggable={false}
        />
      </div>

      <CyberJumpRules open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </section>
  );
}
