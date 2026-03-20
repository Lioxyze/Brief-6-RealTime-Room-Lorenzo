import { describe, expect, it } from "vitest";
import { clamp } from "./helpers.jsx";

describe("helpers", () => {
  it("clamp une valeur dans une plage", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });
});
