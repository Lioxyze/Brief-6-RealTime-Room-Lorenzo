import { useMemo, useState } from "react";
import Shell from "./components/layout/Shell.jsx";
import Home from "./pages/Home.jsx";
import Room from "./pages/Room.jsx";

const MAIN_ROOM = "lobby";

export default function App() {
  const [route, setRoute] = useState(() => {
    const path = window.location.pathname;
    return path.startsWith("/room") ? "room" : "home";
  });

  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("rt_session") || "null");
    } catch {
      return null;
    }
  });

  const page = useMemo(() => {
    if (route === "room" && session) {
      return (
        <Room
          pseudo={session.pseudo}
          room={MAIN_ROOM}
          onLeave={() => {
            sessionStorage.removeItem("rt_session");
            setSession(null);
            window.history.pushState({}, "", "/");
            setRoute("home");
          }}
        />
      );
    }

    return (
      <Home
        room={MAIN_ROOM}
        onJoin={({ pseudo }) => {
          const next = { pseudo };
          sessionStorage.setItem("rt_session", JSON.stringify(next));
          setSession(next);
          window.history.pushState({}, "", "/room");
          setRoute("room");
        }}
      />
    );
  }, [route, session]);

  return <Shell>{page}</Shell>;
}
