import { useEffect } from "react";
import David from "../../assets/cyberjump/David.png";
import Lucy from "../../assets/cyberjump/Lucy.png";

const AVATARS = {
  david: David,
  lucy: Lucy,
};

// Hook: centralise la logique socket spécifique au jeu CyberJump.
// Il enregistre les handlers pour tous les événements Socket.IO utilisés
// par le jeu (player list, state updates, health, countdown, etc.) et
// expose des callbacks locaux (startGame, endGame, spawnProjectile...).
export default function useCyberJumpRoomSocket({
  socket,
  room,
  avatar,
  localSideRef,
  setLocalSide,
  remotePlayersDataRef,
  setRemotePlayersDataState,
  getOrCreateRemoteEl,
  removeRemoteEl,
  spawnProjectile,
  spawnObstacle,
  countdownIntervalRef,
  setCountdown,
  setAvatar,
  setHealthSnapshot,
  sendPlayerState,
  startGame,
  endGame,
  matchEndedRef,
  setMatchResult,
}) {
  // Enregistre les listeners socket quand `socket` est prêt.
  // Le cleanup en fin de hook retire les handlers.
  useEffect(() => {
    if (!socket) return undefined;

    // Réception de l'information sur la position (left/right)
    // pour le joueur local — utile pour placer l'apparition et le HUD.
    const handlePlayerSlot = ({ side }) => {
      if (side === "left" || side === "right") {
        localSideRef.current = side;
        setLocalSide(side);
      }
    };

    // Met à jour l'état local stocké des joueurs distants et
    // notifie React via `setRemotePlayersDataState`.
    const updateRemoteState = (id, nextState) => {
      remotePlayersDataRef.current.set(id, nextState);
      setRemotePlayersDataState(
        Object.fromEntries(remotePlayersDataRef.current),
      );
    };

    // Liste initiale des autres joueurs présents dans la room.
    // On crée les éléments DOM nécessaires et initialise leur état.
    const handlePlayerList = (list) => {
      list.forEach(({ id, avatar: av, ready: rd, side, health, maxHealth }) => {
        if (id === socket.id) return;
        getOrCreateRemoteEl(id, av);
        updateRemoteState(id, {
          avatar: av,
          ready: !!rd,
          side: side || null,
          health: health ?? 3,
          maxHealth: maxHealth ?? 3,
        });
      });
    };

    // Un joueur rejoint (après nous). Met à jour/ crée son élément et
    // fusionne l'état connu précédemment pour conserver positions, etc.
    const handlePlayerJoined = ({
      id,
      avatar: av,
      ready: rd,
      side,
      health,
      maxHealth,
    }) => {
      if (id === socket.id) return;
      const el = getOrCreateRemoteEl(id, av);
      updateRemoteState(id, {
        avatar: av,
        ready: !!rd,
        side: side || null,
        health: health ?? remotePlayersDataRef.current.get(id)?.health ?? 3,
        maxHealth:
          maxHealth ?? remotePlayersDataRef.current.get(id)?.maxHealth ?? 3,
        currentX: remotePlayersDataRef.current.get(id)?.currentX,
        currentY: remotePlayersDataRef.current.get(id)?.currentY,
      });
      if (av != null) el.classList.remove("cyberjump__character--placeholder");
    };

    // Un joueur a quitté la room : on retire son DOM et son état.
    const handlePlayerLeft = ({ id }) => {
      removeRemoteEl(id);
    };

    // Mise à jour continue de l'état d'un joueur distant (position,
    // orientation, avatar). On manipule directement le DOM pour des
    // performances (canvas-like) et on reflète l'état dans React state.
    const handlePlayerState = ({ id, x, y, facing, avatar: av }) => {
      if (id === socket.id) return;
      const el = getOrCreateRemoteEl(id, av);
      if (av != null) {
        el.src = AVATARS[av] || AVATARS.david;
        el.classList.remove("cyberjump__character--placeholder");
      }
      el.style.transform = facing === -1 ? "scaleX(-1)" : "scaleX(1)";
      el.style.left = `${x}px`;
      el.style.bottom = `${y}px`;

      const prev = remotePlayersDataRef.current.get(id) || {};
      updateRemoteState(id, {
        avatar: av,
        x,
        y,
        facing,
        ready: prev.ready || false,
        currentX: prev.currentX ?? x,
        currentY: prev.currentY ?? y,
      });
    };

    // Reçoit un spawn d'obstacle depuis le serveur et le transmet
    // au contrôleur local qui s'occupe du DOM des obstacles.
    const handleObstacleSpawn = (obstacle) => {
      spawnObstacle(obstacle);
    };

    // Mise à jour des informations de santé/HP pour tous les joueurs.
    const handleHealthState = ({ players }) => {
      const nextState = {};

      (players || []).forEach((player) => {
        if (!player?.id) return;
        nextState[player.id] = {
          health: player.health ?? 3,
          maxHealth: player.maxHealth ?? 3,
          avatar: player.avatar ?? null,
          side: player.side ?? null,
          pseudo: player.pseudo ?? null,
        };
      });

      setHealthSnapshot(nextState);
    };

    socket.on("player:slot", handlePlayerSlot);
    socket.on("player:list", handlePlayerList);
    socket.on("player:joined", handlePlayerJoined);
    socket.on("player:left", handlePlayerLeft);
    socket.on("player:state", handlePlayerState);
    socket.on("obstacle:spawn", handleObstacleSpawn);
    socket.on("game:health", handleHealthState);
    socket.on("game:ready:status", ({ id, ready }) => {
      if (!socket || id === socket.id) return;
      const cur = remotePlayersDataRef.current.get(id) || {
        avatar: null,
        pseudo: null,
      };
      updateRemoteState(id, {
        avatar: cur.avatar,
        pseudo: cur.pseudo || null,
        ready: !!ready,
        side: cur.side || null,
        health: cur.health ?? 3,
        maxHealth: cur.maxHealth ?? 3,
      });
    });

    // Débute un compte à rebours côté client vers le début du match.
    // Le serveur envoie `seconds` et `startAt` (timestamp absolu).
    socket.on("game:countdown", ({ seconds, startAt }) => {
      const now = Date.now();
      const end = startAt + seconds * 1000;
      const remaining = Math.max(0, Math.ceil((end - now) / 1000));
      setCountdown(remaining);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        setCountdown(rem);
        if (rem <= 0) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }, 200);
    });

    // Démarrage effectif de la partie (le serveur confirme).
    socket.on("game:start", () => {
      setCountdown(null);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      startGame();
    });

    // Fin de partie : le serveur indique le gagnant.
    socket.on("game:over", ({ winnerId }) => {
      if (matchEndedRef.current) return;
      matchEndedRef.current = true;
      setMatchResult(
        winnerId === socket.id ? "Vous avez gagné" : "Vous avez perdu",
      );
      endGame();
    });

    // Réception d'un tir émis par un autre joueur : crée le projectile localement.
    socket.on("player:shoot", ({ id, x, y, direction, speed }) => {
      if (id === socket.id) return;
      spawnProjectile({
        id: `${id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ownerId: id,
        x,
        y,
        direction,
        speed,
      });
    });

    // Annulation du countdown (p.ex. si un joueur se désactive ou quitte).
    socket.on("game:countdown:canceled", () => {
      setCountdown(null);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    });

    // Gestion des erreurs de sélection d'avatar (p.ex. avatar déjà pris).
    socket.on("player:select:rejected", ({ reason }) => {
      if (reason === "taken") {
        setAvatar((cur) => (cur === "david" ? "lucy" : "david"));
        try {
          alert("Avatar déjà pris, changement automatique.");
        } catch (e) {}
      }
    });

    // Tentative de rejoindre une room pleine.
    socket.on("player:join:rejected", ({ reason }) => {
      if (reason === "room_full") {
        try {
          alert("La room est pleine — 2 joueurs maximum.");
        } catch (e) {}
      }
    });

    socket.on("player:select:accepted", () => {});

    // Cleanup: retire tous les handlers enregistrés ci-dessus.
    return () => {
      socket.off("player:slot", handlePlayerSlot);
      socket.off("player:list", handlePlayerList);
      socket.off("player:joined", handlePlayerJoined);
      socket.off("player:left", handlePlayerLeft);
      socket.off("player:state", handlePlayerState);
      socket.off("obstacle:spawn", handleObstacleSpawn);
      socket.off("game:health", handleHealthState);
      socket.off("player:select:rejected");
      socket.off("player:join:rejected");
      socket.off("player:select:accepted");
      socket.off("player:shoot");
      socket.off("game:over");
      socket.off("game:countdown:canceled");
    };
  }, [
    socket,
    room,
    localSideRef,
    setLocalSide,
    remotePlayersDataRef,
    setRemotePlayersDataState,
    getOrCreateRemoteEl,
    removeRemoteEl,
    spawnProjectile,
    spawnObstacle,
    countdownIntervalRef,
    setCountdown,
    setAvatar,
    startGame,
    endGame,
    matchEndedRef,
    setMatchResult,
  ]);

  useEffect(() => {
    if (!socket) return;
    try {
      socket.emit("player:select", { avatar, room });
    } catch (e) {}
  }, [avatar, socket, room]);

  useEffect(() => {
    if (!socket || !sendPlayerState) return undefined;

    sendPlayerState();
    const timer = setInterval(sendPlayerState, 120);

    return () => clearInterval(timer);
  }, [socket, sendPlayerState]);
}
