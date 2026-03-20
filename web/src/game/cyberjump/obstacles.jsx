// Contrôleur d'obstacles — implémentation no-op pour supprimer les obstacles
// Cette version conserve l'API utilisée par le jeu mais ne crée ni ne met
// à jour aucun obstacle. Utile pour désactiver les obstacles côté client.
export function createObstacleController() {
  const clearObstacles = () => {};
  const spawnObstacle = () => {};
  const updateObstacles = () => {};
  const getObstacleMap = () => new Map();
  const hasPlayerCollision = () => false;
  const getPlatformUnderPlayer = () => null;

  return {
    clearObstacles,
    spawnObstacle,
    updateObstacles,
    getObstacleMap,
    hasPlayerCollision,
    getPlatformUnderPlayer,
  };
}
