// src/App.jsx
import React, { useState } from "react";
import Consumption from "./pages/Consumption.jsx";
import Production from "./pages/Production.jsx";

export default function App() {
  // стартуем с меню
  const [page, setPage] = useState("menu");

  // экраны разделов
  if (page === "consumption") {
    return <Consumption onBack={() => setPage("menu")} />;
  }
  if (page === "production") {
    return <Production onBack={() => setPage("menu")} />;
  }

  // стартовое меню
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b1220",
        color: "#e8eefc",
        fontFamily: "Inter, system-ui, Arial",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #374151",
          borderRadius: 16,
          padding: 24,
          width: 520,
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,.4)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 16 }}>ЭНЕРГОКАЛЬКУЛЯТОР</h1>
        <p style={{ marginTop: 0, marginBottom: 18, color: "#aab4ca" }}>
          Выберите раздел анализа
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => setPage("consumption")}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #374151",
              background: "#111827",
              color: "#e8eefc",
              cursor: "pointer",
              minWidth: 180,
            }}
          >
            ⚡ Потребление
          </button>

          <button
            onClick={() => setPage("production")}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #374151",
              background: "#111827",
              color: "#e8eefc",
              cursor: "pointer",
              minWidth: 180,
            }}
          >
            🏭 Производство
          </button>
        </div>
      </div>
    </div>
  );
}
