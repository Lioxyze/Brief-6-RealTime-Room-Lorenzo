// AABB collision test entre deux rectangles { left, right, top, bottom }.
// Renvoie true si les deux rects se chevauchent.
export function hasCollision(a, b) {
  return (
    a.right >= b.left &&
    a.left <= b.right &&
    a.bottom >= b.top &&
    a.top <= b.bottom
  );
}
