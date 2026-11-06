"use client";

import { useEffect, useState } from "react";
import quotes from "../../data/motivational-quotes.json";

export default function MotivationBanner() {
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

  if (!visible) return null;
  const quote = quotes[quoteIndex];

  return (
    <aside className="motivation-banner" aria-label="Günün sözü">
      <span className="motivation-mark" aria-hidden="true">“</span>
      <p>{quote.text}<small>— {quote.author}</small></p>
      <button type="button" aria-label="Motivasyon alanını kapat" onClick={dismiss}>×</button>
    </aside>
  );
}
