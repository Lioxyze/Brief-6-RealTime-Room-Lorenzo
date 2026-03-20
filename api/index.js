const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

const clients = new Map();
const roomPlayers = new Map();
const roomReady = new Map();
const roomSides = new Map();
const roomCountdowns = new Map();
const roomObstacleTimers = new Map();
const roomEnded = new Map();
const roomHealth = new Map();
const roomShields = new Map();
const roomShieldCooldowns = new Map();

const cleanRoom = (room) =>
  String(room || "lobby")
    .trim()
    .replace(/^#/, "")
    .slice(0, 30) || "lobby";

const cleanPseudo = (pseudo) =>
  String(pseudo || "")
    .trim()
    .slice(0, 20);

const getRoomMap = (store, room) => {
  if (!store.has(room)) store.set(room, new Map());
  return store.get(room);
};

const getPlayers = (room) => getRoomMap(roomPlayers, room);
const getReadyMap = (room) => getRoomMap(roomReady, room);
const getSides = (room) => getRoomMap(roomSides, room);
const getHealthMap = (room) => getRoomMap(roomHealth, room);
const getShieldMap = (room) => getRoomMap(roomShields, room);
const getShieldCooldownMap = (room) => getRoomMap(roomShieldCooldowns, room);

const initRoomIfMissing = (room) => {
  if (!roomPlayers.has(room)) {
    roomPlayers.set(room, new Map());
  }
  if (!roomReady.has(room)) {
    roomReady.set(room, new Map());
  }
  if (!roomSides.has(room)) {
    roomSides.set(room, new Map());
  }
  if (!roomHealth.has(room)) {
    roomHealth.set(room, new Map());
  }
  if (!roomShields.has(room)) {
    roomShields.set(room, new Map());
  }
  if (!roomShieldCooldowns.has(room)) {
    roomShieldCooldowns.set(room, new Map());
  }
};

const removeClientFromRoom = (room, socketId, pseudo) => {
  const players = roomPlayers.get(room);
  const readyMap = roomReady.get(room);
  const sides = roomSides.get(room);
  const healthMap = roomHealth.get(room);

  players?.delete(socketId);
  readyMap?.delete(socketId);
  sides?.delete(socketId);
  healthMap?.delete(socketId);

  if (players?.size === 0) roomPlayers.delete(room);
  if (readyMap?.size === 0) roomReady.delete(room);
  if (sides?.size === 0) roomSides.delete(room);
  if (healthMap?.size === 0) roomHealth.delete(room);

  cancelCountdown(room);
  stopObstacleTimer(room);
  roomEnded.delete(room);

  emitSystemMessage(room, `${pseudo} a quitté #${room}`);
  io.to(room).emit("player:left", { id: socketId });
  emitRoomList();
};

const DEFAULT_HEALTH = 100;
const HEALTH_DAMAGE = 10;
const SHIELD_DURATION_MS = 3000;
const SHIELD_COOLDOWN_MS = 10000;

const normalizeHealthValue = (value, maxHealth) => {
  const safeMax = Math.max(1, maxHealth || DEFAULT_HEALTH);
  const safeValue = Math.max(0, value ?? DEFAULT_HEALTH);

  if (safeMax >= DEFAULT_HEALTH) {
    return {
      health: Math.min(DEFAULT_HEALTH, safeValue),
      maxHealth: safeMax,
    };
  }

  const ratio = safeValue / safeMax;

  return {
    health: Math.round(Math.max(0, Math.min(1, ratio)) * DEFAULT_HEALTH),
    maxHealth: DEFAULT_HEALTH,
  };
};

const ensureHealth = (room, id, overrides = {}) => {
  const healthMap = getHealthMap(room);
  const current = healthMap.get(id) || {
    health: DEFAULT_HEALTH,
    maxHealth: DEFAULT_HEALTH,
    avatar: null,
    side: null,
    pseudo: null,
  };

  const next = {
    ...current,
    ...overrides,
  };

  const normalized = normalizeHealthValue(next.health, next.maxHealth);
  next.maxHealth = normalized.maxHealth;
  next.health = normalized.health;

  healthMap.set(id, next);
  return next;
};

const emitHealthState = (room) => {
  io.to(room).emit("game:health", {
    players: [...getHealthMap(room).entries()].map(([id, state]) => ({
      id,
      ...state,
    })),
  });
};

const resetRoomHealth = (room) => {
  for (const [id, state] of getHealthMap(room).entries()) {
    getHealthMap(room).set(id, {
      ...state,
      health: DEFAULT_HEALTH,
      maxHealth: DEFAULT_HEALTH,
    });
  }
};

const setShield = (room, id, durationMs = 3000) => {
  const map = getShieldMap(room);
  const until = Date.now() + Math.max(0, durationMs);
  map.set(id, until);
  io.to(room).emit("player:shield", { id, until });

  // schedule clear
  setTimeout(() => {
    const current = map.get(id) || 0;
    if (current <= Date.now()) {
      map.delete(id);
      io.to(room).emit("player:shield:cleared", { id });
    }
  }, durationMs + 50);
};

const hasActiveShield = (room, id) => {
  const map = getShieldMap(room);
  const until = map.get(id) || 0;
  return until > Date.now();
};

const canUseShield = (room, id, cooldownMs = SHIELD_COOLDOWN_MS) => {
  const map = getShieldCooldownMap(room);
  const last = map.get(id) || 0;
  return Date.now() - last >= cooldownMs;
};

const setShieldUsed = (room, id) => {
  const map = getShieldCooldownMap(room);
  map.set(id, Date.now());
};

const applyDamage = (room, id, amount = HEALTH_DAMAGE) => {
  const current = ensureHealth(room, id);
  return ensureHealth(room, id, {
    ...current,
    health: Math.max(0, current.health - Math.max(1, amount)),
  });
};

const removeHealth = (room, id) => {
  getHealthMap(room).delete(id);
};

const emitSystemMessage = (room, text) => {
  io.to(room).emit("message", {
    id: Date.now(),
    user: "system",
    text,
    type: "system",
  });
};

const emitRoomList = () => {
  const list = [...roomPlayers.entries()].map(([room, players]) => ({
    room,
    count: players.size,
    full: players.size >= 2,
  }));
  io.emit("room:list", list);
};

const getRoomOpponentId = (room, socketId) => {
  for (const id of getPlayers(room).keys()) {
    if (id !== socketId) return id;
  }
  return null;
};

const stopObstacleTimer = (room) => {
  const timer = roomObstacleTimers.get(room);
  if (!timer) return;
  clearInterval(timer);
  roomObstacleTimers.delete(room);
};

const startObstacleTimer = (room) => {
  stopObstacleTimer(room);

  const types = ["runner", "flyer", "enemy1", "enemy2"];
  const width = 1280;
  const height = 720;
  const ground = Math.round(height * 0.22);

  const timer = setInterval(
    () => {
      const type = types[Math.floor(Math.random() * types.length)];
      const direction = Math.random() < 0.5 ? -1 : 1;
      const speed = 220 + Math.round(Math.random() * 180);
      const y =
        type === "flyer"
          ? ground + 110 + Math.round(Math.random() * 60)
          : ground;

      io.to(room).emit("obstacle:spawn", {
        id: `obstacle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        x: direction === 1 ? -100 : width + 100,
        y,
        direction,
        speed,
      });
    },
    1800 + Math.round(Math.random() * 1200),
  );

  roomObstacleTimers.set(room, timer);
};

const finishGame = (room, winnerId, loserId) => {
  if (roomEnded.get(room)) return;
  roomEnded.set(room, true);
  stopObstacleTimer(room);
  io.to(room).emit("game:over", { winnerId, loserId });
};

const cancelCountdown = (room) => {
  const timer = roomCountdowns.get(room);
  if (!timer) return;
  clearTimeout(timer);
  roomCountdowns.delete(room);
  io.to(room).emit("game:countdown:canceled");
};

const maybeStartCountdown = (room) => {
  const players = getPlayers(room);
  const readyMap = getReadyMap(room);

  if (players.size < 2) {
    cancelCountdown(room);
    return;
  }

  const allReady = [...players.entries()].every(
    ([id, avatar]) => avatar != null && readyMap.get(id),
  );

  if (!allReady) {
    cancelCountdown(room);
    return;
  }

  roomEnded.delete(room);
  if (roomCountdowns.has(room)) return;

  resetRoomHealth(room);
  emitHealthState(room);

  const seconds = 10;
  const startAt = Date.now() + 200;

  io.to(room).emit("game:countdown", { seconds, startAt });

  const timer = setTimeout(
    () => {
      io.to(room).emit("game:start");
      roomCountdowns.delete(room);
      startObstacleTimer(room);
    },
    seconds * 1000 + 200,
  );

  roomCountdowns.set(room, timer);
};

io.on("connection", (socket) => {
  console.log("✅ connected:", socket.id);

  socket.onAny((event, payload) => {
    console.log("📩 event:", event, payload);
  });

  socket.emit("connected", { ok: true });
  socket.emit(
    "room:list",
    [...roomPlayers.entries()].map(([room, players]) => ({
      room,
      count: players.size,
      full: players.size >= 2,
    })),
  );

  socket.on("join", ({ pseudo, room }) => {
    const p = cleanPseudo(pseudo);
    const r = cleanRoom(room);
    if (p.length < 2) return;

    const players = getPlayers(r);
    const readyMap = getReadyMap(r);
    const sides = getSides(r);

    if (players.size >= 2) {
      return socket.emit("player:join:rejected", { reason: "room_full" });
    }

    clients.set(socket.id, { pseudo: p, room: r });
    socket.join(r);

    players.set(socket.id, null);
    readyMap.set(socket.id, false);

    const side = players.size <= 1 ? "right" : "left";
    sides.set(socket.id, side);
    socket.emit("player:slot", { side });

    ensureHealth(r, socket.id, {
      avatar: null,
      side,
      pseudo: p,
    });

    const existing = [...players.entries()]
      .filter(([id]) => id !== socket.id)
      .map(([id, avatar]) => {
        const info = clients.get(id) || {};
        return {
          id,
          avatar,
          pseudo: info.pseudo || null,
          ready: readyMap.get(id) || false,
          side: sides.get(id) || "left",
          ...(getHealthMap(r).get(id) || {
            health: DEFAULT_HEALTH,
            maxHealth: DEFAULT_HEALTH,
          }),
        };
      });

    socket.emit("player:list", existing);

    socket.to(r).emit("player:joined", {
      id: socket.id,
      avatar: null,
      pseudo: p,
      ready: false,
      side,
      health: DEFAULT_HEALTH,
      maxHealth: DEFAULT_HEALTH,
    });

    emitSystemMessage(r, `${p} a rejoint #${r}`);
    emitHealthState(r);
    emitRoomList();
  });

  socket.on("create:room", ({ name } = {}) => {
    const provided = String(name || "").trim();
    const room = provided
      ? cleanRoom(provided)
      : cleanRoom(`r-${Math.random().toString(36).slice(2, 8)}`);

    if (provided && roomPlayers.has(room)) {
      return socket.emit("room:create:rejected", { reason: "exists", room });
    }

    // Ensure internal maps exist for this room
    initRoomIfMissing(room);

    emitRoomList();
    socket.emit("room:created", { room });
  });

  socket.on("player:select", ({ avatar, room }) => {
    const info = clients.get(socket.id);
    if (!info) {
      return socket.emit("player:select:rejected", { reason: "not_joined" });
    }

    const r = cleanRoom(room || info.room);
    const players = getPlayers(r);

    if (avatar != null) {
      for (const [id, selectedAvatar] of players.entries()) {
        if (selectedAvatar === avatar && id !== socket.id) {
          return socket.emit("player:select:rejected", { reason: "taken" });
        }
      }
    }

    players.set(socket.id, avatar);
    ensureHealth(r, socket.id, {
      avatar,
      side: getSides(r).get(socket.id) || "left",
      pseudo: info.pseudo || null,
    });
    socket.emit("player:select:accepted", { avatar });

    io.to(r).emit("player:joined", {
      id: socket.id,
      avatar,
      pseudo: info.pseudo || null,
      ready: getReadyMap(r).get(socket.id) || false,
      side: getSides(r).get(socket.id) || "left",
      ...(getHealthMap(r).get(socket.id) || {
        health: DEFAULT_HEALTH,
        maxHealth: DEFAULT_HEALTH,
      }),
    });

    emitHealthState(r);
  });

  socket.on("game:ready", ({ ready, room }) => {
    const info = clients.get(socket.id);
    if (!info) return;

    const r = cleanRoom(room || info.room);
    getReadyMap(r).set(socket.id, !!ready);

    io.to(r).emit("game:ready:status", {
      id: socket.id,
      ready: !!ready,
    });

    maybeStartCountdown(r);
  });

  socket.on("player:shoot", ({ room, x, y, direction, speed }) => {
    const info = clients.get(socket.id);
    if (!info) return;

    const r = cleanRoom(room || info.room);
    io.to(r).emit("player:shoot", {
      id: socket.id,
      x,
      y,
      direction,
      speed,
    });
  });

  socket.on("player:hit", ({ room, targetId }) => {
    const info = clients.get(socket.id);
    if (!info) return;

    const r = cleanRoom(room || info.room);
    if (!targetId) return;

    // If target has an active shield, ignore the hit
    if (hasActiveShield(r, targetId)) {
      // notify attacker and room that hit was blocked
      socket.emit("player:hit:blocked", { targetId });
      io.to(r).emit("player:shielded", { id: targetId });
      return;
    }

    const target = applyDamage(r, targetId);
    emitHealthState(r);

    if (target.health <= 0) {
      finishGame(r, socket.id, targetId);
    }
  });

  socket.on("player:lost", ({ room }) => {
    const info = clients.get(socket.id);
    if (!info) return;

    const r = cleanRoom(room || info.room);
    ensureHealth(r, socket.id, { health: 0 });
    emitHealthState(r);
    finishGame(r, getRoomOpponentId(r, socket.id), socket.id);
  });

  socket.on("player:state", (payload) => {
    const info = clients.get(socket.id);
    if (!info) return;

    const r = cleanRoom(payload.room || info.room);
    socket.to(r).emit("player:state", { id: socket.id, ...payload });
  });

  socket.on("send", ({ text, room }) => {
    const info = clients.get(socket.id);
    if (!info) return;

    const r = cleanRoom(room || info.room);
    const msg = String(text || "")
      .trim()
      .slice(0, 500);
    if (!msg) return;

    io.to(r).emit("message", {
      id: Date.now(),
      user: info.pseudo,
      text: msg,
      type: "message",
    });
  });

  socket.on("disconnect", () => {
    const info = clients.get(socket.id);
    if (!info) return;

    const { pseudo, room } = info;
    clients.delete(socket.id);
    removeClientFromRoom(room, socket.id, pseudo);
  });

  socket.on("leave", ({ room }) => {
    const info = clients.get(socket.id);
    if (!info) return;
    const { pseudo } = info;
    clients.delete(socket.id);
    removeClientFromRoom(room, socket.id, pseudo);
  });

  socket.on("player:shield", ({ room, durationMs } = {}) => {
    const info = clients.get(socket.id);
    if (!info) return;
    const r = cleanRoom(room || info.room);
    // limit duration to reasonable bounds
    const dur = Math.min(
      SHIELD_DURATION_MS * 3,
      Math.max(500, Number(durationMs) || SHIELD_DURATION_MS),
    );
    // enforce cooldown
    const COOLDOWN_MS = SHIELD_COOLDOWN_MS;
    if (!canUseShield(r, socket.id, COOLDOWN_MS)) {
      const map = getShieldCooldownMap(r);
      const last = map.get(socket.id) || 0;
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - last));
      socket.emit("player:shield:denied", { remaining });
      return;
    }

    setShield(r, socket.id, dur);
    setShieldUsed(r, socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("API up on", PORT));
