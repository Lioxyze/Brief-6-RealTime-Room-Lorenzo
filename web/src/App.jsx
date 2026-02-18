import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>Hello world</p>
    </main>
  );
}
