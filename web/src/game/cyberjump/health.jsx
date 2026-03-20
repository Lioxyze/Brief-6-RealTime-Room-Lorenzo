// Gestion des points de vie/player health pour le HUD.
export const DEFAULT_HEALTH = 3;

// Retourne le pourcentage de vie (0-100) en sécurisant les bornes.
export const getHealthPercent = (health, maxHealth) => {
  const safeMax = Math.max(1, maxHealth || DEFAULT_HEALTH);
  const safeHealth = Math.max(0, health ?? DEFAULT_HEALTH);

  return Math.max(0, Math.min(100, Math.round((safeHealth / safeMax) * 100)));
};

// Construit les panels de HUD à partir des données serveur/locales.
// - `socketId` : identifiant local
// - `playersHealth` : snapshot côté serveur des PV
// - `remotePlayersDataState` : informations distantes (avatar, pseudo, side)
export const buildHealthPanels = ({
  socketId,
  localSide,
  localAvatar,
  playersHealth = {},
  remotePlayersDataState = {},
}) => {
  const panels = [];
  const localHealth = playersHealth[socketId] || {};

  panels.push({
    id: socketId || "local",
    name: "Vous",
    avatar: localAvatar,
    health: localHealth.health ?? DEFAULT_HEALTH,
    maxHealth: localHealth.maxHealth ?? DEFAULT_HEALTH,
    side: localSide || "left",
    isLocal: true,
  });

  for (const [id, info] of Object.entries(remotePlayersDataState)) {
    const remoteHealth = playersHealth[id] || {};

    panels.push({
      id,
      name: info?.pseudo || info?.avatar || "Adversaire",
      avatar: info?.avatar || null,
      health: remoteHealth.health ?? DEFAULT_HEALTH,
      maxHealth: remoteHealth.maxHealth ?? DEFAULT_HEALTH,
      side: info?.side || (localSide === "left" ? "right" : "left"),
      isLocal: false,
    });
  }

  // Tri pour afficher les joueurs gauche → droite dans le HUD.
  return panels.sort((a, b) => {
    const order = { left: 0, right: 1 };
    return (order[a.side] ?? 2) - (order[b.side] ?? 2);
  });
};
