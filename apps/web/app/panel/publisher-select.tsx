"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PublisherOption = { id: string; name: string };

export default function PublisherSelect({
  publishers,
  value,
  onChange,
  label = "Yayınevi seçin",
}: {
  publishers: PublisherOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return publishers.filter((publisher) =>
      !normalized || publisher.name.toLocaleLowerCase("tr-TR").includes(normalized)
    );
  }, [publishers, query]);
  const selected = publishers.find((publisher) => publisher.id === value);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("click", closeOutside);
    return () => document.removeEventListener("click", closeOutside);
  }, []);

  useEffect(() => {
    if (open && filtered[activeIndex]) {
      document.getElementById(`publisher-option-${filtered[activeIndex].id}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, filtered, open]);

  function showOptions() {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[activeIndex]) {
        onChange(filtered[activeIndex].id);
        setOpen(false);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="publisher-select" ref={rootRef}>
      <button
        type="button"
        className="publisher-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : showOptions()}
      >
        <span>{selected?.name ?? label}</span><span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="publisher-select-popover">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Yayınevi ara"
            aria-controls="publisher-options"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-activedescendant={filtered[activeIndex] ? `publisher-option-${filtered[activeIndex].id}` : undefined}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Yayınevi ara..."
          />
          <ul id="publisher-options" role="listbox" aria-label="Yayınevleri">
            {filtered.map((publisher, index) => (
              <li
                key={publisher.id}
                id={`publisher-option-${publisher.id}`}
                role="option"
                aria-selected={publisher.id === value}
                className={index === activeIndex ? "publisher-option-active" : ""}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => { onChange(publisher.id); setOpen(false); }}
              >
                {publisher.name}
              </li>
            ))}
            {filtered.length === 0 && <li className="publisher-option-empty">Eşleşen yayınevi bulunamadı.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
