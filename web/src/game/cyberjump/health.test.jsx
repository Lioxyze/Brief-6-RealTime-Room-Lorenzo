import { describe, expect, it } from "vitest";
import { buildHealthPanels, getHealthPercent } from "./health.jsx";

describe("health", () => {
  it("calcule un pourcentage de vie borné", () => {
    expect(getHealthPercent(50, 100)).toBe(50);
    expect(getHealthPercent(-2, 100)).toBe(0);
    expect(getHealthPercent(140, 100)).toBe(100);
  });

  it("construit et trie les panneaux de vie", () => {
    const panels = buildHealthPanels({
      socketId: "me",
      localSide: "right",
      localAvatar: "david",
      playersHealth: {
        me: { health: 50, maxHealth: 100 },
        remoteA: { health: 25, maxHealth: 100 },
        remoteB: { health: 75, maxHealth: 100 },
      },
      remotePlayersDataState: {
        remoteA: { avatar: "lucy", pseudo: "Adversaire", side: "left" },
        remoteB: { avatar: null, pseudo: null },
      },
    });

    expect(panels).toHaveLength(3);
    expect(panels[0]).toMatchObject({
      id: "remoteA",
      name: "Adversaire",
      side: "left",
      isLocal: false,
    });
    expect(panels[1]).toMatchObject({
      id: "remoteB",
      name: "Adversaire",
      side: "left",
      avatar: null,
    });
    expect(panels[2]).toMatchObject({
      id: "me",
      name: "Vous",
      side: "right",
      isLocal: true,
      healthPercent: 50,
    });
  });
});
