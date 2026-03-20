import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createParticleController } from "./particles.jsx";

const createDynamicElement = (tagName = "div") => ({
  tagName,
  className: "",
  style: {},
  parentElement: null,
  removed: false,
  remove() {
    this.removed = true;
    if (this.parentElement?.children) {
      this.parentElement.children = this.parentElement.children.filter(
        (child) => child !== this,
      );
    }
  },
});

const createPlayfieldStub = () => {
  const children = [];

  return {
    children,
    appendChild(el) {
      el.parentElement = this;
      children.push(el);
      return el;
    },
  };
};

beforeEach(() => {
  vi.stubGlobal("document", {
    createElement: vi.fn((tagName) => createDynamicElement(tagName)),
  });
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("particles", () => {
  it("crée, met à jour et supprime des particules", () => {
    const playfieldRef = { current: createPlayfieldStub() };
    const controller = createParticleController({
      playfieldRef,
      setLeft: (el, value) => {
        el.style.left = `${value}px`;
      },
      setBottom: (el, value) => {
        el.style.bottom = `${value}px`;
      },
      worldWidth: 200,
      worldHeight: 150,
    });

    controller.burst({ x: 20, y: 20, color: "red", count: 3 });
    expect(playfieldRef.current.children).toHaveLength(3);

    controller.update(1);
    expect(playfieldRef.current.children).toHaveLength(0);

    expect(() =>
      controller.trail({ x: 10, y: 10, color: "blue", direction: 1 }),
    ).not.toThrow();
    controller.clearParticles();
    expect(playfieldRef.current.children).toHaveLength(0);
  });
});
