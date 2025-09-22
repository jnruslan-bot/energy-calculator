// src/pages/Production.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

/**
 * Таблица 1: ручной ввод (Разделы/Пункты, натур/деньги, ед.изм., себестоимость)
 * Для КАЖДОГО пункта строится ОДНА таблица удельного потребления:
 *   - знаменатель = натур. этого пункта по годам
 *   - строки = ТЭР из калькулятора потребления
 *   - по каждому году сразу ДВА значения: (ТЭР/ед.табл.1) и (тг/ед.табл.1)
 * Экспорт Excel: "Таблица 1" + по листу на каждый пункт.
 */

const cleanNum = (s) =>
  s === "" || s === null || s === undefined ? "" : String(s).replace(",", ".");
const numberFmt = (n, d = 3) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: d }).format(n)
    : "—";
const makeEmptyData = (years) =>
  Array.from({ length: years }, () => ({ nat: "", money: "" }));

const newItem = (years) => ({
  id: crypto.randomUUID(),
  name: "",
  unitNat: "", // ед. изм. натуральная (ручной ввод: кВт, т, л, Гкал…)
  include: true, // флаг пусть остаётся — на будущее
  data: makeEmptyData(years),
});

const newGroup = (years) => ({
  id: crypto.randomUUID(),
  title: "Производство",
  items: [newItem(years)],
});

export default function Production({ onBack }) {
  // Горизонт берём такой же, как и у "Потребления"
  const thisYear = new Date().getFullYear();
  const meta = JSON.parse(localStorage.getItem("energy_calc_meta_v2") || "{}");
  const [startYear, setStartYear] = useState(
    meta.startYear ?? thisYear - 5 + 1
  );
  const [yearsCount, setYearsCount] = useState(meta.yearsCount ?? 5);

  // Разделы/пункты
  const [groups, setGroups] = useState(() => {
    const raw = localStorage.getItem("energy_production_v1");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.map((g) => ({
          ...g,
          items: (g.items || []).map((it) => ({
            ...it,
            data: (it.data || [])
              .slice(0, yearsCount)
              .concat(makeEmptyData(yearsCount - (it.data || []).length)),
          })),
        }));
      } catch {}
    }
    return [newGroup(yearsCount)];
  });

  // Список лет
  const years = useMemo(
    () => Array.from({ length: yearsCount }, (_, i) => startYear + i),
    [startYear, yearsCount]
  );

  // Подгонка длины рядов по смене горизонта
  useEffect(() => {
    setGroups((gs) =>
      gs.map((g) => ({
        ...g,
        items: g.items.map((it) => {
          const d = it.data || [];
          if (d.length === yearsCount) return it;
          if (d.length < yearsCount)
            return { ...it, data: d.concat(makeEmptyData(yearsCount - d.length)) };
          return { ...it, data: d.slice(0, yearsCount) };
        }),
      }))
    );
  }, [yearsCount]);

  // Автосохранение + синхронизация меты (с потреблением)
  useEffect(() => {
    localStorage.setItem("energy_production_v1", JSON.stringify(groups));
    localStorage.setItem(
      "energy_calc_meta_v2",
      JSON.stringify({
        startYear,
        yearsCount,
        title: meta.title || "Расчёт по предприятию",
      })
    );
  }, [groups, startYear, yearsCount]);

  // CRUD
  const addGroup = () => setGroups((gs) => [...gs, newGroup(yearsCount)]);
  const removeGroup = (gid) =>
    setGroups((gs) => gs.filter((g) => g.id !== gid));
  const addItem = (gid) =>
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid ? { ...g, items: [...g.items, newItem(yearsCount)] } : g
      )
    );
  const removeItem = (gid, iid) =>
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid
          ? { ...g, items: g.items.filter((i) => i.id !== iid) }
          : g
      )
    );
  const updateGroup = (gid, patch) =>
    setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
  const updateItem = (gid, iid, patch) =>
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid
          ? {
              ...g,
              items: g.items.map((i) => (i.id === iid ? { ...i, ...patch } : i)),
            }
          : g
      )
    );

  // ===== CSV Экспорт/Импорт для Таблицы 1 =====
  const fileRef = useRef(null);

  const exportCSV = () => {
    const head = [
      ["Начальный год", startYear],
      ["Кол-во лет", yearsCount],
      [],
    ];
    const rows = [];
    groups.forEach((g, gi) => {
      rows.push([`# Раздел ${gi + 1}`, g.title]);
      g.items.forEach((it) => {
        rows.push([
          "Пункт",
          it.name,
          it.unitNat,
          it.include ? "1" : "0",
          ...years.flatMap((_, idx) => [
            String(it.data[idx]?.nat ?? "").replace(".", ","),
            String(it.data[idx]?.money ?? "").replace(".", ","),
          ]),
        ]);
      });
      rows.push([]);
    });

    const all = [...head, ...rows];
    const csv = all
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "production.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = String(reader.result)
          .split(/\r?\n/)
          .map((l) => l.trim());
        let sy = startYear,
          yc = yearsCount;
        for (const l of lines) {
          if (l.startsWith('"Начальный год"'))
            sy = parseInt(l.split(";")[1].replace(/(^"|"$)/g, ""));
          if (l.startsWith('"Кол-во лет"'))
            yc = parseInt(l.split(";")[1].replace(/(^"|"$)/g, ""));
        }
        setStartYear(sy);
        setYearsCount(yc);

        const out = [];
        let cur = null;
        for (const l of lines) {
          if (!l) continue;
          if (l.startsWith('"# Раздел')) {
            const title = l.split(";")[1]?.replace(/(^"|"$)/g, "") ?? "Раздел";
            cur = { id: crypto.randomUUID(), title, items: [] };
            out.push(cur);
            continue;
          }
          if (l.startsWith('"Пункт"')) {
            const cells = l
              .split(";")
              .map((s) => s.replace(/^"|"$/g, "").replace(/""/g, '"'));
            const name = cells[1] ?? "";
            const unitNat = cells[2] ?? "";
            const include = (cells[3] ?? "1") === "1";
            const data = [];
            for (let i = 0; i < yc; i++) {
              const nat = (cells[4 + i * 2] ?? "").replace(",", ".");
              const money = (cells[5 + i * 2] ?? "").replace(",", ".");
              data.push({ nat, money });
            }
            cur?.items.push({
              id: crypto.randomUUID(),
              name,
              unitNat,
              include,
              data,
            });
          }
        }
        if (out.length) setGroups(out);
      } catch (e) {
        alert("Не удалось импортировать CSV: " + e.message);
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  };

  // ===== Excel Экспорт =====
const exportExcel = () => {
  const wb = XLSX.utils.book_new();

  // --- Лист "Таблица 1" (как было) ---
  const header1 = [
    "Раздел",
    "Пункт",
    "Ед. изм. (нат.)",
    "Учитывать",
    ...years.flatMap((y) => [`Натур. ${y}`, `Деньги ${y} (тг)`]),
    ...years.map((y) => `Себестоимость ${y} (₸/ед)`),
  ];
  const aoa1 = [header1];

  groups.forEach((g) => {
    g.items.forEach((it) => {
      const costs = it.data.map((d) => {
        const n = parseFloat(cleanNum(d.nat));
        const m = parseFloat(cleanNum(d.money));
        return Number.isFinite(n) && n > 0 && Number.isFinite(m) ? m / n : "";
      });
      aoa1.push([
        g.title,
        it.name,
        it.unitNat,
        it.include ? "да" : "нет",
        ...it.data.flatMap((d) => [d.nat, d.money]),
        ...costs,
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa1), "Таблица 1");

  // --- Берём строки потребления из калькулятора один раз ---
  const consRows = JSON.parse(localStorage.getItem("energy_calc_rows_v2") || "[]");

  // === По ЛИСТУ на КАЖДЫЙ пункт Таблицы 1 ===
groups.forEach((g) => {
  g.items.forEach((it, idx) => {
    // значения по годам
    const natByYear = years.map((_, i) => {
      const v = parseFloat(cleanNum(it.data?.[i]?.nat));
      return Number.isFinite(v) ? v : "";
    });
    const moneyByYear = years.map((_, i) => {
      const v = parseFloat(cleanNum(it.data?.[i]?.money));
      return Number.isFinite(v) ? v : "";
    });
    const costByYear = years.map((_, i) => {
      const n = parseFloat(cleanNum(it.data?.[i]?.nat));
      const m = parseFloat(cleanNum(it.data?.[i]?.money));
      return Number.isFinite(n) && n > 0 && Number.isFinite(m) ? m / n : "";
    });

    // Шапка как в примере
    const header = [
      "№",
      "производство/ выработка/ передача",
      "ед.изм.",
      "", // под ед.изм. — значение
      ...years,
    ];

    // Три строки: натур / деньги / себестоимость
    const aoa = [header];
    aoa.push([
      idx + 1,
      it.name || "",
      "в натур.выражении",
      it.unitNat || "",
      ...natByYear,
    ]);
    aoa.push(["", "", "в ден.выражении", "тг", ...moneyByYear]);
    aoa.push(["", "", "себестоимость", "тг/ед", ...costByYear]); // <-- тг/ед

    const wsProd = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(
      wb,
      wsProd,
      `Производство — ${truncateName(it.name || "пункт")}`
    );

    // Лист "Удельное потребление — <пункт>"
    const unitNat = it.unitNat || "ед. табл.1";
    const denom = years.map((_, i) => {
      const v = parseFloat(cleanNum(it.data?.[i]?.nat));
      return Number.isFinite(v) ? v : 0;
    });

    const headerSpec = [
      "№",
      "ТЭР",
      "Ед. изм.",
      ...years.flatMap((y) => [`${y} ТЭР/${unitNat}`, `${y} тг/${unitNat}`]),
    ];
    const aoaSpec = [headerSpec];

    consRows.forEach((r, rIdx) => {
      const qtyByYear = years.map((_, i) => {
        const q = parseFloat(cleanNum(r.data?.[i]?.qty));
        return Number.isFinite(q) ? q : 0;
      });
      const moneyY = years.map((_, i) => {
        const m = parseFloat(cleanNum(r.data?.[i]?.money));
        return Number.isFinite(m) ? m : 0;
      });

      const rowValues = years.flatMap((_, i) => [
        denom[i] > 0 ? qtyByYear[i] / denom[i] : "",
        denom[i] > 0 ? moneyY[i] / denom[i] : "",
      ]);

      aoaSpec.push([rIdx + 1, r.name || "", r.unit || "", ...rowValues]);
    });

    const wsSpec = XLSX.utils.aoa_to_sheet(aoaSpec);
    XLSX.utils.book_append_sheet(
      wb,
      wsSpec,
      `Уд. расход — ${truncateName(it.name || "пункт")}`
    );
        // ==== Таблицы отклонений (экспорт) ====
    const natVals = years.map((_, i) => {
      const v = parseFloat((it.data?.[i]?.nat ?? "").toString().replace(",", "."));
      return Number.isFinite(v) ? v : 0;
    });
    const moneyVals = years.map((_, i) => {
      const v = parseFloat((it.data?.[i]?.money ?? "").toString().replace(",", "."));
      return Number.isFinite(v) ? v : 0;
    });

    const natDev = years.map((y, i) => {
      const v = natVals[i];
      if (i === 0) return [y, v, "", ""];
      const p = natVals[i - 1];
      const dAbs = v - p;
      const dPct = p !== 0 ? (v / p - 1) * 100 : "";
      return [y, v, dAbs, dPct];
    });
    const moneyDev = years.map((y, i) => {
      const v = moneyVals[i];
      if (i === 0) return [y, v, "", ""];
      const p = moneyVals[i - 1];
      const dAbs = v - p;
      const dPct = p !== 0 ? (v / p - 1) * 100 : "";
      return [y, v, dAbs, dPct];
    });

    const headerDevNat = [
      "Год",
      `Значение (${it.unitNat || "нат."})`,
      "Отклонение (ед.)",
      "Отклонение (%)",
    ];
    const headerDevMoney = [
      "Год",
      "Значение (тг)",
      "Отклонение (ед.)",
      "Отклонение (%)",
    ];

    const wsDevNat = XLSX.utils.aoa_to_sheet([headerDevNat, ...natDev]);
    const wsDevMoney = XLSX.utils.aoa_to_sheet([headerDevMoney, ...moneyDev]);

    XLSX.utils.book_append_sheet(
      wb,
      wsDevNat,
      `Откл. натур — ${truncateName(it.name || "пункт")}`
    );
    XLSX.utils.book_append_sheet(
      wb,
      wsDevMoney,
      `Откл. тг — ${truncateName(it.name || "пункт")}`
    );

  });
});


  XLSX.writeFile(wb, `production_${new Date().getFullYear()}.xlsx`);
};


  const truncateName = (s) =>
    (s || "").slice(0, 20).replace(/[\\/?*\[\]:]/g, "_");
// === Графики и таблицы отклонений (общие) ===
function buildDeviations(years, values) {
  // values: массив чисел по годам
  return years.map((y, i) => {
    const v = Number.isFinite(values[i]) ? values[i] : 0;
    if (i === 0) return { year: y, value: v, dAbs: null, dPct: null };
    const p = Number.isFinite(values[i - 1]) ? values[i - 1] : 0;
    const dAbs = v - p;
    const dPct = p !== 0 ? (v / p - 1) * 100 : null;
    return { year: y, value: v, dAbs, dPct };
  });
}

function LineChart({ title, years, values, height = 220 }) {
  const padding = { top: 20, right: 12, bottom: 24, left: 52 };
  const W = 720, H = height, plotW = W - padding.left - padding.right, plotH = H - padding.top - padding.bottom;

  const finiteVals = values.filter((v) => Number.isFinite(v));
  let minY = 0, maxY = 1;
  if (finiteVals.length) {
    minY = Math.min(0, ...finiteVals);
    maxY = Math.max(...finiteVals);
    if (minY === maxY) maxY = minY + (minY === 0 ? 1 : Math.abs(minY) * 0.1);
  }

  const x = (i) => padding.left + (years.length > 1 ? (i * plotW) / (years.length - 1) : plotW / 2);
  const y = (v) => padding.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

  const pts = years.map((_, i) => `${x(i)},${y(Number.isFinite(values[i]) ? values[i] : 0)}`).join(" ");

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
     {title && (
  <div style={{ fontWeight: 600, margin: "6px 0 6px 0" }}>{title}</div>
)}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "min(900px,100%)", height, background: "#0d1424", border: "1px solid #263041", borderRadius: 10 }}>
        <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="#0f172a" stroke="#263041" />
        {[0,0.25,0.5,0.75,1].map((t,i)=>(
          <g key={i}>
            <line x1={padding.left} x2={padding.left+plotW} y1={padding.top+plotH*t} y2={padding.top+plotH*t} stroke="#263041" strokeDasharray="4 4"/>
            <text x={padding.left-8} y={padding.top+plotH*t+4} textAnchor="end" fontSize="11" fill="#9fb2d7">
              {Number.isFinite(minY) && Number.isFinite(maxY) ? new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(minY+(maxY-minY)*(1-t)) : "—"}
            </text>
          </g>
        ))}
        {years.map((yy,i)=>(
          <g key={yy}>
            <line x1={x(i)} x2={x(i)} y1={padding.top+plotH} y2={padding.top+plotH+6} stroke="#9fb2d7"/>
            <text x={x(i)} y={padding.top+plotH+18} textAnchor="middle" fontSize="11" fill="#9fb2d7">{yy}</text>
          </g>
        ))}
        {finiteVals.length > 0 && (
          <>
            <polyline points={pts} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
            {years.map((_,i)=>(
              <circle key={i} cx={x(i)} cy={y(Number.isFinite(values[i])?values[i]:0)} r="3" fill="#60a5fa"/>
            ))}
          </>
        )}
      </svg>
    </div>
  );
}

function DeviationTable({ rows, valueLabel }) {
  const td = { borderBottom: "1px solid #263041", padding: 6 };
  const th = { ...td, fontWeight: 600 };
  return (
    <div style={{ overflowX: "auto", marginTop: 8, marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Год</th>
            <th style={th}>{valueLabel}</th>
            <th style={th}>Отклонение (ед.)</th>
            <th style={th}>Отклонение (%)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r)=>(
            <tr key={r.year}>
              <td style={td}>{r.year}</td>
              <td style={td}>{numberFmt(r.value, 3)}</td>
              <td style={td}>{r.dAbs === null ? "—" : numberFmt(r.dAbs, 3)}</td>
              <td style={td}>{r.dPct === null ? "—" : `${numberFmt(r.dPct, 2)} %`}</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Collapsible({ title, children, defaultOpen = false }) {
  return (
    <details
      open={defaultOpen}
      style={{
        margin: "12px 0 16px",
        border: "1px solid #263041",
        borderRadius: 10,
        background: "#0d1424",
        padding: "6px 10px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 600,
          color: "#e8eefc",
          outline: "none",
          listStyle: "none",
        }}
      >
        {title}
      </summary>
      <div style={{ marginTop: 10 }}>{children}</div>
    </details>
  );
}

  // ===== Стили =====
  const page = {
    background: "#0b1220",
    color: "#e8eefc",
    minHeight: "100vh",
    padding: 18,
    fontFamily: "Inter, system-ui, Arial",
  };
  const panel = {
    background: "#0f172a",
    border: "1px solid #374151",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  };
  const btn = {
    background: "#111827",
    color: "#e8eefc",
    border: "1px solid #374151",
    borderRadius: 12,
    padding: "8px 12px",
    cursor: "pointer",
  };
  const btnDanger = {
    ...btn,
    borderColor: "#ff4444",
    color: "#ffb4b4",
    background: "#2b1111",
  };
  const inp = {
    background: "#111827",
    color: "#e8eefc",
    border: "1px solid #374151",
    borderRadius: 10,
    padding: "8px 10px",
    minWidth: 200,
    outline: "none",
  };
  const inpNum = { ...inp, minWidth: 110, textAlign: "right" };
  const td = { borderBottom: "1px solid #263041", padding: 6, verticalAlign: "middle" };
  const th = { ...td, fontWeight: 600 };
// === Компактный контейнер и таблицы (новое) ===
const container = { width: "100%", margin: "0 auto" };


const tableBase = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  tableLayout: "fixed", // фиксированная сетка — колонки не «плавают»
};

const thC = { ...th, textAlign: "center", whiteSpace: "nowrap", padding: "8px 10px" };
const tdText = { ...td, textAlign: "left", whiteSpace: "nowrap", padding: "6px 10px" };
const tdNum  = { ...td, textAlign: "right", whiteSpace: "nowrap", padding: "6px 10px" };
const tdInput = { ...tdNum, width: 92 };
const sumRow = { fontWeight: 700, background: "#1f2937" };

// слегка ужмём поля ввода
const inpCompact = { ...inp, padding: "6px 8px", minWidth: 180 };
const inpNumCompact = { ...inpCompact, minWidth: 88, textAlign: "right" };

  // ===== Рендер =====
  // Данные потребления (один раз, чтобы не читать в каждом рендере)
  const consRows = useMemo(
    () => JSON.parse(localStorage.getItem("energy_calc_rows_v2") || "[]"),
    [groups, yearsCount, startYear]
  );

  return (
    <div style={page}>
      <div style={container}>

      <button onClick={onBack} style={{ ...btn, marginBottom: 12 }}>
        ⬅ Назад в меню
      </button>

      {/* Панель управления */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div>Начальный год</div>
          <input
            style={inp}
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(parseInt(e.target.value || thisYear))}
          />
        </div>
        <div>
          <div>Кол-во лет</div>
          <input
            style={inp}
            type="number"
            min={1}
            max={10}
            value={yearsCount}
            onChange={(e) =>
              setYearsCount(Math.max(1, Math.min(10, parseInt(e.target.value || 5))))
            }
          />
        </div>

        <button style={btn} onClick={addGroup}>+ Добавить раздел</button>
        <button style={btn} onClick={() => fileRef.current?.click()}>Импорт CSV</button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])}
          style={{ display: "none" }}
        />
        <button style={btn} onClick={exportCSV}>Экспорт CSV</button>
        <button style={btn} onClick={exportExcel}>Экспорт Excel</button>
      </div>

      {/* ===== Таблица 1: Ручной ввод ===== */}
      {groups.map((g) => (
        <div key={g.id} style={panel}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              style={inp}
              value={g.title}
              onChange={(e) => updateGroup(g.id, { title: e.target.value })}
            />
            <button style={btn} onClick={() => addItem(g.id)}>+ Пункт</button>
            <button style={btnDanger} onClick={() => removeGroup(g.id)}>Удалить раздел</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
<thead>
  <tr>
    <th style={th}>№</th>
    <th style={th}>производство/ выработка/ передача</th>
    <th style={th}>ед.изм.</th>
    <th style={th}></th> {/* здесь будут единицы измерения */}
    {years.map((y) => (
      <th key={`y-${y}`} style={th}>{y}</th>
    ))}
  </tr>
</thead>


<tbody>
  {g.items.map((it, idx) => {
     return (
      <React.Fragment key={it.id}>
        <tr>
          <td style={td} rowSpan={3}>{idx + 1}</td>
       <td style={td} rowSpan={3}>
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <input
      style={inp}
      placeholder="Название пункта"
      value={it.name}
      onChange={(e) => updateItem(g.id, it.id, { name: e.target.value })}
    />
    <button
      style={{
        background: "#2b1111",
        color: "#ffb4b4",
        border: "1px solid #ff4444",
        borderRadius: 8,
        padding: "4px 8px",
        cursor: "pointer",
      }}
      onClick={() => {
        if (window.confirm("Удалить этот пункт?")) {
          removeItem(g.id, it.id);
        }
      }}
    >
      ✕
    </button>
  </div>
</td>

          <td style={td}>в натур.выражении</td>
          <td style={td}>
            <input
              style={inp}
              placeholder="ед. изм."
              value={it.unitNat}
              onChange={(e) => updateItem(g.id, it.id, { unitNat: e.target.value })}
            />
          </td>
          {years.map((_, i) => (
  <td key={`nat-${i}`} style={td}>
    <input
      style={inpNum}
      placeholder="0"
      value={it.data[i]?.nat ?? ""}
      onChange={(e) => {
        const v = cleanNum(e.target.value);
        const data = it.data.map((d, ii) => (ii === i ? { ...d, nat: v } : d));
        updateItem(g.id, it.id, { data });
      }}
    />
  </td>
))}
        </tr>
        <tr>
          <td style={td}>в ден.выражении</td>
          <td style={td}>тг</td>
         {years.map((_, i) => (
  <td key={`money-${i}`} style={td}>
    <input
      style={inpNum}
      placeholder="0"
      value={it.data[i]?.money ?? ""}
      onChange={(e) => {
        const v = cleanNum(e.target.value);
        const data = it.data.map((d, ii) => (ii === i ? { ...d, money: v } : d));
        updateItem(g.id, it.id, { data });
      }}
    />
  </td>
))}
        </tr>
        <tr>
         <td style={td}>себестоимость</td>
  <td style={td}>тг/ед</td>
  {years.map((_, i) => {
    const n = parseFloat(cleanNum(it.data[i]?.nat));
    const m = parseFloat(cleanNum(it.data[i]?.money));
    const cost = Number.isFinite(n) && n > 0 && Number.isFinite(m) ? m / n : NaN;
    return (
      <td key={`cost-${i}`} style={td}>
        {Number.isFinite(cost) ? numberFmt(cost, 2) : "—"}
      </td>
    );
  })}
</tr>
      </React.Fragment>
    );
  })}
</tbody>
            </table>
          </div>
        </div>
      ))}
{/* === Графики по ТАБЛИЦЕ 1 (для каждого пункта производства) === */}
{groups.map((g) => (
  <div key={`charts-${g.id}`} style={panel}>
    <h3 style={{ margin: "0 0 12px 0" }}>Графики по Таблице 1 — {g.title}</h3>

    {g.items.map((it) => {
      const natVals = years.map((_, i) => {
        const v = parseFloat((it.data?.[i]?.nat ?? "").toString().replace(",", "."));
        return Number.isFinite(v) ? v : 0;
      });
      const moneyVals = years.map((_, i) => {
        const v = parseFloat((it.data?.[i]?.money ?? "").toString().replace(",", "."));
        return Number.isFinite(v) ? v : 0;
      });
      const natDev = buildDeviations(years, natVals);
      const moneyDev = buildDeviations(years, moneyVals);

      return (
        <div key={`chart-item-${it.id}`} style={{ marginBottom: 32 }}>
          <h4 style={{ margin: "0 0 8px 0" }}>{it.name || "пункт"}</h4>

          {/* Натуральные единицы */}
          <Collapsible
            title={`Выпуск в натур. ед. (${it.unitNat || "ед. изм."})`}
            defaultOpen={true}
          >
            {/* Убрали дублирующий заголовок */}
            <LineChart title="" years={years} values={natVals} />
            <DeviationTable
              rows={natDev}
              valueLabel={`Значение (${it.unitNat || "нат."})`}
            />
          </Collapsible>

          {/* Деньги — открыты сразу */}
          <Collapsible title="Выпуск в деньгах (тг)" defaultOpen={true}>
            <LineChart title="" years={years} values={moneyVals} />
            <DeviationTable rows={moneyDev} valueLabel="Значение (тг)" />
          </Collapsible>
        </div>
      );
    })}
  </div>
))}


   {/* ===== Удельное потребление — ОДНА таблица на КАЖДЫЙ пункт ===== */}
{groups.map((g) => (
  <div key={`spec-group-${g.id}`} style={panel}>
    <h3 style={{ margin: "0 0 12px 0" }}>Раздел: {g.title}</h3>

    {g.items.map((it) => {
      const denom = years.map((_, i) => {
        const v = parseFloat(cleanNum(it.data?.[i]?.nat));
        return Number.isFinite(v) ? v : 0;
      });
      const unitNat = it.unitNat || "ед. табл.1";

      return (
        <div key={`spec-item-${it.id}`} style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 6px 0" }}>
            Удельное потребление — {it.name || "пункт"} (раздел: {g.title})
          </h4>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th} colSpan={4}>Потребление ТЭР</th>
                  <th style={th} colSpan={1}>производство/ выработка/ передача</th>
                  <th style={th} colSpan={years.length}>
                    {(it.name || "объект")} — Удельное потребление ТЭР
                  </th>
                </tr>
                <tr>
                  <th style={th}>№</th>
                  <th style={th}>ТЭР</th>
                  <th style={th}>Ед. изм.</th>
                  <th style={th}>потребление</th>
                  <th style={th}>ед.изм.</th>
                  {years.map((y) => (
                    <th key={`hdr-${it.id}-${y}`} style={th}>{y}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {consRows.map((r, idx) => {
                  const qtyByYear = years.map((_, i) => {
                    const q = parseFloat(cleanNum(r.data?.[i]?.qty));
                    return Number.isFinite(q) ? q : 0;
                  });
                  const consumptionCell = qtyByYear[0];
                  const perUnitUnit = `${r.unit || ""}/${unitNat}`;

                  return (
                    <tr key={`spec-${it.id}-${idx}`}>
                      <td style={td}>{idx + 1}</td>
                      <td style={td}>{r.name || ""}</td>
                      <td style={td}>{r.unit || ""}</td>
                      <td style={td}>
                        {consumptionCell ? numberFmt(consumptionCell, 3) : "—"}
                      </td>
                      <td style={td}>{perUnitUnit}</td>
                      {years.map((_, i) => (
                        <td key={`val-${it.id}-${idx}-${i}`} style={td}>
                          {denom[i] > 0 ? numberFmt(qtyByYear[i] / denom[i], 6) : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {/* ИТОГО */}
                <tr style={{ fontWeight: "bold", background: "#1f2937" }}>
                  <td style={td} colSpan={4}>ИТОГО</td>
                  <td style={td}>{`тут/${unitNat}`}</td>
                  {years.map((_, i) => {
                    const sum = consRows.reduce((acc, r) => {
                      const q = parseFloat(cleanNum(r.data?.[i]?.qty));
                      return denom[i] > 0 && Number.isFinite(q) ? acc + q / denom[i] : acc;
                    }, 0);
                    return (
                      <td key={`sum-${i}`} style={td}>
                        {sum > 0 ? numberFmt(sum, 6) : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
                    {/* === Графики и таблицы отклонений по каждой строке ТЭР === */}
          {consRows.map((r, idx) => {
            // серия "удельное потребление" для строки r
            const qtyByYear = years.map((_, i) => {
              const q = parseFloat(cleanNum(r.data?.[i]?.qty));
              return Number.isFinite(q) ? q : 0;
            });

            const perUnit = years.map((_, i) =>
              denom[i] > 0 ? qtyByYear[i] / denom[i] : 0
            );

            const dev = buildDeviations(years, perUnit);
            const perUnitUnit = `${r.unit || ""}/${unitNat}`;

            return (
              <div key={`chart-spec-${it.id}-${idx}`} style={{ margin: "12px 0 24px" }}>
                <LineChart
                  title={`${r.name || "ТЭР"} — уд. потребление (${perUnitUnit})`}
                  years={years}
                  values={perUnit}
                />
                <DeviationTable
                  rows={dev}
                  valueLabel={`Значение (${perUnitUnit})`}
                />
              </div>
            );
          })}

          {/* === ИТОГО: сумма удельных по всем ТЭР === */}
          {(() => {
            const sumPerUnit = years.map((_, i) => {
              if (denom[i] <= 0) return 0;
              const sumQty = consRows.reduce((acc, r) => {
                const q = parseFloat(cleanNum(r.data?.[i]?.qty));
                return Number.isFinite(q) ? acc + q : acc;
              }, 0);
              return sumQty / denom[i];
            });
            const devSum = buildDeviations(years, sumPerUnit);
            return (
              <div style={{ margin: "12px 0 8px" }}>
                <LineChart
                  title={`ИТОГО — удельное потребление (тут/${unitNat})`}
                  years={years}
                  values={sumPerUnit}
                />
                <DeviationTable
                  rows={devSum}
                  valueLabel={`Значение (тут/${unitNat})`}
                />
              </div>
            );
          })()}

        </div>
      );
    })}
  </div>
))}
</div>
</div>
);
}
