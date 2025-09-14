// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

/**
 * ЭНЕРГОУЧЁТ — Калькулятор ресурсов с горизонтом 5 лет
 * - Полный справочник (Приказ №387) + "Свой ресурс…"
 * - Ввод по годам: Кол-во, Сумма (тенге)
 * - Автосчёт: т.у.т = Кол-во × Коэф.; Себестоимость = Сумма/Кол-во
 * - Итоги по годам
 * - Экспорт/Импорт CSV
 * - Автосохранение в localStorage
 */

// ======= СПРАВОЧНИК РЕСУРСОВ ==================================================
const RESOURCES = [
  { key: "coal_hard", name: "Уголь каменный", unit: "т", coeff: 0.626 },
  { key: "coal_briquette_hard", name: "Брикеты, шарики из угля каменного", unit: "т", coeff: 0.8 },
  { key: "lignite", name: "Лигнит (уголь бурый)", unit: "т", coeff: 0.408 },
  { key: "crude_oil", name: "Нефть сырая", unit: "т", coeff: 1.43 },
  { key: "gas_condensate", name: "Конденсат газовый", unit: "т", coeff: 1.43 },
  { key: "gas_natural", name: "Газ природный", unit: "м³", coeff: 0.00117 },
  { key: "gas_associated", name: "Газ нефтяной попутный", unit: "м³", coeff: 0.00115 },
  { key: "coke_coal", name: "Кокс и полукокс из угля", unit: "т", coeff: 0.99 },
  { key: "wood_waste", name: "Опилки и отходы древесные", unit: "т", coeff: 0.361 },
  { key: "gasoline_aviation", name: "Бензин авиационный", unit: "л", coeff: 0.001093 },
  { key: "gasoline_motor", name: "Бензин моторный", unit: "л", coeff: 0.001103 },
  { key: "jet_fuel_gasoline_type", name: "Топливо реактивное типа бензина", unit: "л", coeff: 0.001131 },
  { key: "kerosene", name: "Керосин", unit: "л", coeff: 0.00119 },
  { key: "diesel", name: "Дизельное топливо (Газойли)", unit: "л", coeff: 0.001261 },
  { key: "fuel_oil_heavy", name: "Мазут топочный", unit: "т", coeff: 1.379 },
  { key: "fuel_domestic", name: "Топливо печное бытовое", unit: "т", coeff: 1.413 },
  { key: "lpg", name: "Газ сжиженный (пропан и бутан)", unit: "т", coeff: 1.57 },
  { key: "gas_refined", name: "Газы очищенные (этилен, пропилен, бутилен, бутадиен и пр.)", unit: "т", coeff: 1.57 },
  { key: "gas_debenzined", name: "Газ отбензиненный", unit: "м³", coeff: 0.00157 },
  { key: "coke_petroleum", name: "Кокс нефтяной и сланцевый", unit: "т", coeff: 1.08 },
  { key: "bitumen", name: "Битумы нефтяной и сланцевый", unit: "т", coeff: 0.544 },
  { key: "gas_blast_furnace", name: "Газ доменный", unit: "м³", coeff: 0.00014 },
  { key: "gas_coke", name: "Газ коксовый", unit: "м³", coeff: 0.00057 },
  { key: "gas_refinery", name: "Газ, полученный перегонкой на НПЗ", unit: "м³", coeff: 0.00117 },
  { key: "electricity", name: "Электроэнергия", unit: "кВт*ч", coeff: 0.000123 },
  { key: "heat", name: "Теплоэнергия", unit: "Гкал", coeff: 0.143 },
  { key: "anthracite", name: "Антрацит", unit: "т", coeff: 0.9348 },
  { key: "wood", name: "Древесина", unit: "т", coeff: 0.35 },
  { key: "lignite_briquette", name: "Брикеты из угля бурого (лигнита)", unit: "т", coeff: 0.556 },
  { key: "coal_coking", name: "Уголь каменный коксующий", unit: "т", coeff: 0.982 },
  { key: "coal_energy_high_grade", name: "Уголь энергетический >23,865 МДж/кг", unit: "т", coeff: 0.594 },
  { key: "coal_concentrate", name: "Концентрат угольный", unit: "т", coeff: 0.982 },
  { key: "coal_energy_high_ash", name: "Уголь энергетический высокозольный", unit: "т", coeff: 0.594 },
  { key: "coal_tar", name: "Смолы из угля каменного", unit: "т", coeff: 0.95 },
  { key: "jet_fuel_kerosene_type", name: "Топливо реактивное типа керосина", unit: "л", coeff: 1.467 },
  { key: "white_spirit", name: "Уайт-спирит", unit: "л", coeff: 1.488 },
  { key: "lubricants", name: "Материалы смазочные", unit: "л", coeff: 1.433 },
  { key: "charcoal", name: "Уголь древесный, включая агломерированный", unit: "т", coeff: 1.051 },
  { key: "gas_ferroalloy", name: "Ферросплавный газ", unit: "м³", coeff: 0.00026 },
  { key: "custom", name: "Свой ресурс…", unit: "—", coeff: 0 }
];

const byKey = Object.fromEntries(RESOURCES.map(r => [r.key, r]));

// ======= ХЕЛПЕРЫ =============================================================
const numberFmt = (n, d = 3) =>
  Number.isFinite(n) ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: d }).format(n) : "—";

const moneyFmt = n =>
  Number.isFinite(n) ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(n) : "—";

const cleanNum = s => (s === "" || s === null || s === undefined ? "" : String(s).replace(",", "."));

// ======= МОДЕЛЬ СТРОКИ ========================================================
const makeEmptyData = years => Array.from({ length: years }, () => ({ qty: "", money: "" }));

const newRow = (years) => ({
  id: crypto.randomUUID(),
  typeKey: "electricity",
  name: byKey["electricity"].name,
  unit: byKey["electricity"].unit,
  coeff: byKey["electricity"].coeff,
  data: makeEmptyData(years), // [{qty, money}, ...]
  note: ""
});

// ======= КОМПОНЕНТ ============================================================
export default function App() {
  // Заголовок/годовой горизонт
  const thisYear = new Date().getFullYear();
  const [title, setTitle] = useState("Расчёт по предприятию");
  const [startYear, setStartYear] = useState(thisYear - 5 + 1); // начальный год
  const [yearsCount, setYearsCount] = useState(5);              // по умолчанию 5 лет

  const years = useMemo(() => Array.from({ length: yearsCount }, (_, i) => startYear + i), [startYear, yearsCount]);

  // Данные по строкам
  const [rows, setRows] = useState(() => {
    const raw = localStorage.getItem("energy_calc_rows_v2");
    const meta = localStorage.getItem("energy_calc_meta_v2");
    if (raw && meta) {
      try {
        const parsedRows = JSON.parse(raw);
        const { startYear: y0, yearsCount: yc, title: t } = JSON.parse(meta);
        setStartYear(y0 ?? startYear);
        setYearsCount(yc ?? 5);
        setTitle(t ?? "Расчёт по предприятию");
        // нормализуем длину массивов по годам
        return parsedRows.map(r => ({
          ...r,
          data: (r.data ?? []).slice(0, yc ?? 5).concat(makeEmptyData((yc ?? 5) - (r.data?.length ?? 0)))
        }));
      } catch { /* ignore */ }
    }
    return [newRow(5)];
  });

  // Автосохранение
  useEffect(() => {
    localStorage.setItem("energy_calc_rows_v2", JSON.stringify(rows));
    localStorage.setItem("energy_calc_meta_v2", JSON.stringify({ startYear, yearsCount, title }));
  }, [rows, startYear, yearsCount, title]);

  // Обновление строки
  const update = (id, patch) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));

  // При смене горизонта нормализуем массивы data
  useEffect(() => {
    setRows(rs =>
      rs.map(r => {
        const d = r.data ?? [];
        if (d.length === yearsCount) return r;
        if (d.length < yearsCount) return { ...r, data: d.concat(makeEmptyData(yearsCount - d.length)) };
        return { ...r, data: d.slice(0, yearsCount) };
      })
    );
  }, [yearsCount]);

  // Выбор вида ресурса
  const onChangeType = (row, key) => {
    const ref = byKey[key] ?? byKey["custom"];
    update(row.id, {
      typeKey: key,
      name: ref.name,
      unit: ref.unit,
      coeff: ref.coeff
    });
  };

  // Добавить/Очистить
  const addRow = () => setRows(rs => [...rs, newRow(yearsCount)]);
  const clearAll = () => {
    if (confirm("Очистить все строки?")) setRows([newRow(yearsCount)]);
  };

  // Итоги по каждому году
  const totals = useMemo(() => {
    const t = years.map(() => ({ money: 0, tut: 0 }));
    rows.forEach(r => {
      r.data.forEach((d, i) => {
        const qty = parseFloat(cleanNum(d.qty));
        const money = parseFloat(cleanNum(d.money));
        if (Number.isFinite(money)) t[i].money += money;
        if (Number.isFinite(qty)) t[i].tut += qty * (Number.isFinite(r.coeff) ? r.coeff : 0);
      });
    });
    return t;
  }, [rows, years]);

  // CSV экспорт/импорт
  const fileRef = useRef(null);

  const exportCSV = () => {
    // Формат: Заголовок;Годы; по строкам: typeKey; name; unit; coeff; note; затем пары (qty, money) на каждый год
    const head = [
      ["Название отчёта", title],
      ["Начальный год", startYear],
      ["Кол-во лет", yearsCount],
      [],
      [
        "Код", "Наименование", "Ед.", "Коэф.",
        ...years.flatMap(y => [`Кол-во ${y}`, `Сумма ${y}`])
      ]
    ];

    const body = rows.map(r => ([
      r.typeKey, r.name, r.unit, String(r.coeff).replace(".", ","),
      ...r.data.flatMap(d => [String(d.qty).replace(".", ","), String(d.money).replace(".", ",")])
    ]));

    const totalLine = [
      "ИТОГО", "", "", "",
      ...totals.flatMap(tt => ["", String(tt.money).replace(".", ",")])
    ];

    const all = [...head, ...body, [], totalLine];
    const csv = all.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "energy_calc_5y.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  

  const importCSV = file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = String(reader.result).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        // ищем заголовок таблицы (строка, начинается с "Код")
        const idx = lines.findIndex(l => /^"?(Код)"?;/.test(l));
        if (idx === -1) throw new Error("Не найден заголовок CSV");

        // meta (если есть)
        const titleLine = lines.find(l => l.startsWith('"Название отчёта"'));
        const year0Line = lines.find(l => l.startsWith('"Начальный год"'));
        const yearsLine = lines.find(l => l.startsWith('"Кол-во лет"'));
        if (titleLine) setTitle(titleLine.split(";")[1]?.replace(/^"|"$/g, "") ?? title);
        if (year0Line) setStartYear(parseInt(year0Line.split(";")[1]));
        if (yearsLine) setYearsCount(parseInt(yearsLine.split(";")[1]));

        const dataLines = lines.slice(idx + 1);
        const newRows = [];
        for (const l of dataLines) {
          if (/^"?(ИТОГО)"?;/.test(l)) break;
          const cells = l.split(";").map(s => s.replace(/^"|"$/g, "").replace(/""/g, '"'));
          if (cells.length < 4) continue;
          const [typeKey, name, unit, coeffStr, ...rest] = cells;
          const yc = yearsCount;
          const data = [];
          for (let i = 0; i < yc; i++) {
            const q = rest[i * 2] ?? "";
            const m = rest[i * 2 + 1] ?? "";
            data.push({ qty: q.replace(",", "."), money: m.replace(",", ".") });
          }
          const coeff = parseFloat((coeffStr ?? "0").replace(",", "."));
          newRows.push({
            id: crypto.randomUUID(),
            typeKey: byKey[typeKey] ? typeKey : "custom",
            name: name || (byKey[typeKey]?.name ?? "Свой ресурс…"),
            unit: unit || (byKey[typeKey]?.unit ?? "—"),
            coeff: Number.isFinite(coeff) ? coeff : (byKey[typeKey]?.coeff ?? 0),
            data,
            note: ""
          });
        }
        if (newRows.length) setRows(newRows);
      } catch (e) {
        alert("Не удалось импортировать CSV: " + e.message);
      } finally {
        fileRef.current.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  };

  // ===== РЕНДЕР ==============================================================
  // ===== Экспорт в Excel (многолетняя таблица) =====
// ===== Экспорт в Excel (блочная таблица «как на листе») =====
const exportExcel = () => {
  // Заголовок верхнего уровня
  const headerTop = [
    "Наименование энергоносителя",
    "Подпункт",
    "Единица измерения",
    ...years.map(y => String(y)),
  ];

  const aoa = [headerTop];
  const merges = [];

  // Хелпер безопасного деления
  const safeDiv = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b > 0 ? a / b : "");

  // Формируем блок на каждый ресурс (5 строк)
  rows.forEach((r) => {
    // По каждому году подготовим величины разом, чтобы не считать много раз
    const perYear = years.map((_, idx) => {
      const qty   = parseFloat(cleanNum(r.data[idx]?.qty));
      const money = parseFloat(cleanNum(r.data[idx]?.money));
      const coeff = Number.isFinite(r.coeff) ? r.coeff : 0;

      const tut   = Number.isFinite(qty) ? qty * coeff : NaN;
      const costTut = safeDiv(money, tut);  // тг/т.у.т
      const costEd  = safeDiv(money, qty);  // тг/ед

      return { qty, money, tut, costTut, costEd };
    });

    // 5 строк блока
    const rowStart = aoa.length; // запомним, чтобы смержить «Наименование...»

    // 1) Потребление — кВт*ч
    aoa.push([
      r.name || byKey[r.typeKey]?.name || "",
      "Потребление",
      "кВт*ч",
      ...perYear.map(v => Number.isFinite(v.qty) ? v.qty : "")
    ]);

    // 2) Потребление — т.у.т
    aoa.push([
      "", "", "т.у.т",
      ...perYear.map(v => Number.isFinite(v.tut) ? v.tut : "")
    ]);

    // 3) Затраты — тенге
    aoa.push([
      "", "Затраты", "тенге",
      ...perYear.map(v => Number.isFinite(v.money) ? v.money : "")
    ]);

    // 4) Себестоимость — тг/т.у.т
    aoa.push([
      "", "Себестоимость", "тг/т.у.т",
      ...perYear.map(v => Number.isFinite(v.costTut) ? v.costTut : "")
    ]);

    // 5) Себестоимость — тг/ед
    aoa.push([
      "", "", "тг/ед",
      ...perYear.map(v => Number.isFinite(v.costEd) ? v.costEd : "")
    ]);

    // Объединяем «Наименование энергоносителя» на 5 строк
    merges.push({ s: { r: rowStart, c: 0 }, e: { r: rowStart + 4, c: 0 } });
  });

  // ==== ИТОГО (внизу): т.у.т и тенге ====
  const totalTut = years.map((_, idx) =>
    rows.reduce((s, r) => {
      const qty = parseFloat(cleanNum(r.data[idx]?.qty));
      const coeff = Number.isFinite(r.coeff) ? r.coeff : 0;
      return s + (Number.isFinite(qty) ? qty * coeff : 0);
    }, 0)
  );

  const totalMoney = years.map((_, idx) =>
    rows.reduce((s, r) => {
      const m = parseFloat(cleanNum(r.data[idx]?.money));
      return s + (Number.isFinite(m) ? m : 0);
    }, 0)
  );

  const itogoStart = aoa.length;

  aoa.push([
    "ИТОГО", "", "т.у.т",
    ...totalTut
  ]);
  aoa.push([
    "", "", "тенге",
    ...totalMoney
  ]);

  // Объединяем «ИТОГО» на две строки
  merges.push({ s: { r: itogoStart, c: 0 }, e: { r: itogoStart + 1, c: 0 } });

  // === Лист Excel ===
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Мерджи
  ws["!merges"] = merges;

  // Ширина столбцов (под таблицу)
  ws["!cols"] = [
    { wch: 28 }, // Наименование энергоносителя
    { wch: 16 }, // Подпункт
    { wch: 14 }, // Единица измерения
    ...years.map(() => ({ wch: 14 })), // Годы
  ];

  // Формат чисел (2 знака после запятой) в годовых столбцах
  if (ws["!ref"]) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = 1; R <= range.e.r; R++) {
      for (let C = 3; C <= range.e.c; C++) { // с 4-го столбца (индекс 3) начинаются годы
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") {
          cell.t = "n";
          cell.z = "#,##0.00";
        }
      }
    }
  }

  // Книга
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Калькулятор");

  const yyyy = new Date().getFullYear();
  XLSX.writeFile(wb, `energy_calc_${yyyy}.xlsx`);
};

// ===== С Т И Л И (минимально, без внешних CSS) ================================
const page = { background: "#0b1220", color: "#e8eefc", minHeight: "100vh", padding: 18, fontFamily: "Inter, system-ui, Arial" };
const h1 = { fontSize: 36, margin: "6px 0 14px" };

const panel = { background: "#0f172a", border: "1px solid #374151", borderRadius: 14, padding: 14 };
const tbl = { width: "100%", borderCollapse: "collapse" };

const thSticky = { position: "sticky", top: 0, background: "#0f172a", borderBottom: "1px solid #374151", padding: "10px 8px", textAlign: "left", zIndex: 1 };
const thGrp = { ...thSticky, textAlign: "center" };
const thSub = { ...thSticky, fontWeight: 400, color: "#aab4ca", textAlign: "center" };

const td = { borderBottom: "1px solid #263041", padding: 8, verticalAlign: "middle" };
const tdCtr = { ...td, textAlign: "center" };

const inp = { background: "#111827", color: "#e8eefc", border: "1px solid #374151", borderRadius: 10, padding: "10px 12px", minWidth: 260, outline: "none" };
const inpSm = { ...inp, padding: "6px 8px", minWidth: 100 };
const inpNum = { ...inp, minWidth: 120, textAlign: "right" };
const sel = { ...inp, minWidth: 260 };

const btn = { background: "#111827", color: "#e8eefc", border: "1px solid #374151", borderRadius: 12, padding: "10px 14px", cursor: "pointer" };
const btnDanger = { ...btn, borderColor: "#ff4444", color: "#ffb4b4", background: "#2b1111" };
const btnDel = { ...btnDanger, padding: "4px 10px" };

  return (
    <div style={page}>
      <h1 style={h1}>Калькулятор энергоресурсов</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          style={inp}
          placeholder="Расчёт по предприятию"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label>Начальный год:</label>
          <input
            style={inpSm}
            type="number"
            value={startYear}
            onChange={e => setStartYear(parseInt(e.target.value || thisYear))}
          />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label>Кол-во лет:</label>
          <input
            style={inpSm}
            type="number"
            min={1}
            max={10}
            value={yearsCount}
            onChange={e => setYearsCount(Math.max(1, Math.min(10, parseInt(e.target.value || 5))))}
          />
        </div>
      </div>

      <div style={panel}>
        <table style={tbl}>
        <thead>
    <tr>
      <th style={thSticky}>Наименование энергоносителя</th>
      <th style={thSticky}>Показатель</th>
      <th style={thSticky}>Единица измерения</th>
      <th style={thSticky}>Коэф.</th>
      {years.map(y => (
        <th key={y} style={thGrp}>{y}</th>
      ))}
    </tr>
  </thead>
<tbody>
  {rows.map((r) => (
    <React.Fragment key={r.id}>
      {/* Потребление (натуральное) */}
      <tr>
  <td rowSpan={4} style={td}>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {/* Кнопка удалить строку ресурса */}
      <button
        style={btnDel}
        title="Удалить ресурс"
        onClick={() => {
          if (confirm(`Удалить ресурс «${r.name}»?`)) {
            setRows(rs => rs.filter(x => x.id !== r.id));
          }
        }}
      >
        ×
      </button>

      {/* Выпадающий список выбора ресурса */}
      <select
        style={sel}
        value={r.typeKey}
        onChange={e => onChangeType(r, e.target.value)}
      >
        {RESOURCES.map(op => (
          <option key={op.key} value={op.key}>
            {op.name}
          </option>
        ))}
      </select>
    </div>
  </td>


        <td>Потребление</td>
        <td>{r.unit}</td>
        <td style={tdCtr}>{Number.isFinite(r.coeff) ? r.coeff : "—"}</td>

       {years.map((y, i) => (
  <td key={`qty-${r.id}-${i}`} style={td}>
    <input
      style={inpNum}
      placeholder="0"
      value={r.data[i]?.qty ?? ""}
      onChange={e => {
        const v = cleanNum(e.target.value);
        update(r.id, {
          data: r.data.map((d, ii) => (ii === i ? { ...d, qty: v } : d)),
        });
      }}
    />
  </td>
))}

      </tr>

      {/* Перевод в т.у.т */}
      <tr>
        <td></td>
        <td>Потребление</td>
        <td>т.у.т</td>
        <td style={tdCtr}>{Number.isFinite(r.coeff) ? r.coeff : "—"}</td>

        {years.map((y, i) => {
          const qty = parseFloat(cleanNum(r.data[i]?.qty));
          const coeff = Number.isFinite(r.coeff) ? r.coeff : 0;
          const tut = Number.isFinite(qty) ? qty * coeff : NaN;
          return <td>{Number.isFinite(tut) ? numberFmt(tut, 6) : "—"}</td>;
        })}
      </tr>

      {/* Затраты */}
      <tr>
        <td></td>
        <td>Затраты</td>
        <td>тенге</td>
        <td style={tdCtr}>—</td>

        {years.map((y, i) => (
  <td key={`money-${r.id}-${i}`} style={td}>
    <input
      style={inpNum}
      placeholder="0"
      value={r.data[i]?.money ?? ""}
      onChange={e => {
        const v = cleanNum(e.target.value);
        update(r.id, {
          data: r.data.map((d, ii) => (ii === i ? { ...d, money: v } : d)),
        });
      }}
    />
  </td>
))}
      </tr>

      {/* Себестоимость */}
      <tr>
        <td></td>
        <td>Себестоимость</td>
        <td>₸/ед</td>
        <td style={tdCtr}>—</td>

        {years.map((y, i) => {
          const q = parseFloat(cleanNum(r.data[i]?.qty));
          const m = parseFloat(cleanNum(r.data[i]?.money));
          const cost = Number.isFinite(q) && q > 0 && Number.isFinite(m) ? m / q : NaN;
          return <td>{Number.isFinite(cost) ? numberFmt(cost, 2) : "—"}</td>;
        })}
      </tr>
    </React.Fragment>
  ))}
</tbody>
{/* ===== ИТОГО по годам (сумма в тенге) ===== */}
<tfoot>
  <tr>
    {/* 3 левые колонки: Наименование, Показатель, Ед. изм. */}
    <td colSpan={3} style={tdCtr}><b>ИТОГО:</b></td>

    {/* по одной ячейке на каждый год — показываем сумму в тенге */}
    {years.map((_, i) => (
      <td key={`tot-${i}`} style={tdCtr}>
        <b>{moneyFmt(totals[i]?.money || 0)}</b>
      </td>
    ))}
  </tr>
</tfoot>
<tr>
  <td colSpan={3} style={tdCtr}><b>ИТОГО т.у.т:</b></td>
  {years.map((_, i) => (
    <td key={`tot-tut-${i}`} style={tdCtr}>
      <b>{numberFmt(totals[i]?.tut || 0, 6)}</b>
    </td>
  ))}
</tr>
<tr>
 
</tr>

        </table>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={btn} onClick={addRow}>+ Добавить ресурс</button>
          <button style={btn} onClick={exportCSV}>Экспорт CSV</button>
          <button style={btn} onClick={exportExcel}>Экспорт Excel</button>
          <button style={btn} onClick={() => fileRef.current?.click()}>Импорт CSV</button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={e => e.target.files?.[0] && importCSV(e.target.files[0])}
            style={{ display: "none" }}
          />
          <button style={btnDanger} onClick={clearAll}>Очистить</button>
        </div>
      </div>
    </div>
  );


}