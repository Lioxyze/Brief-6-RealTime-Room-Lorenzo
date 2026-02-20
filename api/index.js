const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (req, res) => res.json({ ok: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

const clients = new Map(); // socket.id -> { pseudo, room }

const cleanRoom = (room) =>
  String(room || "lobby")
    .trim()
    .replace(/^#/, "")
    .slice(0, 30) || "lobby";

const cleanPseudo = (pseudo) =>
  String(pseudo || "")
    .trim()
    .slice(0, 20);

io.on("connection", (socket) => {
  console.log("✅ connected:", socket.id);

  // DEBUG: log tout ce que le serveur reçoit
  socket.onAny((event, payload) => {
    console.log("📩 event:", event, payload);
  });

  socket.emit("connected", { ok: true });

  socket.on("join", ({ pseudo, room }) => {
    const p = cleanPseudo(pseudo);
    const r = cleanRoom(room);

    if (p.length < 2) return;

    clients.set(socket.id, { pseudo: p, room: r });
    socket.join(r);

    const sysMsg = {
      id: Date.now(),
      user: "system",
      text: `${p} a rejoint #${r}`,
      type: "system",
    };

    // ✅ envoie à tous (y compris toi)
    io.to(r).emit("message", sysMsg);
  });

  socket.on("send", ({ text, room }) => {
    const info = clients.get(socket.id);
    if (!info) return;

    const r = cleanRoom(room || info.room);
    const msg = String(text || "").trim().slice(0, 500);
    if (!msg) return;

    const payload = {
      id: Date.now(),
      user: info.pseudo,
      text: msg,
      type: "message",
    };

    // ✅ envoie à tous (y compris toi)
    io.to(r).emit("message", payload);
  });

  socket.on("disconnect", () => {
    const info = clients.get(socket.id);
    if (!info) return;

    clients.delete(socket.id);

    const sysMsg = {
      id: Date.now(),
      user: "system",
      text: `${info.pseudo} a quitté #${info.room}`,
      type: "system",
    };

    io.to(info.room).emit("message", sysMsg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("API up on", PORT));