import logoGif from "../../assets/cyberjump/Logo Jeux.gif";
import David from "../../assets/cyberjump/David.png";
import Lucy from "../../assets/cyberjump/Lucy.png";

const AVATAR_IMAGES = {
  david: David,
  lucy: Lucy,
};

// Menu / overlay : contrôle l'état de matchmaking local (choix avatar,
// prêt/déprêt), affiche le résultat de la partie et offre des actions
// (règles, plein écran, quitter). Le composant est rendu uniquement
// lorsque `open` est vrai.
export default function CyberJumpMenu({
  open,
  paused,
  matchResult,
  avatar,
  isReady,
  countdown,
  remotePlayersDataState,
  controlsLocked,
  onStartReady,
  onReleaseAvatar,
  onChooseAvatar,
  onOpenRules,
  onQuit,
  onToggleFullscreen,
  onResume,
}) {
  if (!open) return null;

  const locked = !!controlsLocked;
  const canReady = !!avatar;

  return (
    <div className="cyberjump__overlay" aria-hidden={!open}>
      {paused && (
        <div className="cyberjump__overlay" aria-hidden={!paused}>
          <div className="cyberjump__menu" role="dialog" aria-modal="true">
            <div className="cyberjump__menu-vertical">
              <h3 className="cyberjump__title">Jeu en pause</h3>
              <div className="cyberjump__menu-actions">
                <button
                  className="cyberjump__btn cyberjump__btn--primary"
                  disabled={locked}
                  onClick={onResume}
                >
                  Reprendre
                </button>
                <button
                  className="cyberjump__btn cyberjump__btn--outline"
                  onClick={onQuit}
                >
                  Quitter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <img className="cyberjump__menu-logo" src={logoGif} alt="CyberJump" />

      <div className="cyberjump__menu" role="dialog" aria-modal="true">
        <div className="cyberjump__menu-vertical">
          {matchResult && (
            <div className="cyberjump__match-result">{matchResult}</div>
          )}
          <div style={{ color: avatar ? "#fff" : "#aaa" }}>
            Vous {avatar ? `(${avatar})` : `(choisir avatar)`}
            {isReady ? (
              <span style={{ color: "#7bf58b" }}> • prêt</span>
            ) : (
              <span style={{ color: "#ff6b6b" }}> • non prêt</span>
            )}
          </div>
          {countdown != null && (
            <div
              style={{
                color: "#fff",
                fontFamily: "var(--ui-font)",
                fontSize: 18,
                fontWeight: 800,
                background: "rgba(31, 182, 255, 0.14)",
                border: "1px solid rgba(31, 182, 255, 0.35)",
                padding: "8px 12px",
                borderRadius: 12,
              }}
            >
              Départ dans {countdown}s
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {Object.entries(remotePlayersDataState || {}).map(([id, info]) => (
              <div
                key={id}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {info?.avatar?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div style={{ color: info?.avatar ? "#fff" : "#ffb86b" }}>
                  {info?.avatar ? `(${info.avatar})` : "(en attente)"}
                  {info?.ready ? (
                    <span style={{ color: "#7bf58b" }}> • prêt</span>
                  ) : (
                    <span style={{ color: "#ff6b6b" }}> • non prêt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`cyberjump__btn cyberjump__btn--large cyberjump__btn--primary ${isReady ? "cyberjump__btn--selected" : ""}`}
              disabled={locked || !canReady}
              onClick={onStartReady}
              title={
                !canReady
                  ? "Choisissez David ou Lucy pour être prêt"
                  : undefined
              }
            >
              {isReady ? "Je ne suis plus prêt" : "Je suis prêt"}
            </button>

            {!canReady && (
              <div style={{ color: "#ffb86b", fontSize: 12, marginTop: 4 }}>
                Choisissez David ou Lucy pour pouvoir lancer la partie
              </div>
            )}

            {avatar && (
              <button
                className="cyberjump__btn cyberjump__btn--large cyberjump__btn--outline"
                disabled={locked || isReady}
                onClick={onReleaseAvatar}
              >
                Libérer avatar
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="cyberjump__btn cyberjump__btn--large"
              type="button"
              disabled={locked}
              onClick={onOpenRules}
            >
              Règles
            </button>
            <button
              className="cyberjump__btn cyberjump__btn--large cyberjump__btn--outline"
              type="button"
              disabled={locked}
              onClick={onToggleFullscreen}
            >
              Plein écran
            </button>
          </div>

          <div style={{ height: 6 }} />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={`cyberjump__btn cyberjump__btn--icon ${avatar === "david" ? "cyberjump__btn--selected" : ""}`}
              type="button"
              disabled={locked || isReady}
              onClick={() => onChooseAvatar("david")}
              title="Choisir David"
              aria-pressed={avatar === "david"}
            >
              <img src={AVATAR_IMAGES.david} alt="David" />
            </button>

            <button
              className={`cyberjump__btn cyberjump__btn--icon ${avatar === "lucy" ? "cyberjump__btn--selected" : ""}`}
              type="button"
              disabled={locked || isReady}
              onClick={() => onChooseAvatar("lucy")}
              title="Choisir Lucy"
              aria-pressed={avatar === "lucy"}
            >
              <img src={AVATAR_IMAGES.lucy} alt="Lucy" />
            </button>

            <button
              className={`cyberjump__btn cyberjump__btn--icon ${avatar == null ? "cyberjump__btn--selected" : ""}`}
              type="button"
              disabled={locked || isReady}
              onClick={() => onChooseAvatar(null)}
              title="Aucun personnage / placeholder"
              aria-pressed={avatar == null}
            >
              ?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
