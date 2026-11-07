"use client";

import { useEffect, useState } from "react";
import { EXAM_DATE_SOURCES, LGS_EXAM_DATE, YKS_EXAM_DATE } from "../config/site";

function getRemaining(date: string) {
  const target = new Date(`${date}T00:00:00+03:00`).getTime();
  const difference = Math.max(0, target - Date.now());
  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference % 86_400_000) / 3_600_000),
    minutes: Math.floor((difference % 3_600_000) / 60_000),
    seconds: Math.floor((difference % 60_000) / 1_000),
    finished: difference === 0,
  };
}

function Countdown({ date, name, source }: { date: string; name: string; source: string }) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, finished: false });

  useEffect(() => {
    setRemaining(getRemaining(date));
    const timer = window.setInterval(() => setRemaining(getRemaining(date)), 1000);
    return () => window.clearInterval(timer);
  }, [date]);

  const units = [
    ["Gün", remaining.days],
    ["Saat", remaining.hours],
    ["Dakika", remaining.minutes],
    ["Saniye", remaining.seconds],
  ] as const;

  return (
    <section className="lgs-countdown" aria-label={`${name} geri sayımı`}>
      <div>
        <p className="hero-tag">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date(`${date}T12:00:00+03:00`)).toLocaleUpperCase("tr-TR")}</p>
        <h2>{name}'ye kalan süre</h2>
        <p>{name === "YKS" ? "TYT günü esas alınır. AYT / YDT: 20 Haziran 2027. " : ""}Türkiye saatiyle sınav gününün başlangıcına geri sayım. <a href={source} target="_blank" rel="noreferrer">Resmî takvim ↗</a></p>
      </div>
      {remaining.finished ? <strong className="lgs-finished">Sınav tarihi geldi.</strong> : (
        <div className="lgs-units">{units.map(([label, value]) => (
          <div className="lgs-unit" key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>
        ))}</div>
      )}
    </section>
  );
}

export default function LgsCountdown() {
  return <div className="exam-countdowns"><Countdown date={LGS_EXAM_DATE} name="LGS" source={EXAM_DATE_SOURCES.lgs} /><Countdown date={YKS_EXAM_DATE} name="YKS" source={EXAM_DATE_SOURCES.yks} /></div>;
}
