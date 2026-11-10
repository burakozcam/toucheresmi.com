"use client";

import { useEffect, useState } from "react";
import quotes from "../../data/motivational-quotes.json";

export default function MotivationBanner({ firstName = "" }: { firstName?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [visible, setVisible] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    try { setVisible(!window.sessionStorage.getItem("kurumsal-motivation-dismissed")); }
    catch { setVisible(false); }
    setQuoteIndex(Math.floor(Math.random() * quotes.length));
  }, []);
  const quote = quotes[quoteIndex];
  const date = now ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(now) : "";
  const time = now ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: "Europe/Istanbul" }).format(now) : "--:--:--";
  function closeQuote() {
    setVisible(false);
    try { window.sessionStorage.setItem("kurumsal-motivation-dismissed", "1"); } catch { /* session storage is optional */ }
  }
  return <aside className="welcome-motivation-card" aria-label="Panel karşılama alanı">
    <div className="welcome-card-heading"><div><h1>Hoş geldiniz{firstName ? `, ${firstName}` : ""}</h1><p>Sınav süreçlerinizi buradan yönetebilirsiniz.</p></div><div className="welcome-clock"><time>{time}</time><span>{date}</span></div></div>
    {visible ? <div className="welcome-quote"><span className="motivation-mark" aria-hidden="true">“</span><div><blockquote>{quote.text}</blockquote><p>— {quote.author} <a href={quote.source} target="_blank" rel="noreferrer" title={quote.note}>Kaynak ↗</a></p></div><div className="quote-controls"><button type="button" aria-label="Önceki söz" onClick={() => setQuoteIndex((i) => (i - 1 + quotes.length) % quotes.length)}>←</button><span>{quoteIndex + 1} / {quotes.length}</span><button type="button" aria-label="Sonraki söz" onClick={() => setQuoteIndex((i) => (i + 1) % quotes.length)}>→</button><button type="button" className="quote-close" aria-label="Özlü sözü kapat" onClick={closeQuote}>×</button></div></div> : <button type="button" className="quote-toggle" onClick={() => { setVisible(true); try { sessionStorage.removeItem("kurumsal-motivation-dismissed"); } catch { /* session storage is optional */ } }}>Günün sözünü göster</button>}
  </aside>;
}
