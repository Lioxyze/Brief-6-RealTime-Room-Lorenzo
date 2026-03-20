import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectileController } from "./projectiles.jsx";

const createDynamicElement = (tagName = "div") => ({
  tagName,
  className: "",
  style: {},
  src: "",
  alt: "",
  draggable: false,
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
  getBoundingClientRect() {
    const left = Number.parseFloat(this.style.left || "0");
    const bottom = Number.parseFloat(this.style.bottom || "0");
    const width = Number.parseFloat(this.style.width || "24");
    const height = Number.parseFloat(this.style.height || "24");

    return {
      left,
      right: left + width,
      top: bottom + height,
      bottom,
      width,
      height,
    };
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

const createStaticRectElement = (rect) => ({
  ...createDynamicElement("div"),
  getBoundingClientRect: () => rect,
});

beforeEach(() => {
  vi.stubGlobal("document", {
    createElement: vi.fn((tagName) => createDynamicElement(tagName)),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("projectiles", () => {
  it("déclenche un hit distant puis supprime le projectile", () => {
    const playfieldRef = { current: createPlayfieldStub() };
    const remotePlayersRef = {
      current: new Map([
        [
          "remote-1",
          createStaticRectElement({ left: 12, right: 36, top: 0, bottom: 24 }),
        ],
      ]),
    };
    const onHitRemote = vi.fn();

    const controller = createProjectileController({
      playfieldRef,
      setLeft: (el, value) => {
        el.style.left = `${value}px`;
      },
      setBottom: (el, value) => {
        el.style.bottom = `${value}px`;
      },
      worldWidth: 400,
      remotePlayersRef,
      getTargetRemotePlayer: () => ({ id: "remote-1" }),
      onHitRemote,
    });

    controller.spawnProjectile({
      id: "shot-1",
      ownerId: "socket-me",
      x: 12,
      y: 2,
      direction: 1,
      speed: 0,
    });

    // ensure the created element has a smaller height so overlap is strict
    const created = playfieldRef.current.children[0];
    created.style.height = "12";

    controller.updateProjectiles(0, {
      localRect: null,
      socket: { id: "socket-me" },
      room: "room-1",
    });

    expect(onHitRemote).toHaveBeenCalledWith({
      socket: { id: "socket-me" },
      room: "room-1",
      targetId: "remote-1",
    });
  });

  it("supprime un projectile adverse sur le joueur local", () => {
    const playfieldRef = { current: createPlayfieldStub() };
    const remotePlayersRef = { current: new Map() };

    const controller = createProjectileController({
      playfieldRef,
      setLeft: (el, value) => {
        el.style.left = `${value}px`;
      },
      setBottom: (el, value) => {
        el.style.bottom = `${value}px`;
      },
      worldWidth: 400,
      remotePlayersRef,
      getTargetRemotePlayer: () => null,
      onHitRemote: vi.fn(),
    });

    controller.spawnProjectile({
      id: "shot-2",
      ownerId: "other-player",
      x: 6,
      y: 2,
      direction: -1,
      speed: 0,
    });

    // shrink the projectile element so it actually overlaps the local rect
    const created2 = playfieldRef.current.children[0];
    created2.style.height = "12";

    controller.updateProjectiles(0, {
      localRect: { left: 0, right: 24, top: 0, bottom: 24 },
      socket: { id: "socket-me" },
      room: "room-1",
    });

    expect(playfieldRef.current.children).toHaveLength(0);
    controller.clearProjectiles();
    expect(playfieldRef.current.children).toHaveLength(0);
  });
});
