"use client";
import {palettes} from "../lib/palettes";
import UiIcon from "./ui-icon";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [palette,setPalette]=useState('');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setPalette(document.documentElement.dataset.palette??'');
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
    <><details className="palette-picker"><summary data-help-id="theme-toggle-1x" aria-label="Renk temasını seç">Renkler</summary><div className="palette-options">{[{id:'',name:'Kurumsal mavi',primary:'#2e65c5',accent:'#172b4d'},...palettes].map(p=><button data-help-id="theme-toggle-2" type="button" key={p.id} aria-pressed={palette===p.id} onClick={e=>{setPalette(p.id);if(p.id)document.documentElement.dataset.palette=p.id;else delete document.documentElement.dataset.palette;try{localStorage.setItem('kurumsal-palette',p.id);}catch{}e.currentTarget.closest('details')?.removeAttribute('open');}}><span className="palette-swatch" aria-hidden="true"><i style={{background:p.primary}}/><i style={{background:p.accent}}/></span>{p.name}</button>)}</div></details><button data-help-id="theme-toggle-1" className="theme-toggle" data-mode={dark ? "dark" : "light"} onClick={toggleTheme} type="button" aria-label={dark ? "Aydınlık moda geç" : "Karanlık moda geç"}>
      <span className="theme-icon" aria-hidden="true"><UiIcon name={dark?"sun":"moon"}/></span>
      <span className="theme-label">{dark ? "Aydınlık" : "Karanlık"}</span>
    </button></>
  );
}
