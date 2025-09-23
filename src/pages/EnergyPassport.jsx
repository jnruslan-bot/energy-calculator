// src/pages/EnergyPassport.jsx
import React, { useEffect, useState } from "react";

export default function EnergyPassport({ onBack }) {
  // ---- СТИЛИ (в тон остальному приложению) ----
  const page = {
    background: "#0b1220",
    color: "#e8eefc",
    minHeight: "100vh",
    padding: 18,
    fontFamily: "Inter, system-ui, Arial",
  };
  const h1 = { fontSize: 28, margin: "6px 0 12px" };
  const panel = {
    background: "#0f172a",
    border: "1px solid #374151",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  };
  const tbl = { width: "100%", borderCollapse: "collapse" };
  const th = {
    border: "1px solid #374151",
    padding: 8,
    textAlign: "center",
    background: "#1e293b",
    fontWeight: 600,
  };
  const td = {
    border: "1px solid #374151",
    padding: 8,
    verticalAlign: "middle",
    textAlign: "center",
  };
  const tdLeft = { ...td, textAlign: "left" };
  const inp = {
    background: "#111827",
    color: "#e8eefc",
    border: "1px solid #374151",
    borderRadius: 10,
    padding: "8px 10px",
    width: "100%",
    outline: "none",
    textAlign: "right",
  };
  const btn = {
    background: "#111827",
    color: "#e8eefc",
    border: "1px solid #374151",
    borderRadius: 12,
    padding: "8px 12px",
    cursor: "pointer",
  };

  // ---- ДАННЫЕ раздела 1 (таблица «Расчётные условия») ----
  const ROWS_INIT = [
    {
      n: 1,
      name:
        "Расчётная температура наружного воздуха для проектирования теплозащиты",
      sym: <>t<sub>н</sub></>,
      unit: "°C",
      value: "",
    },
    {
      n: 2,
      name:
        "Средняя температура наружного воздуха за отопительный период",
      sym: <>t<sub>от</sub></>,
      unit: "°C",
      value: "",
    },
    {
      n: 3,
      name: "Продолжительность отопительного периода",
      sym: <>z<sub>от</sub></>,
      unit: "сут/год",
      value: "",
    },
    {
      n: 4,
      name: "Градусо-сутки отопительного периода",
      sym: "ГСОП",
      unit: "°C·сут/год",
      value: "",
    },
    {
      n: 5,
      name:
        "Расчётная температура внутреннего воздуха для проектирования теплозащиты",
      sym: <>t<sub>в</sub></>,
      unit: "°C",
      value: "",
    },
    {
      n: 6,
      name: "Расчётная температура чердака",
      sym: <>t<sub>черд</sub></>,
      unit: "°C",
      value: "",
    },
    {
      n: 7,
      name: "Расчётная температура техподполья",
      sym: <>t<sub>подп</sub></>,
      unit: "°C",
      value: "",
    },
  ];

  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem("passport_section1");
    if (!saved) return ROWS_INIT;
    try {
      const parsed = JSON.parse(saved);
      // подстрахуемся на случай изменения состава строк
      return ROWS_INIT.map((r, i) => ({
        ...r,
        value: parsed[i]?.value ?? "",
      }));
    } catch {
      return ROWS_INIT;
    }
  });

  useEffect(() => {
    localStorage.setItem("passport_section1", JSON.stringify(rows));
  }, [rows]);

  const setValue = (idx, v) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, value: v } : r)));

  return (
    <div style={page}>
      <button onClick={onBack} style={{ ...btn, marginBottom: 12 }}>
        ⬅ Назад в меню
      </button>

      <h1 style={h1}>Энергопаспорт</h1>

      {/* ===== 1. Расчётные условия ===== */}
      <div style={panel}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>1. Расчётные условия</h3>

        <table style={tbl}>
          <thead>
            <tr>
              <th style={th} width="6%">№ п/п</th>
              <th style={th} width="44%">
                Наименование расчётных параметров
              </th>
              <th style={th} width="18%">Обозначение параметра</th>
              <th style={th} width="16%">Единица измерения</th>
              <th style={th} width="16%">Расчётное значение</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.n}>
                <td style={td}>{r.n}</td>
                <td style={tdLeft}>{r.name}</td>
                <td style={td}>{r.sym}</td>
                <td style={td}>{r.unit}</td>
                <td style={td}>
                  <input
                    style={inp}
                    type="text"
                    inputMode="decimal"
                    placeholder="—"
                    value={r.value}
                    onChange={(e) => setValue(idx, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* дальше будем добавлять разделы 2..N формы */}
    </div>
  );
}
