// HUD minimal affichant :
// - les barres de vie pour chaque joueur (`healthPanels`)
// - le score local
// - le compte à rebours de départ si présent
const getAvatarLabel = (avatar) =>
  avatar ? String(avatar).charAt(0).toUpperCase() : "?";

export default function CyberJumpHud({ score, countdown, healthPanels = [] }) {
  return (
    <div className="cyberjump__hud" aria-live="polite">
      <div className="cyberjump__hud-health">
        {healthPanels.map((player) => {
          const healthPercent = player.healthPercent ?? 100;

          return (
            <div
              key={player.id}
              className={`cyberjump__hud-player ${player.isLocal ? "cyberjump__hud-player--local" : "cyberjump__hud-player--remote"}`}
            >
              <div className="cyberjump__hud-player-head">
                <span className="cyberjump__hud-avatar" aria-hidden="true">
                  {getAvatarLabel(player.avatar)}
                </span>
                <div className="cyberjump__hud-player-meta">
                  <span className="cyberjump__hud-player-name">
                    {player.name}
                  </span>
                  <span className="cyberjump__hud-player-life">
                    {Math.max(0, Math.round(healthPercent))}%
                  </span>
                </div>
              </div>

              <div className="cyberjump__hud-bar" aria-hidden="true">
                <span
                  className="cyberjump__hud-bar-fill"
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="cyberjump__hud-score">{score}</div>

      {countdown != null && (
        <div className="cyberjump__hud-countdown">Départ dans {countdown}s</div>
      )}
    </div>
  );
}
