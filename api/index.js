const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
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

// ✅ MODIFICATION ICI
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:8080",
      "https://realtime-room-web.onrender.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const ROOM = "lobby";
const usersBySocket = new Map();

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });

  socket.on("join", ({ pseudo }) => {
    const p = String(pseudo || "")
      .trim()
      .slice(0, 20);
    if (p.length < 2) return;

    usersBySocket.set(socket.id, p);
    socket.join(ROOM);

    io.to(ROOM).emit("message", {
      id: Date.now(),
      user: "system",
      text: `${p} a rejoint #${ROOM}`,
      type: "system",
    });
  });

  socket.on("send", ({ text }) => {
    const user = usersBySocket.get(socket.id);
    if (!user) return;

    const msg = String(text || "")
      .trim()
      .slice(0, 500);
    if (!msg) return;

    io.to(ROOM).emit("message", {
      id: Date.now(),
      user,
      text: msg,
      type: "message",
    });
  });

  socket.on("disconnect", () => {
    const user = usersBySocket.get(socket.id);
    if (!user) return;

    usersBySocket.delete(socket.id);

    io.to(ROOM).emit("message", {
      id: Date.now(),
      user: "system",
      text: `${user} a quitté #${ROOM}`,
      type: "system",
    });
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API health : http://localhost:${PORT}/health`);
  console.log(`Frontend : http://localhost:8080/`);
});