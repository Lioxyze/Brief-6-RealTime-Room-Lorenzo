import { describe, expect, it } from "vitest";
import { CONTROLLED_KEYS, PLAYER_KEYS, isPressed } from "./input.jsx";

describe("input", () => {
  it("déclare les touches contrôlées", () => {
    expect(CONTROLLED_KEYS.has("KeyQ")).toBe(true);
    expect(CONTROLLED_KEYS.has("Space")).toBe(true);
  });

  it("associe les touches joueur et détecte un appui", () => {
    expect(PLAYER_KEYS.left).toEqual(["KeyQ", "KeyA"]);
    expect(PLAYER_KEYS.right).toEqual(["KeyD"]);
    expect(PLAYER_KEYS.jump).toEqual(["Space", "KeyZ", "KeyW"]);
    expect(isPressed(new Set(["KeyD"]), PLAYER_KEYS.right)).toBe(true);
    expect(isPressed(new Set(["KeyD"]), PLAYER_KEYS.jump)).toBe(false);
  });
});
