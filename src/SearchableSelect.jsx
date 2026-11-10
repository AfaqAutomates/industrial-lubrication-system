import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchableSelect({ value, onChange, options, placeholder = "Select an option", disabled = false, searchPlaceholder = "Type to search…", emptyText = "No matching options" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    function onPointerDown(event) { if (!rootRef.current?.contains(event.target)) { setOpen(false); setQuery(""); } }
    function onKeyDown(event) { if (event.key === "Escape") { setOpen(false); setQuery(""); } }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  function choose(option) { onChange(option.value); setOpen(false); setQuery(""); }

  return <div className="searchable-select" ref={rootRef}>
    <button type="button" className={`searchable-select-trigger ${selected ? "has-value" : ""}`} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{selected?.label || placeholder}</span><span className="searchable-select-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="searchable-select-menu">
      <div className="searchable-select-search"><input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} placeholder={searchPlaceholder} aria-label="Search options"/><span aria-hidden="true">⌕</span></div>
      <div className="searchable-select-options" role="listbox">
        {filtered.map((option) => <button type="button" role="option" aria-selected={String(option.value) === String(value)} className="searchable-select-option" key={option.value} onClick={() => choose(option)}><span>{option.label}</span>{String(option.value) === String(value) && <b aria-hidden="true">✓</b>}</button>)}
        {!filtered.length && <div className="searchable-select-empty">{emptyText}</div>}
      </div>
      <div className="searchable-select-footer">Search by equipment number or name, or scroll the list.</div>
    </div>}
  </div>;
}
