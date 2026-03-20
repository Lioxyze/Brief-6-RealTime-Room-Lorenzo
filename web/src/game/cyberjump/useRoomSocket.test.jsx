import { afterEach, describe, expect, it, vi } from "vitest";

const effectCleanups = vi.hoisted(() => []);

vi.mock("react", async () => {
  const actual = await vi.importActual("react");

  return {
    ...actual,
    useEffect: (effect) => {
      const cleanup = effect();
      if (typeof cleanup === "function") {
        effectCleanups.push(cleanup);
      }
    },
  };
});

import useCyberJumpRoomSocket from "./useRoomSocket.jsx";

const createSocket = () => ({
  id: "socket-me",
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
});

afterEach(() => {
  effectCleanups.splice(0).forEach((cleanup) => cleanup());
  vi.clearAllMocks();
});

describe("useRoomSocket", () => {
  it("enregistre les handlers et réagit aux événements importants", () => {
    const socket = createSocket();
    const remotePlayersDataRef = { current: new Map() };
    const setRemotePlayersDataState = vi.fn();
    const getOrCreateRemoteEl = vi.fn(() => ({
      classList: { remove: vi.fn(), add: vi.fn() },
      style: {},
      src: "",
    }));
    const removeRemoteEl = vi.fn();
    const spawnProjectile = vi.fn();
    const spawnObstacle = vi.fn();
    const setCountdown = vi.fn();
    const setAvatar = vi.fn();
    const setHealthSnapshot = vi.fn();
    const sendPlayerState = vi.fn();
    const startGame = vi.fn();
    const endGame = vi.fn();
    const setMatchResult = vi.fn();

    useCyberJumpRoomSocket({
      socket,
      room: "room-1",
      avatar: "david",
      localSideRef: { current: "left" },
      setLocalSide: vi.fn(),
      remotePlayersDataRef,
      setRemotePlayersDataState,
      getOrCreateRemoteEl,
      removeRemoteEl,
      spawnProjectile,
      spawnObstacle,
      countdownIntervalRef: { current: null },
      setCountdown,
      setAvatar,
      setHealthSnapshot,
      sendPlayerState,
      startGame,
      endGame,
      matchEndedRef: { current: false },
      setMatchResult,
    });

    expect(socket.on).toHaveBeenCalledWith("player:list", expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith(
      "game:countdown",
      expect.any(Function),
    );
    expect(socket.emit).toHaveBeenCalledWith("player:select", {
      avatar: "david",
      room: "room-1",
    });
    expect(sendPlayerState).toHaveBeenCalledTimes(1);

    const playerListHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "player:list",
    )?.[1];
    playerListHandler?.([
      { id: "socket-me", avatar: "david" },
      { id: "remote-1", avatar: "lucy", ready: true, side: "right" },
    ]);

    expect(getOrCreateRemoteEl).toHaveBeenCalledWith("remote-1", "lucy");
    expect(setRemotePlayersDataState).toHaveBeenCalled();

    const countdownHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "game:countdown",
    )?.[1];
    countdownHandler?.({ seconds: 3, startAt: Date.now() - 1000 });
    expect(setCountdown).toHaveBeenCalled();

    const readyRejectedHandler = socket.on.mock.calls.find(
      ([eventName]) => eventName === "player:select:rejected",
    )?.[1];
    readyRejectedHandler?.({ reason: "taken" });
    expect(setAvatar).toHaveBeenCalled();

    effectCleanups.splice(0).forEach((cleanup) => cleanup());
    expect(socket.off).toHaveBeenCalledWith(
      "player:list",
      expect.any(Function),
    );
  });
});
