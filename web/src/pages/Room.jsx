import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Button from "../components/ui/Button.jsx";
import "../styles/pages/room.scss";

export default function Room({ pseudo, room, onLeave }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const socketRef = useRef(null);

  useEffect(() => {
    
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      path: "/socket.io/", // ✅ Ajoute ça
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    const join = () => {
      socket.emit("join", { pseudo, room });
    };

    const handleMessage = (msg) => {
      setMessages((m) => [...m, msg]);
    };

    socket.on("connect", join);
    socket.on("message", handleMessage);

    return () => {
      socket.off("connect", join);
      socket.off("message", handleMessage);

      try {
        socket.emit("leave", { pseudo, room });
      } catch (e) {}

      socket.disconnect();
    };
  }, [pseudo, room]);

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
        <div className="room__messages">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`msg ${m.user === pseudo ? "msg--me" : ""} ${
                m.type === "system" ? "msg--system" : ""
              }`}
            >
              {m.type !== "system" && <div className="msg__user">{m.user}</div>}
              <div className="msg__bubble">{m.text}</div>
            </div>
          ))}
        </div>

        <aside className="room__side">
          <div className="room__side-card">
            <div className="room__side-title">Room Info</div>
            <div className="room__side-text">
              Room unique #<strong>{room}</strong> en temps réel
            </div>
          </div>
        </aside>

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
    </section>
  );
}