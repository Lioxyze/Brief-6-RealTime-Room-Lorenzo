// Petit utilitaire : contraint `value` entre `min` et `max` inclus.
// Usage : clamp(x, 0, 10) retourne une valeur dans l'intervalle [0,10].
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
