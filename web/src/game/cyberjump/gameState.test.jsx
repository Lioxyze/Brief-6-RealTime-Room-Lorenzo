import { describe, expect, it } from "vitest";
import {
  createGameState,
  getGroundY,
  resetGameState,
  updateGameState,
} from "./gameState.jsx";
import { createPlayer } from "./player.jsx";

describe("gameState", () => {
  it("calcule la hauteur du sol de façon bornée", () => {
    expect(getGroundY(300)).toBe(70);
    expect(getGroundY(720)).toBe(Math.round(720 * 0.22));
  });

  it("crée un état initial", () => {
    expect(createGameState()).toMatchObject({
      started: false,
      score: 0,
      enemies: [],
    });
  });

  it("réinitialise l'état courant et le joueur", () => {
    const state = createGameState();
    const resetState = resetGameState(state, 1200, 720);

    expect(resetState.score).toBe(0);
    expect(resetState.enemies).toEqual([]);
    expect(resetState.player.x).toBe(Math.round(1200 * 0.62));
    expect(resetState.player.y).toBe(getGroundY(720));
  });

  it("met à jour le joueur et vide les ennemis", () => {
    const next = updateGameState(
      {
        started: true,
        score: 4,
        player: {
          ...createPlayer(),
          y: 100,
        },
        enemies: [{ id: 1 }],
      },
      { left: false, right: true, jump: false },
      0.1,
      { ground: 100, maxX: 300 },
    );

    expect(next.enemies).toEqual([]);
    expect(next.player.vx).toBeGreaterThan(0);
    expect(next.player.x).toBeGreaterThan(0);
  });
});
