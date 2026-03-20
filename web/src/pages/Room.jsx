import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Button from "../components/ui/Button.jsx";
import CyberJumpEmbed from "../components/room/CyberJumpEmbed.jsx";
import "../styles/pages/room.scss";

export default function Room({ pseudo, room, onLeave }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);

  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const API_URL =
      import.meta.env.VITE_API_URL ||
      "https://realtime-room-api-2l1i.onrender.com";

    const socket = io(API_URL, {
      transports: ["polling", "websocket"],
      path: "/socket.io/",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    setSocket(socket);

    setIsConnecting(true);

    const join = () => {
      socket.emit("join", { pseudo, room });
    };

    const handleMessage = (msg) => {
      setMessages((m) => [...m, msg]);
    };

    const handleConnect = () => {
      join();
      setIsConnecting(false);
    };

    const handleJoinRejected = ({ reason }) => {
      if (reason === "room_full") {
        try {
          alert("La room est pleine — redirection vers l'accueil.");
        } catch (e) {}
        // trigger the same flow as Leave
        onLeave();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("player:join:rejected", handleJoinRejected);
    socket.on("message", handleMessage);
    socket.on("disconnect", () => setIsConnecting(true));
    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
      setIsConnecting(true);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("player:join:rejected", handleJoinRejected);
      socket.off("message", handleMessage);
      socket.off("disconnect");
      socket.off("connect_error");

      try {
        socket.emit("leave", { pseudo, room });
      } catch (e) {}

      socket.disconnect();
    };
  }, [pseudo, room]);

  const scrollToBottom = (behavior = "smooth") => {
    const el = messagesRef?.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch (e) {
      el.scrollTop = el.scrollHeight;
    }
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const threshold = 60;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  };

  useEffect(() => {
    const el = messagesRef?.current;
    if (!el) return;
    setTimeout(() => {
      if (isAtBottom || messages.length === 1) {
        scrollToBottom("auto");
        setUnreadCount(0);
      } else {
        setUnreadCount((c) => c + 1);
      }
    }, 0);
  }, [messages, isAtBottom]);

  const send = () => {
    const value = text.trim();
    if (!value) return;

    socketRef.current?.emit("send", { text: value, room });
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <section className="room">
      <header className="room__top">
        <div className="room__meta">
          <div className="room__name">#{room}</div>
          <div className="room__user">{pseudo}</div>
        </div>

        <div className="room__top-actions">
          <Button variant="ghost" size="small" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </header>

      <div className="room__grid">
        <aside className="room__game-column">
          <div className="room__side-card">
            <div className="room__side-title">CyberJump</div>
            <CyberJumpEmbed socket={socket} pseudo={pseudo} room={room} />
          </div>
        </aside>

        <div className="room__main">
          <div className="room__side-card room__info-card">
            <div className="room__side-title">Room Info</div>
            <div className="room__side-text">
              Room unique #<strong>{room}</strong> en temps réel
            </div>
          </div>

          <div
            ref={messagesRef}
            onScroll={handleScroll}
            className="room__messages"
          >
            {isConnecting && (
              <div className="room__loader" role="status" aria-live="polite">
                <div className="room__spinner" />
                <div className="room__loader-text">Connexion…</div>
              </div>
            )}

            <div className="room__messages-inner">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`msg ${m.user === pseudo ? "msg--me" : ""} ${
                    m.type === "system" ? "msg--system" : ""
                  }`}
                >
                  {m.type !== "system" && (
                    <div className="msg__user">{m.user}</div>
                  )}
                  <div className="msg__bubble">{m.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="room__composer">
            <input
              className="room__input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Écris un message…"
              onKeyDown={handleKeyDown}
            />
            <button
              className="room__send"
              onClick={send}
              disabled={!text.trim()}
              title="Envoyer (Entrée)"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
