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

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`
Server running on port ${PORT}

            /\\_/\\
           (  o   o  )
           (   =^=   )
           (           )
           (            )
           (             ))
          (__(__)___(__)__)

API ready at back : http://localhost:${PORT}/health
API ready at front : http://localhost:8080/

`),
);
