// Contrôleur de particules visuelles : crée, met à jour et supprime
// les éléments DOM correspondant aux effets (burst, trail).
// Ce module manipule directement le DOM pour de meilleures
// performances (plutôt que de passer par React pour chaque particule).
export function createParticleController({
  playfieldRef,
  setLeft,
  setBottom,
  worldWidth,
  worldHeight,
}) {
  const particleElsRef = new Map();
  const particleDataRef = new Map();
  let particleSeq = 0;

  // Supprime tous les éléments DOM de particules et réinitialise l'état.
  const clearParticles = () => {
    particleElsRef.forEach((el) => el.remove());
    particleElsRef.clear();
    particleDataRef.clear();
  };

  // Crée une particule (objet + élément DOM) et l'ajoute au playfield.
  const createParticle = ({ x, y, vx, vy, life, size, color, glow = 12 }) => {
    if (!playfieldRef.current) return null;

    const id = `particle-${Date.now()}-${(particleSeq += 1)}`;
    const particle = {
      id,
      x,
      y,
      vx,
      vy,
      life,
      maxLife: life,
      size,
      color,
      glow,
    };
    particleDataRef.set(id, particle);

    const el = document.createElement("div");
    el.className = "cyberjump__particle";
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.userSelect = "none";
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "999px";
    el.style.background = color;
    el.style.boxShadow = `0 0 ${glow}px ${color}`;
    particleElsRef.set(id, el);
    playfieldRef.current.appendChild(el);

    setLeft(el, x);
    setBottom(el, y);

    return particle;
  };

  // Effet "burst" : spawn multiple de particules autour d'un point.
  const burst = ({
    x,
    y,
    color,
    count = 6,
    spread = 160,
    upward = 280,
    size = 6,
    life = 0.45,
  }) => {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spread;
      createParticle({
        x: x + Math.cos(angle) * (radius * 0.15),
        y: y + Math.sin(angle) * (radius * 0.08),
        vx: Math.cos(angle) * spread * 0.45,
        vy:
          Math.sin(angle) * spread * 0.18 +
          upward * (0.55 + Math.random() * 0.45),
        life: life * (0.7 + Math.random() * 0.5),
        size: Math.max(3, size - Math.random() * 2),
        color,
        glow: 10,
      });
    }
  };

  // Effet de traînée placé derrière le joueur en mouvement.
  const trail = ({ x, y, color, direction }) => {
    createParticle({
      x,
      y,
      vx: direction * (40 + Math.random() * 40),
      vy: 24 + Math.random() * 36,
      life: 0.28 + Math.random() * 0.12,
      size: 4 + Math.random() * 3,
      color,
      glow: 8,
    });
  };

  // Met à jour toutes les particules : position, vie, suppression si hors limite.
  const update = (dt) => {
    for (const particle of particleDataRef.values()) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy -= 520 * dt;

      const el = particleElsRef.get(particle.id);
      if (!el) continue;

      setLeft(el, particle.x);
      setBottom(el, particle.y);
      el.style.opacity = `${Math.max(0, particle.life / particle.maxLife)}`;
      el.style.transform = `scale(${0.7 + (particle.life / particle.maxLife) * 0.55})`;

      if (
        particle.life <= 0 ||
        particle.x < -100 ||
        particle.x > worldWidth + 100 ||
        particle.y < -100 ||
        particle.y > worldHeight + 100
      ) {
        el.remove();
        particleElsRef.delete(particle.id);
        particleDataRef.delete(particle.id);
      }
    }
  };

  return {
    clearParticles,
    burst,
    trail,
    update,
  };
}
