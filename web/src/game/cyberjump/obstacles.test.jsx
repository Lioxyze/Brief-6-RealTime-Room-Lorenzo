import { describe, expect, it } from "vitest";
import { createObstacleController } from "./obstacles.jsx";

describe("obstacles", () => {
  it("expose un contrôleur sans effet de bord", () => {
    const controller = createObstacleController();

    expect(() => controller.clearObstacles()).not.toThrow();
    expect(() => controller.spawnObstacle()).not.toThrow();
    expect(() => controller.updateObstacles()).not.toThrow();
    expect(controller.getObstacleMap()).toBeInstanceOf(Map);
    expect(controller.hasPlayerCollision()).toBe(false);
  });
});
