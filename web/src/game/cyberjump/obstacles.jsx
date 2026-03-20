// Contrôleur d'obstacles — API minimale fournie au jeu. Le fichier est
// volontairement simple (implémentation factice) ; il expose les méthodes
// utilisées par le jeu pour spawn, mettre à jour et tester les collisions.
export function createObstacleController() {
  const clearObstacles = () => {};
  const spawnObstacle = () => {};
  const updateObstacles = () => {};
  const getObstacleMap = () => new Map();
  const hasPlayerCollision = () => false;

  return {
    clearObstacles,
    spawnObstacle,
    updateObstacles,
    getObstacleMap,
    hasPlayerCollision,
  };
}
