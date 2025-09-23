// src/pages/EnergyPassport.jsx
import React, { useEffect, useState } from "react";

export default function EnergyPassport({ onBack }) {
  // простое автосохранение черновика (потом расширим)
  const [org, setOrg] = useState(() => localStorage.getItem("ep_org") ?? "");
  const [inn, setInn] = useState(() => localStorage.getItem("ep_inn") ?? "");
  const [address, setAddress] = useState(() => localStorage.getItem("ep_address") ?? "");
  const [responsible, setResponsible] = useState(() => localStorage.getItem("ep_resp") ?? "");
  const [date, setDate] = useState(() => localStorage.getItem("ep_date") ?? "");

  useEffect(() => {
    localStorage.setItem("ep_org", org);
    localStorage.setItem("ep_inn", inn);
    localStorage.setItem("ep_address", address);
    localStorage.setItem("ep_resp", responsible);
    localStorage.setItem("ep_date", date);
  }, [org, inn, address, responsible, date]);

  // стили как в остальных страницах
  const page = { background: "#0b1220", color: "#e8eefc", minHeight: "100vh", padding: 18, fontFamily: "Inter, system-ui, Arial" };
  const h1 = { fontSize: 32, margin: "6px 0 14px" };
  const panel = { background: "#0f172a", border: "1px solid #374151", borderRadius: 14, padding: 14, marginBottom: 14 };
  const row = { display: "grid", gridTemplateColumns: "240px 1fr", gap: 10, alignItems: "center", marginBottom: 8 };
  const inp = { background: "#111827", color: "#e8eefc", border: "1px solid #374151", borderRadius: 10, padding: "10px 12px", width: "100%" };
  const btn = { background: "#111827", color: "#e8eefc", border: "1px solid #374151", borderRadius: 12, padding: "10px 14px", cursor: "pointer" };
  const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
  const th = { textAlign: "left", borderBottom: "1px solid #263041", padding: 8, background: "#0f172a", position: "sticky", top: 0 };
  const td = { borderBottom: "1px solid #263041", padding: 8 };

  return (
    <div style={page}>
      <button onClick={onBack} style={{ ...btn, marginBottom: 12 }}>⬅ Назад в меню</button>
      <h1 style={h1}>Энергопаспорт</h1>

      {/* Раздел 1. Общие сведения (каркас) */}
      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Раздел 1. Общие сведения об объекте</h3>
        <div style={row}><div>Наименование организации</div><input style={inp} value={org} onChange={e => setOrg(e.target.value)} /></div>
        <div style={row}><div>БИН/ИИН</div><input style={inp} value={inn} onChange={e => setInn(e.target.value)} /></div>
        <div style={row}><div>Адрес</div><input style={inp} value={address} onChange={e => setAddress(e.target.value)} /></div>
        <div style={row}><div>Ответственный за энергоменеджмент</div><input style={inp} value={responsible} onChange={e => setResponsible(e.target.value)} /></div>
        <div style={row}><div>Дата составления</div><input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>

      {/* Раздел 2. Энергоресурсы (пока примеры строк) */}
      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Раздел 2. Потребляемые энергоресурсы</h3>
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>№</th>
              <th style={th}>Энергоноситель</th>
              <th style={th}>Ед.</th>
              <th style={th}>Годовой объём</th>
              <th style={th}>Затраты, ₸</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>1</td>
              <td style={td}>Электроэнергия</td>
              <td style={td}>кВт·ч</td>
              <td style={td}><input style={inp} placeholder="0" /></td>
              <td style={td}><input style={inp} placeholder="0" /></td>
            </tr>
            <tr>
              <td style={td}>2</td>
              <td style={td}>Теплоэнергия</td>
              <td style={td}>Гкал</td>
              <td style={td}><input style={inp} placeholder="0" /></td>
              <td style={td}><input style={inp} placeholder="0" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Раздел 3. Мероприятия по энергосбережению (скелет) */}
      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Раздел 3. Мероприятия по энергосбережению</h3>
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>№</th>
              <th style={th}>Наименование мероприятия</th>
              <th style={th}>Эффект, т.у.т</th>
              <th style={th}>Эффект, ₸</th>
              <th style={th}>Затраты, ₸</th>
              <th style={th}>Окупаемость, лет</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>1</td>
              <td style={td}><input style={inp} placeholder="Например: замена светильников на LED" /></td>
              <td style={td}><input style={inp} placeholder="0" /></td>
              <td style={td}><input style={inp} placeholder="0" /></td>
              <td style={td}><input style={inp} placeholder="0" /></td>
              <td style={td}><input style={inp} placeholder="0" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Здесь дальше будем дополнять остальные разделы формы под норматив */}
    </div>
  );
}
