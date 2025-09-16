// src/pages/Production.jsx
export default function Production({ onBack }) {
  return (
    <div
      style={{
        background: "#0b1220",
        color: "#e8eefc",
        minHeight: "100vh",
        padding: 18,
        fontFamily: "Inter, system-ui, Arial",
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: "#111827",
          color: "#e8eefc",
          border: "1px solid #374151",
          borderRadius: 12,
          padding: "10px 14px",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        ⬅ Назад в меню
      </button>

      <h1 style={{ fontSize: 36, margin: "6px 0 14px" }}>
        Раздел: Выработка и производство
      </h1>
      <p>Здесь позже появится анализ выработки.</p>
    </div>
  );
}
