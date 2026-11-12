"use client";
import UiIcon from "./ui-icon";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("kurumsal-theme");
    const useDark = savedTheme ? savedTheme === "dark" : true;
    setDark(useDark);
    document.documentElement.dataset.theme = useDark ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    window.localStorage.setItem("kurumsal-theme", nextDark ? "dark" : "light");
  }

  return (
    <button className="theme-toggle" data-mode={dark ? "dark" : "light"} onClick={toggleTheme} type="button" aria-label={dark ? "Aydınlık moda geç" : "Karanlık moda geç"}>
      <span className="theme-icon" aria-hidden="true"><UiIcon name={dark?"sun":"moon"}/></span>
      <span className="theme-label">{dark ? "Aydınlık" : "Karanlık"}</span>
    </button>
  );
}
