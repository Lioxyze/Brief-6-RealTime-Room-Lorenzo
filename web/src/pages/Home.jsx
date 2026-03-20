import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import Field from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import "../styles/pages/home.scss";

export default function Home({ onJoin }) {
  const [pseudo, setPseudo] = useState("");
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState([]);
  const socketRef = useRef(null);
  const pseudoRef = useRef("");

  const canUsePseudo = useMemo(() => {
    const p = pseudo.trim();
    return p.length >= 2 && p.length <= 20;
  }, [pseudo]);

  const canUseRoomName = useMemo(() => {
    const r = roomName.trim();
    return r.length >= 2 && r.length <= 30;
  }, [roomName]);

  useEffect(() => {
    pseudoRef.current = pseudo.trim();
  }, [pseudo]);

  const validatePseudo = () => {
    const p = pseudo.trim();

    if (p.length < 2) return "Le pseudo doit contenir au moins 2 caractères";
    if (p.length > 20) return "Le pseudo ne peut pas dépasser 20 caractères";

    return "";
  };

  const validateRoomName = () => {
    const r = roomName.trim();

    if (r.length < 2)
      return "Le nom de la room doit contenir au moins 2 caractères";
    if (r.length > 30)
      return "Le nom de la room ne peut pas dépasser 30 caractères";

    return "";
  };

  const joinRoom = (targetRoom) => {
    const pseudoError = validatePseudo();
    if (pseudoError) return setError(pseudoError);

    setError("");
    onJoin({ pseudo: pseudo.trim(), room: targetRoom });
  };

  const createRoom = () => {
    const pseudoError = validatePseudo();
    if (pseudoError) return setError(pseudoError);

    const roomError = validateRoomName();
    if (roomError) return setError(roomError);

    setError("");
    socketRef.current?.emit("create:room", { name: roomName.trim() });
  };

  useEffect(() => {
    const API_URL =
      import.meta.env.VITE_API_URL ||
      "https://realtime-room-api-2l1i.onrender.com";
    const socket = io(API_URL, {
      transports: ["polling", "websocket"],
      path: "/socket.io/",
      reconnection: false,
    });

    socketRef.current = socket;

    const handleRoomList = (list) => {
      setRooms(list || []);
    };

    const handleRoomCreated = ({ room: newRoom }) => {
      onJoin({ pseudo: pseudoRef.current, room: newRoom });
    };

    const handleRoomCreateRejected = ({ reason, room: rejectedRoom }) => {
      if (reason === "exists") {
        setError(`La room #${rejectedRoom} existe déjà`);
      }
    };

    socket.on("room:list", handleRoomList);
    socket.on("room:created", handleRoomCreated);
    socket.on("room:create:rejected", handleRoomCreateRejected);
    socket.on("connect", () => socket.emit("ping"));

    return () => {
      socket.off("room:list", handleRoomList);
      socket.off("room:created", handleRoomCreated);
      socket.off("room:create:rejected", handleRoomCreateRejected);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [onJoin]);

  return (
    <section className="home">
      <div className="home__grid">
        <div className="home__main">
          <div className="home__hero">
            <h1 className="home__title">CyberJump</h1>
            <p className="home__desc">
              Choisis ton pseudo et rejoins la communauté.
            </p>

            <div className="home__chips">
              <span className="home__chip">Instant</span>
              <span className="home__chip">Live</span>
              <span className="home__chip">Connected</span>
            </div>
          </div>

          <div className="home__card">
            <div className="home__card-head">
              <div className="home__card-title">Connexion</div>
              <div className="home__card-sub">Crée ou rejoins une room</div>
            </div>

            <div className="home__form">
              <Field
                label="Pseudo"
                name="pseudo"
                value={pseudo}
                onChange={setPseudo}
                placeholder="Pseudo (2–20 caractères)"
                autoFocus
                error={error || null}
              />

              <Field
                label="Nom de room"
                name="roomName"
                value={roomName}
                onChange={setRoomName}
                placeholder="Ex: arena-1"
                error={null}
              />

              <div className="home__actions">
                <Button
                  disabled={!canUsePseudo || !canUseRoomName}
                  onClick={createRoom}
                  fullWidth
                >
                  Créer la room
                </Button>
              </div>
            </div>

            <div className="home__rooms">
              <div className="home__rooms-title">Rooms</div>
              <div className="home__rooms-list">
                {rooms.length === 0 && (
                  <div className="home__rooms-empty">
                    Aucune room pour le moment
                  </div>
                )}
                {rooms.map((r) => (
                  <div key={r.room} className="home__rooms-item">
                    <div className="home__rooms-meta">
                      <div className="home__rooms-name">#{r.room}</div>
                      <div className="home__rooms-count">{r.count} / 2</div>
                    </div>
                    <div className="home__rooms-actions">
                      <Button
                        variant={r.full ? "ghost" : "primary"}
                        size="small"
                        onClick={() => joinRoom(r.room)}
                        disabled={r.full}
                      >
                        {r.full ? "Pleine" : "Rejoindre"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="home__sidebar">
          <div className="home__video-section">
            <div className="home__video-head">
              <div className="home__video-title">Présentation</div>
            </div>

            <div className="home__video-frame">
              <iframe
                width="1905"
                height="748"
                src="https://www.youtube.com/embed/CELqNBjpdms?list=RDCELqNBjpdms"
                title="Persona 3 Reload OST | Color Your Night [Extended]"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              ></iframe>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
