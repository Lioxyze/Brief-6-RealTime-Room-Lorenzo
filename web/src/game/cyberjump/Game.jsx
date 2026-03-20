import { useEffect, useRef, useState } from "react";
import "../../styles/components/cyberjump.scss";
import bgGif from "../../assets/cyberjump/Fond-Jeu-Video.gif";
import paysageGif from "../../assets/cyberjump/paysage.gif";
import David from "../../assets/cyberjump/David.png";
import Lucy from "../../assets/cyberjump/Lucy.png";
import corpGif from "../../assets/cyberjump/LioCorp-20-03-2024.gif";
import { CONTROLLED_KEYS, PLAYER_KEYS, isPressed } from "./input.jsx";
import bgMusic from "../../assets/cyberjump/music-8bit.mp3";
import tirSound from "../../assets/cyberjump/tirson.mp3";
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

// Shoot cooldown (default and fast mode used at match start)
const DEFAULT_SHOOT_COOLDOWN_MS = 300;
const FAST_SHOOT_COOLDOWN_MS = 120;
// Projectile speed (tuned) — increased slightly for better feel
const PROJECTILE_SPEED = 320;
const PARTICLE_TRAIL_MS = 42;

const PARTICLE_COLORS = {
  david: "rgba(66, 201, 255, 0.95)",
  lucy: "rgba(255, 77, 202, 0.95)",
};

// Background will change at start/end of each match

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
  const shootCooldownRef = useRef(DEFAULT_SHOOT_COOLDOWN_MS);
  const [currentBg, setCurrentBg] = useState(bgGif);
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

  const remotePlayersReady = Object.values(remotePlayersDataState || {}).filter(
    Boolean,
  );
  const controlsLocked =
    countdown != null ||
    (isReady &&
      remotePlayersReady.length > 0 &&
      remotePlayersReady.every((player) => player.ready));

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
    // shield visual
    if (player.shielded) playerEl.classList.add("cyberjump__character--shield");
    else playerEl.classList.remove("cyberjump__character--shield");
  };

  const clearParticlesDom = () =>
    particleControllerRef.current.clearParticles();

  const createParticleBurst = (...args) =>
    particleControllerRef.current.burst(...args);

  const createTrailParticle = (...args) =>
    particleControllerRef.current.trail(...args);

  const updateParticlesDom = (dt) => particleControllerRef.current.update(dt);

  const audioCtxRef = useRef(null);
  const bgAudioRef = useRef(null);
  const shootAudioRef = useRef(null);

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }
    return audioCtxRef.current;
  };

  const unlockAudio = async () => {
    try {
      const ctx = ensureAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
    } catch (e) {}
    // prepare background audio element
    try {
      if (!bgAudioRef.current) {
        const a = new Audio(bgMusic);
        a.loop = true;
        a.volume = 0.04;
        bgAudioRef.current = a;
      }
      if (!shootAudioRef.current) {
        const s = new Audio(tirSound);
        s.preload = "auto";
        s.volume = 0.7;
        shootAudioRef.current = s;
      }
      if (bgAudioRef.current.paused) {
        try {
          await bgAudioRef.current.play();
        } catch (e) {
          // some browsers require user gesture; ignore
        }
      }
    } catch (e) {}
  };

  const playMusic = async () => {
    try {
      await unlockAudio();
    } catch (e) {}
  };

  const makeBeep = (freq = 440, type = "sine", len = 0.12, vol = 0.08) => {
    const ctx = ensureAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    o.start(now);
    o.stop(now + len + 0.02);
  };

  const playJumpSound = () => makeBeep(880, "sine", 0.12, 0.18);
  const playShootSound = () => {
    try {
      if (shootAudioRef.current) {
        const a = shootAudioRef.current.cloneNode();
        a.volume = 0.7;
        a.play().catch(() => {});
        return;
      }
    } catch (e) {}
    return makeBeep(720, "triangle", 0.08, 0.28);
  };
  const playHitSound = () => makeBeep(220, "square", 0.12, 0.28);
  const playStartSound = () => makeBeep(1200, "sine", 0.2, 0.18);
  const playOverSound = () => makeBeep(160, "sine", 0.4, 0.14);
  // Shield sounds reuse the same audio context/helpers above

  const playShieldActivateSound = () => {
    const ctx = ensureAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 900;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.start(now);
    o.stop(now + 0.25);
  };

  const playShieldDeniedSound = () => {
    const ctx = ensureAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 220;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    o.start(now);
    o.stop(now + 0.14);
  };

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

  // Shield state & cooldown for local player
  const shieldUntilRef = useRef(0);
  const lastShieldUsedRef = useRef(0);
  const SHIELD_COOLDOWN_MS = 10000;
  const SHIELD_DURATION_MS = 3000;

  const canActivateLocalShield = () =>
    Date.now() - lastShieldUsedRef.current >= SHIELD_COOLDOWN_MS;

  const activateLocalShield = (ms = SHIELD_DURATION_MS) => {
    if (!canActivateLocalShield()) return false;
    const now = Date.now();
    shieldUntilRef.current = now + ms;
    lastShieldUsedRef.current = now;
    try {
      socket?.emit("player:shield", { room, durationMs: ms });
    } catch (e) {}
    const player = gameStateRef.current.player;
    if (player) player.shielded = true;
    const playerEl = playerRef.current;
    if (playerEl) playerEl.classList.add("cyberjump__character--shield");
    // HUD active visual and sound
    try {
      playShieldActivateSound();
    } catch (e) {}
    const hud = playfieldRef.current?.querySelector(".cyberjump__ability-hud");
    if (hud) {
      hud.classList.add("cyberjump__ability-hud--active");
      setTimeout(
        () => hud.classList.remove("cyberjump__ability-hud--active"),
        ms + 80,
      );
    }
    setTimeout(() => {
      if (Date.now() >= shieldUntilRef.current) {
        const p = gameStateRef.current.player;
        if (p) p.shielded = false;
        const el = playerRef.current;
        if (el) el.classList.remove("cyberjump__character--shield");
      }
    }, ms + 50);
    return true;
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
    if (now - lastShootAtRef.current < shootCooldownRef.current) return;
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
    // restore default (slower) shoot cooldown when match ends
    try {
      shootCooldownRef.current = DEFAULT_SHOOT_COOLDOWN_MS;
    } catch (e) {}
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
    // right click -> shield, left click -> shoot
    if (event.button === 2) {
      // activate shield 3s (right click). If on cooldown, briefly flash HUD.
      const ok = activateLocalShield(SHIELD_DURATION_MS);
      if (!ok) {
        // flash HUD by toggling a class
        const hud = playfieldRef.current?.querySelector(
          ".cyberjump__ability-hud",
        );
        if (hud) {
          hud.classList.add("cyberjump__ability-hud--flash");
          setTimeout(
            () => hud.classList.remove("cyberjump__ability-hud--flash"),
            350,
          );
        }
      }
      return;
    }
    unlockAudio();
    shootRobot();
  };

  // prevent context menu on playfield (right click used for shield)
  useEffect(() => {
    const field = playfieldRef.current;
    if (!field) return;
    const onContext = (e) => e.preventDefault();
    field.addEventListener("contextmenu", onContext);
    return () => field.removeEventListener("contextmenu", onContext);
  }, []);

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
    // change background at start of match
    try {
      setCurrentBg((c) => (c === bgGif ? paysageGif : bgGif));
    } catch (e) {}
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
    // temporarily allow faster firing at match start
    try {
      shootCooldownRef.current = FAST_SHOOT_COOLDOWN_MS;
    } catch (e) {}
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

  // Listen for shield events from server (remote players)
  useEffect(() => {
    if (!socket) return;
    const onShield = ({ id, until }) => {
      const el = remotePlayersRef.current.get(id);
      if (el) el.classList.add("cyberjump__character--shield");
      // clear after expiry
      const delay = Math.max(0, (until || 0) - Date.now());
      setTimeout(() => {
        const e = remotePlayersRef.current.get(id);
        if (e) e.classList.remove("cyberjump__character--shield");
      }, delay + 50);
    };

    const onShieldCleared = ({ id }) => {
      const el = remotePlayersRef.current.get(id);
      if (el) el.classList.remove("cyberjump__character--shield");
    };

    socket.on("player:shield", onShield);
    socket.on("player:shield:cleared", onShieldCleared);

    const onShieldDenied = ({ remaining }) => {
      try {
        playShieldDeniedSound();
      } catch (e) {}
      const hud = playfieldRef.current?.querySelector(
        ".cyberjump__ability-hud",
      );
      if (hud) {
        hud.classList.add("cyberjump__ability-hud--flash");
        setTimeout(
          () => hud.classList.remove("cyberjump__ability-hud--flash"),
          350,
        );
      }
    };

    socket.on("player:shield:denied", onShieldDenied);

    return () => {
      socket.off("player:shield", onShield);
      socket.off("player:shield:cleared", onShieldCleared);
      socket.off("player:shield:denied", onShieldDenied);
    };
  }, [socket]);

  // Shield cooldown HUD state update
  const [, forceRerender] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => forceRerender((v) => v + 1), 200);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    resetPositions();

    // background will be switched at match boundaries (start/end)

    const handleResize = () => {
      if (startedRef.current) {
        resetPositions();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // no periodic bg interval to clear
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
      style={{ "--cyberjump-bg": `url(${currentBg})` }}
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
        controlsLocked={controlsLocked}
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
        {/* Ability HUD (shield) */}
        <div className="cyberjump__ability-hud" aria-hidden={false}>
          <div className="cyberjump__ability-hud-row">
            <div className="cyberjump__ability-hud-label">Bouclier</div>
            <div className="cyberjump__ability-hud-bar">
              {(() => {
                const now = Date.now();
                const last = lastShieldUsedRef.current || 0;
                const cooldown = SHIELD_COOLDOWN_MS;
                const remaining = Math.max(0, cooldown - (now - last));
                const pct = Math.round((1 - remaining / cooldown) * 100);
                return (
                  <>
                    <div
                      className="cyberjump__ability-hud-fill"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="cyberjump__ability-hud-txt">
                      {remaining > 0 ? `${Math.ceil(remaining / 1000)}s` : "OK"}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
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
