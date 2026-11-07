"use client";

import { useEffect, useState } from "react";
import quotes from "../../data/motivational-quotes.json";

export default function MotivationBanner({ firstName = "" }: { firstName?: string }) {
  const [visible, setVisible] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("kurumsal-motivation-dismissed")) {
        setVisible(false);
        return;
      }
    } catch {
      setVisible(false);
      return;
    }
    setQuoteIndex(Math.floor(Math.random() * quotes.length));
  }, []);

  function dismiss() {
    try {
      window.sessionStorage.setItem("kurumsal-motivation-dismissed", "1");
    } catch {
      setVisible(false);
      return;
    }
    setVisible(false);
  }

  const quote = quotes[quoteIndex];

  return (
    <aside className="welcome-motivation-card" aria-label="Karşılama ve günün sözü">
      <div className="welcome-card-heading"><div><strong>Hoş geldiniz{firstName ? `, ${firstName}` : ""}</strong><p>Sınav süreçlerinizi buradan yönetebilirsiniz.</p></div><time>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date())}</time></div>
      {visible ? <div className="welcome-quote"><span className="motivation-mark" aria-hidden="true">“</span><div><blockquote>{quote.text}</blockquote><p>— {quote.author} <a href={quote.source} target="_blank" rel="noreferrer" title={quote.note}>Kaynak ↗</a><small>{quote.note}</small></p></div><div className="quote-controls"><button type="button" aria-label="Önceki söz" onClick={() => setQuoteIndex((current) => (current - 1 + quotes.length) % quotes.length)}>←</button><span>{quoteIndex + 1} / {quotes.length}</span><button type="button" aria-label="Sonraki söz" onClick={() => setQuoteIndex((current) => (current + 1) % quotes.length)}>→</button><button type="button" className="quote-close" aria-label="Özlü söz alanını kapat" onClick={dismiss}>×</button></div></div> : <button className="button button-quiet" onClick={() => { setVisible(true); try { sessionStorage.removeItem("kurumsal-motivation-dismissed"); } catch {} }}>Günün sözünü göster</button>}
    </aside>
  );
}
