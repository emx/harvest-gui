import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);

  async function callCommand(name: string, args?: Record<string, unknown>) {
    setLoading(name);
    setResult("");
    try {
      const res = await invoke(name, args);
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setResult(`Error: ${e}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="container">
      <h1>Harvest GUI — Command Test</h1>

      <div className="row" style={{ flexWrap: "wrap", gap: "8px" }}>
        <button
          disabled={loading !== null}
          onClick={() => callCommand("get_processed")}
        >
          get_processed
        </button>
        <button
          disabled={loading !== null}
          onClick={() => callCommand("get_last_poll")}
        >
          get_last_poll
        </button>
        <button
          disabled={loading !== null}
          onClick={() => callCommand("list_collect_files")}
        >
          list_collect_files
        </button>
        <button
          disabled={loading !== null}
          onClick={() => callCommand("get_config")}
        >
          get_config
        </button>
        <button
          disabled={loading !== null}
          onClick={() => callCommand("tail_log", { lines: 20 })}
        >
          tail_log (20)
        </button>
      </div>

      {loading && <p>Loading {loading}...</p>}

      <pre
        style={{
          textAlign: "left",
          background: "#1a1a1a",
          padding: "16px",
          borderRadius: "8px",
          marginTop: "16px",
          maxHeight: "400px",
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {result || "Click a button to invoke a command"}
      </pre>
    </main>
  );
}

export default App;
