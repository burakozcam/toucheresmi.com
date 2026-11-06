"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.sessionStorage.getItem("kurumsal-splash-seen")) return;
      window.sessionStorage.setItem("kurumsal-splash-seen", "1");
    } catch {
      return;
    }

    setVisible(true);
    const fadeTimer = window.setTimeout(() => setLeaving(true), 750);
    const removeTimer = window.setTimeout(() => setVisible(false), 1000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className={`brand-splash ${leaving ? "brand-splash-leaving" : ""}`} aria-hidden="true">
      <span className="splash-logo">K</span>
      <span className="splash-wordmark">KURUMSAL SINAV</span>
    </div>
  );
}
