import { describe, expect, it } from "vitest";
import { buildHealthPanels, getHealthPercent } from "./health.jsx";

describe("health", () => {
  it("calcule un pourcentage de vie borné", () => {
    expect(getHealthPercent(2, 4)).toBe(50);
    expect(getHealthPercent(-2, 4)).toBe(0);
    expect(getHealthPercent(10, 4)).toBe(100);
  });

  it("construit et trie les panneaux de vie", () => {
    const panels = buildHealthPanels({
      socketId: "me",
      localSide: "right",
      localAvatar: "david",
      playersHealth: {
        me: { health: 2, maxHealth: 5 },
        remoteA: { health: 1, maxHealth: 4 },
        remoteB: { health: 3, maxHealth: 3 },
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
      health: 2,
      maxHealth: 5,
    });
  });
});
