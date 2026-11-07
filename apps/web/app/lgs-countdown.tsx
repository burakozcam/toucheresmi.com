"use client";

import { useEffect, useState } from "react";
import { LGS_EXAM_DATE } from "../config/site";

const target = new Date(`${LGS_EXAM_DATE}T00:00:00+03:00`).getTime();

function getRemaining() {
  const difference = Math.max(0, target - Date.now());
  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference % 86_400_000) / 3_600_000),
    minutes: Math.floor((difference % 3_600_000) / 60_000),
    seconds: Math.floor((difference % 60_000) / 1_000),
    finished: difference === 0,
  };
}

export default function LgsCountdown() {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, finished: false });

  useEffect(() => {
    setRemaining(getRemaining());
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const units = [
    ["Gün", remaining.days],
    ["Saat", remaining.hours],
    ["Dakika", remaining.minutes],
    ["Saniye", remaining.seconds],
  ] as const;

  return (
    <section className="lgs-countdown" aria-labelledby="lgs-countdown-title">
      <div>
        <p className="hero-tag">13 HAZİRAN 2027</p>
        <h2 id="lgs-countdown-title">LGS'ye kalan süre</h2>
        <p>Geri sayım sınav tarihinin Türkiye saatiyle başlangıcını esas alır; sınav başlangıç saati ayrıca belirtilmemiştir.</p>
      </div>
      {remaining.finished ? <strong className="lgs-finished">Sınav tarihi geldi.</strong> : (
        <div className="lgs-units">{units.map(([label, value]) => (
          <div className="lgs-unit" key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>
        ))}</div>
      )}
    </section>
  );
}
