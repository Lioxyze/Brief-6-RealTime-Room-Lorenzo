import { describe, expect, it } from "vitest";
import { CONFIG } from "./config.jsx";

describe("config", () => {
  it("expose les constantes du gameplay", () => {
    expect(CONFIG).toMatchObject({
      GRAVITY: 2600,
      RUN_ACCEL: 4200,
      RUN_FRICTION: 5200,
      MAX_RUN_SPEED: 720,
      JUMP_VELOCITY: 980,
      COYOTE_TIME: 0.09,
      JUMP_BUFFER: 0.11,
      JUMP_CUT: 0.55,
    });
  });
});
