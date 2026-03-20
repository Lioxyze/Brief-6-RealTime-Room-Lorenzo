import tirGif from "../../assets/cyberjump/tir.gif";

// Contrôleur des projectiles : création DOM, déplacement et détection de collision
// avec le joueur local ou distant. Les collisions locales suppriment la balle,
// les collisions distantes notifient via `onHitRemote`.
export function createProjectileController({
  playfieldRef,
  setLeft,
  setBottom,
  worldWidth,
  remotePlayersRef,
  getTargetRemotePlayer,
  onHitRemote,
}) {
  const projectileElsRef = new Map();
  const projectileDataRef = new Map();

  const clearProjectiles = () => {
    projectileElsRef.forEach((el) => el.remove());
    projectileElsRef.clear();
    projectileDataRef.clear();
  };

  // Récupère (ou crée) l'élément DOM pour un projectile donné.
  const getProjectileEl = (projectile) => {
    let el = projectileElsRef.get(projectile.id);
    if (el) return el;

    el = document.createElement("img");
    el.className = "cyberjump__projectile";
    el.style.position = "absolute";
    el.style.userSelect = "none";
    el.style.pointerEvents = "none";
    el.style.objectFit = "contain";
    el.src = tirGif;
    el.alt = "Tir";
    el.draggable = false;
    projectileElsRef.set(projectile.id, el);
    playfieldRef.current?.appendChild(el);
    return el;
  };

  // Ajoute un projectile à la simulation et au DOM.
  const spawnProjectile = ({ id, ownerId, x, y, direction, speed }) => {
    if (!playfieldRef.current) return;

    const projectile = { id, ownerId, x, y, direction, speed, hit: false };
    projectileDataRef.set(id, projectile);

    const el = getProjectileEl(projectile);
    setLeft(el, projectile.x);
    setBottom(el, projectile.y);
    el.style.transform = direction === -1 ? "scaleX(-1)" : "scaleX(1)";
  };

  // Met à jour la position des projectiles, teste collisions et les nettoie.
  const updateProjectiles = (dt, { localRect, socket, room }) => {
    const field = playfieldRef.current;
    if (!field) return;

    const remoteTarget = getTargetRemotePlayer();
    const remoteEl = remoteTarget
      ? remotePlayersRef.current.get(remoteTarget.id)
      : null;
    const remoteRect = remoteEl?.getBoundingClientRect() || null;

    for (const projectile of projectileDataRef.values()) {
      projectile.x += projectile.direction * projectile.speed * dt;
      const el = projectileElsRef.get(projectile.id);
      if (!el) continue;

      setLeft(el, projectile.x);
      setBottom(el, projectile.y);

      const projectileRect = el.getBoundingClientRect();
      const hitsLocal = localRect
        ? projectile.ownerId !== socket?.id &&
          projectileRect &&
          localRect &&
          projectileRect.left < localRect.right &&
          projectileRect.right > localRect.left &&
          projectileRect.top < localRect.bottom &&
          projectileRect.bottom > localRect.top
        : false;
      const hitsRemote = remoteRect
        ? projectileRect &&
          remoteRect &&
          projectileRect.left < remoteRect.right &&
          projectileRect.right > remoteRect.left &&
          projectileRect.top < remoteRect.bottom &&
          projectileRect.bottom > remoteRect.top
        : false;

      if (!projectile.hit && projectile.ownerId !== socket?.id && hitsLocal) {
        projectile.hit = true;
        el.remove();
        projectileElsRef.delete(projectile.id);
        projectileDataRef.delete(projectile.id);
        continue;
      }

      if (
        !projectile.hit &&
        projectile.ownerId === socket?.id &&
        hitsRemote &&
        remoteTarget
      ) {
        projectile.hit = true;
        onHitRemote?.({ socket, room, targetId: remoteTarget.id });
        el.remove();
        projectileElsRef.delete(projectile.id);
        projectileDataRef.delete(projectile.id);
        continue;
      }

      if (projectile.x < -80 || projectile.x > worldWidth + 80) {
        el.remove();
        projectileElsRef.delete(projectile.id);
        projectileDataRef.delete(projectile.id);
      }
    }
  };

  return {
    clearProjectiles,
    spawnProjectile,
    updateProjectiles,
  };
}
