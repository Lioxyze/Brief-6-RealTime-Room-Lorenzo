import { describe, expect, it } from "vitest";
import {
  applyJumpCut,
  createPlayer,
  resetPlayer,
  updatePlayer,
} from "./player.jsx";

describe("player", () => {
  it("crée un joueur avec des valeurs neutres", () => {
    expect(createPlayer()).toMatchObject({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      jumpsLeft: 2,
    });
  });

  it("réinitialise le joueur au bon endroit", () => {
    const player = resetPlayer(createPlayer(), 1000, 180);

    expect(player).toMatchObject({
      x: Math.round(1000 * 0.62),
      y: 180,
      vx: 0,
      vy: 0,
      jumpsLeft: 2,
    });
  });

  it("gère le déplacement, le saut et la gravité", () => {
    const player = updatePlayer(
      {
        ...createPlayer(),
        y: 120,
      },
      { left: false, right: true, jump: true },
      0.016,
      { ground: 120, maxX: 400 },
    );

    expect(player.justJumped).toBe(true);
    expect(player.jumpsLeft).toBe(1);
    expect(player.facing).toBe(1);
    expect(player.vx).toBeGreaterThan(0);
    expect(player.vy).toBeGreaterThan(900);
  });

  it("réduit la hauteur d'un saut encore montant", () => {
    const cut = applyJumpCut({ ...createPlayer(), vy: 100 });

    expect(cut.vy).toBeCloseTo(55);
    expect(applyJumpCut({ ...createPlayer(), vy: -10 })).toMatchObject({
      vy: -10,
    });
  });
});
