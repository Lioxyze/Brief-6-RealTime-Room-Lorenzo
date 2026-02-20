import { useMemo, useState } from "react";
import Field from "../components/ui/Field.jsx";
import Button from "../components/ui/Button.jsx";
import "../styles/pages/home.scss";

export default function Home({ onJoin, room }) {
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState("");

  const canJoin = useMemo(() => {
    const p = pseudo.trim();
    return p.length >= 2 && p.length <= 20;
  }, [pseudo]);

  const handleJoin = () => {
    const p = pseudo.trim();

    if (p.length < 2)
      return setError("Le pseudo doit contenir au moins 2 caractères");
    if (p.length > 20)
      return setError("Le pseudo ne peut pas dépasser 20 caractères");

    setError("");
    onJoin({ pseudo: p });
  };

  return (
    <section className="home">
      <div className="home__grid">
        <div className="home__hero">
          <h1 className="home__title">Twitch Room</h1>
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
            <div className="home__card-sub">Room: #{room}</div>
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

            <div className="home__actions">
              <Button disabled={!canJoin} onClick={handleJoin} fullWidth>
                Join #{room}
              </Button>
            </div>
          </div>
        </div>
      </div>

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
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </section>
  );
}
