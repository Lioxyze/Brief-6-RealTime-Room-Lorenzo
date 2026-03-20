import { describe, expect, it } from "vitest";
import { hasCollision } from "./collision.jsx";

describe("collision", () => {
  it("detecte le chevauchement de deux rectangles", () => {
    expect(
      hasCollision(
        { left: 0, right: 10, top: 0, bottom: 10 },
        { left: 8, right: 18, top: 2, bottom: 12 },
      ),
    ).toBe(true);
  });

  it("ignore deux rectangles séparés", () => {
    expect(
      hasCollision(
        { left: 0, right: 10, top: 0, bottom: 10 },
        { left: 11, right: 18, top: 2, bottom: 12 },
      ),
    ).toBe(false);
  });
});
