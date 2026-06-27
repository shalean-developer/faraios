"use client";

import { Plus, Trash2 } from "lucide-react";

export const inputClass =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {multiline ? (
        <textarea
          rows={rows}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export function StringListEditor({
  label,
  items,
  onChange,
  placeholder = "Item",
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-medium text-slate-500">{label}</legend>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <input
              className={inputClass}
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[index] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
            />
            <button
              type="button"
              className="shrink-0 p-2 text-slate-400 hover:text-red-500"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#4a6fd8]"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </fieldset>
  );
}

export function StatListEditor({
  items,
  onChange,
}: {
  items: { label: string; value: string }[];
  onChange: (items: { label: string; value: string }[]) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-medium text-slate-500">Statistics</legend>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              className={inputClass}
              value={item.value}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, value: e.target.value };
                onChange(next);
              }}
              placeholder="Value"
            />
            <input
              className={inputClass}
              value={item.label}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, label: e.target.value };
                onChange(next);
              }}
              placeholder="Label"
            />
            <button
              type="button"
              className="p-2 text-slate-400 hover:text-red-500"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#4a6fd8]"
        onClick={() => onChange([...items, { label: "", value: "" }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add stat
      </button>
    </fieldset>
  );
}
