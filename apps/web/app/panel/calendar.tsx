"use client";

import { useMemo, useState } from "react";

const religiousHolidayRanges: Record<number, { start: string; end: string; name: string }[]> = {
  2025: [
    { start: "2025-03-30", end: "2025-04-01", name: "Ramazan Bayramı" },
    { start: "2025-06-06", end: "2025-06-09", name: "Kurban Bayramı" },
  ],
  2026: [
    { start: "2026-03-20", end: "2026-03-22", name: "Ramazan Bayramı" },
    { start: "2026-05-27", end: "2026-05-30", name: "Kurban Bayramı" },
  ],
  2027: [
    { start: "2027-03-10", end: "2027-03-12", name: "Ramazan Bayramı" },
    { start: "2027-05-17", end: "2027-05-20", name: "Kurban Bayramı" },
  ],
  2028: [
    { start: "2028-02-27", end: "2028-02-29", name: "Ramazan Bayramı" },
    { start: "2028-05-06", end: "2028-05-09", name: "Kurban Bayramı" },
  ],
  2029: [
    { start: "2029-02-15", end: "2029-02-17", name: "Ramazan Bayramı" },
    { start: "2029-04-24", end: "2029-04-27", name: "Kurban Bayramı" },
  ],
  2030: [
    { start: "2030-02-05", end: "2030-02-07", name: "Ramazan Bayramı" },
    { start: "2030-04-13", end: "2030-04-16", name: "Kurban Bayramı" },
  ],
};

const fixedHolidays: Record<string, string> = {
  "01-01": "Yılbaşı",
  "04-23": "Ulusal Egemenlik ve Çocuk Bayramı",
  "05-01": "Emek ve Dayanışma Günü",
  "05-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  "07-15": "Demokrasi ve Millî Birlik Günü",
  "08-30": "Zafer Bayramı",
  "10-29": "Cumhuriyet Bayramı",
};

const weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const monthNames = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function getHoliday(date: Date): string | undefined {
  const year = date.getFullYear();
  const dateKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const fixed = fixedHolidays[dateKey.slice(5)];
  if (fixed) return fixed;
  return religiousHolidayRanges[year]?.find(({ start, end }) => dateKey >= start && dateKey <= end)?.name;
}

export default function Calendar() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const count = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: firstWeekday + count }, (_, index) => {
      if (index < firstWeekday) return null;
      const date = new Date(year, monthIndex, index - firstWeekday + 1);
      return { date, holiday: getHoliday(date) };
    });
  }, [month]);

  function shiftMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  const today = new Date();
  const currentMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();

  return (
    <section className="calendar-card" aria-label="Takvim">
      <header className="calendar-header">
        <div><p className="hero-tag">TAKVİM</p><h2>{monthNames[month.getMonth()]} {month.getFullYear()}</h2></div>
        <div className="calendar-nav"><button onClick={() => shiftMonth(-1)} aria-label="Önceki ay">‹</button><button onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Bugün</button><button onClick={() => shiftMonth(1)} aria-label="Sonraki ay">›</button></div>
      </header>
      <div className="calendar-grid">
        {weekdays.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
        {days.map((item, index) => item ? (
          <div
            key={item.date.toISOString()}
            className={`calendar-day ${item.holiday ? "calendar-holiday" : ""} ${currentMonth && item.date.getDate() === today.getDate() ? "calendar-today" : ""} ${[0, 6].includes(item.date.getDay()) ? "calendar-weekend" : ""}`}
            title={item.holiday ?? `${item.date.getDate()} ${monthNames[month.getMonth()]}`}
          >
            <span>{item.date.getDate()}</span>{item.holiday && <i aria-hidden="true" />}
          </div>
        ) : <span className="calendar-day calendar-blank" key={`blank-${index}`} />)}
      </div>
      <footer className="calendar-legend"><span><i className="legend-today" />Bugün</span><span><i className="legend-weekend" />Hafta sonu</span><span><i className="legend-holiday" />Resmî tatil</span></footer>
      <p className="calendar-note">Resmî ve dinî bayram tarihleri takvim verilerine göre gösterilir. Dinî bayram günleri 2025–2030 için listelenmiştir.</p>
    </section>
  );
}
