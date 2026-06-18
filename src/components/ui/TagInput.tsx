import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-elevated p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 transition-colors">
      {value.map((t) => (
        <span key={t} className="tag-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} className="ml-1 text-muted-foreground hover:text-accent-warm">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : placeholder ?? "Add tag, press Enter"}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}