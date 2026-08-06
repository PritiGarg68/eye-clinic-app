"use client";

import { useMemo, useState } from "react";

type ClinicalTemplatePickerProps = {
  label: string;
  templates: string[];
  currentValue: string;
  onSelect: (template: string) => void;
  quickLimit?: number;
};

function getEnteredLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

function lineContainsSelectedTemplate(
  line: string,
  template: string
) {
  if (line === template) {
    return true;
  }

  const acceptedSeparators = [
    " ",
    ".",
    ",",
    ";",
    ":",
    "-",
    "–",
    "—",
    "(",
    "[",
  ];

  return acceptedSeparators.some((separator) =>
    line.startsWith(`${template}${separator}`)
  );
}

export default function ClinicalTemplatePicker({
  label,
  templates,
  currentValue,
  onSelect,
  quickLimit = 6,
}: ClinicalTemplatePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchText, setSearchText] = useState("");

  const uniqueTemplates = useMemo(() => {
    const seen = new Set<string>();

    return templates.filter((template) => {
      const cleanTemplate = template.trim();
      const key = cleanTemplate.toLowerCase();

      if (!cleanTemplate || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [templates]);

  const enteredLines = useMemo(
    () => new Set(getEnteredLines(currentValue)),
    [currentValue]
  );

  const quickTemplates = uniqueTemplates.slice(0, quickLimit);

  const filteredTemplates = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return uniqueTemplates;
    }

    return uniqueTemplates.filter((template) =>
      template.toLowerCase().includes(query)
    );
  }, [searchText, uniqueTemplates]);

  function isSelected(template: string) {
    const cleanTemplate = template.trim().toLowerCase();

    return Array.from(enteredLines).some((line) =>
      lineContainsSelectedTemplate(line, cleanTemplate)
    );
  }

  function handleSelect(template: string) {
    if (isSelected(template)) {
      return;
    }

    onSelect(template);
  }

  if (uniqueTemplates.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {quickTemplates.map((template) => {
          const selected = isSelected(template);

          return (
            <button
              key={template}
              type="button"
              disabled={selected}
              onClick={() => handleSelect(template)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                selected
                  ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {selected ? "✓ " : ""}
              {template}
            </button>
          );
        })}

        {uniqueTemplates.length > quickLimit && (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            {isExpanded
              ? "Close"
              : `View all (${uniqueTemplates.length})`}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-indigo-900">
              Select {label.toLowerCase()} template
            </p>

            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setSearchText("");
              }}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-950"
            >
              Done
            </button>
          </div>

          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={`Search ${label.toLowerCase()} templates`}
            className="mt-3 w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />

          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-indigo-100 bg-white">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => {
                const selected = isSelected(template);

                return (
                  <button
                    key={template}
                    type="button"
                    disabled={selected}
                    onClick={() => handleSelect(template)}
                    className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 ${
                      selected
                        ? "cursor-default bg-emerald-50 text-emerald-800"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span>{template}</span>
                    {selected && (
                      <span className="shrink-0 text-xs font-semibold">
                        Added
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-4 text-sm text-slate-500">
                No matching templates.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
