"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchOption = { id: string; label: string; detail?: string };

export default function SearchableSelect({
  options, value, onChange, label, disabled = false, placeholder = "Ara…",
}: {
  options: SearchOption[]; value: string; onChange: (value: string) => void;
  label: string; disabled?: boolean; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.id === value);
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("tr-TR");
    return options.filter((option) => !text || `${option.label} ${option.detail ?? ""}`.toLocaleLowerCase("tr-TR").includes(text));
  }, [options, query]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("click", closeOutside);
    return () => document.removeEventListener("click", closeOutside);
  }, []);

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open && filtered[activeIndex]) document.getElementById(`searchable-option-${filtered[activeIndex].id}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filtered, open]);

  function choose(option: SearchOption) {
    onChange(option.id);
    setOpen(false);
    setQuery("");
    trigger.current?.focus();
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Enter") { event.preventDefault(); if (filtered[activeIndex]) choose(filtered[activeIndex]); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }

  return <div className="publisher-select searchable-select" ref={root}>
    <button ref={trigger} type="button" className="publisher-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => { setOpen((isOpen) => !isOpen); setQuery(""); setActiveIndex(0); }}>
      <span>{selected ? <>{selected.label}{selected.detail && <small>{selected.detail}</small>}</> : label}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="publisher-select-popover">
      <input ref={search} type="search" role="combobox" aria-label={`${label} içinde ara`} aria-controls={listId} aria-expanded="true" aria-autocomplete="list" aria-activedescendant={filtered[activeIndex] ? `searchable-option-${filtered[activeIndex].id}` : undefined} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={onSearchKeyDown} placeholder={placeholder}/>
      <ul id={listId} role="listbox" aria-label={label}>{filtered.map((option, index) => <li key={option.id} role="presentation" className={index === activeIndex ? "publisher-option-active" : ""}><button type="button" id={`searchable-option-${option.id}`} role="option" aria-selected={option.id === value} onPointerMove={() => setActiveIndex(index)} onClick={() => choose(option)}>{option.label}{option.detail && <small>{option.detail}</small>}</button></li>)}{!filtered.length && <li className="publisher-option-empty" role="option" aria-disabled="true">Eşleşen kayıt bulunamadı.</li>}</ul>
    </div>}
  </div>;
}
