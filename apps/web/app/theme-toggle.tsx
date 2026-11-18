"use client";
import UiIcon from "./ui-icon";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const useDark = document.documentElement.dataset.theme === "dark";
    setDark(useDark);
    document.documentElement.dataset.theme = useDark ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    try { window.localStorage.setItem("kurumsal-theme", nextDark ? "dark" : "light"); } catch { /* Theme remains usable without storage. */ }
  }

  return (
    <button className="theme-toggle" data-mode={dark ? "dark" : "light"} onClick={toggleTheme} type="button" aria-label={dark ? "Aydınlık moda geç" : "Karanlık moda geç"}>
      <span className="theme-icon" aria-hidden="true"><UiIcon name={dark?"sun":"moon"}/></span>
      <span className="theme-label">{dark ? "Aydınlık" : "Karanlık"}</span>
    </button>
  );
}
