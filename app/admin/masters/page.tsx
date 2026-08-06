"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import SectionCard from "../../components/SectionCard";
import {
  ClinicalTemplate,
  ClinicalTemplateType,
  createClinicalTemplateInSupabase,
  fetchAllClinicalTemplatesFromSupabase,
  setClinicalTemplateActiveStatusInSupabase,
  updateClinicalTemplateInSupabase,
} from "../../../lib/clinicalTemplatesDb";

const templateTypes: ClinicalTemplateType[] = [
  "Chief Complaint",
  "History",
  "Finding",
  "Diagnosis",
  "Advice",
  "Instruction",
];

type StatusTone = "info" | "success" | "error";

function getTypeDescription(type: ClinicalTemplateType) {
  switch (type) {
    case "Chief Complaint":
      return "Optometrist complaint chips.";
    case "History":
      return "History / relevant background chips.";
    case "Finding":
      return "Doctor findings chips.";
    case "Diagnosis":
      return "Diagnosis / impression chips.";
    case "Advice":
      return "Doctor advice / plan chips.";
    case "Instruction":
      return "Medicine or patient instruction phrases.";
    default:
      return "";
  }
}

function getStatusClass(tone: StatusTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function sortTemplatesForDisplay(templates: ClinicalTemplate[]) {
  return [...templates].sort((a, b) => {
    if (Number(a.isActive) !== Number(b.isActive)) {
      return Number(b.isActive) - Number(a.isActive);
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.text.localeCompare(b.text);
  });
}

export default function AdminMastersPage() {
  const [selectedType, setSelectedType] =
    useState<ClinicalTemplateType>("Chief Complaint");
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [templateText, setTemplateText] = useState("");
  const [sortOrder, setSortOrder] = useState("1");
  const [editingTemplate, setEditingTemplate] =
    useState<ClinicalTemplate | null>(null);

  const activeTemplates = useMemo(
    () =>
      sortTemplatesForDisplay(templates).filter(
        (template) => template.isActive
      ),
    [templates]
  );

  const activeCount = activeTemplates.length;

  function showStatus(message: string, tone: StatusTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
  }

  async function loadTemplates(
    type = selectedType,
    options?: { quiet?: boolean }
  ) {
    if (!options?.quiet) {
      showStatus(`Loading ${type} templates...`, "info");
    }

    try {
      const rows = await fetchAllClinicalTemplatesFromSupabase(type);
      setTemplates(rows);

      if (!options?.quiet) {
        showStatus(`Loaded ${rows.length} ${type} template(s).`, "success");
      }

      return rows;
    } catch (error) {
      setTemplates([]);
      showStatus(
        error instanceof Error ? error.message : "Could not load templates.",
        "error"
      );
      return [];
    }
  }

  useEffect(() => {
    void loadTemplates(selectedType);
    setEditingTemplate(null);
    setTemplateText("");
    setSortOrder("1");
  }, [selectedType]);

  function startEdit(template: ClinicalTemplate) {
    setEditingTemplate(template);
    setTemplateText(template.text);
    setSortOrder(String(template.sortOrder || 1));
    showStatus(`Editing ${template.templateType} template.`, "info");
  }

  function resetForm() {
    setEditingTemplate(null);
    setTemplateText("");
    setSortOrder("1");
  }

  async function handleSaveTemplate() {
    const cleanText = templateText.trim();

    if (!cleanText) {
      showStatus("Enter template text first.", "error");
      return;
    }

    const parsedSortOrder = Number(sortOrder) || 1;
    showStatus(editingTemplate ? "Updating template..." : "Adding template...", "info");

    try {
      if (editingTemplate) {
        await updateClinicalTemplateInSupabase({
          id: editingTemplate.id,
          text: cleanText,
          sortOrder: parsedSortOrder,
          isActive: editingTemplate.isActive,
        });
      } else {
        await createClinicalTemplateInSupabase({
          templateType: selectedType,
          text: cleanText,
          sortOrder: parsedSortOrder,
        });
      }

      resetForm();
      await loadTemplates(selectedType, { quiet: true });
      showStatus(editingTemplate ? "Template updated." : "Template added.", "success");
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Could not save template.",
        "error"
      );
    }
  }

  async function handleToggleActive(template: ClinicalTemplate) {
    const nextStatus = !template.isActive;

    showStatus(
      nextStatus ? "Reactivating template..." : "Deactivating template...",
      "info"
    );

    try {
      await setClinicalTemplateActiveStatusInSupabase({
        id: template.id,
        isActive: nextStatus,
      });

      await loadTemplates(selectedType, { quiet: true });
      showStatus(
        nextStatus ? "Template reactivated." : "Template deactivated.",
        "success"
      );
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not update template status.",
        "error"
      );
    }
  }

  async function handleMoveTemplate(
    template: ClinicalTemplate,
    direction: "up" | "down"
  ) {
    if (!template.isActive) {
      showStatus("Inactive templates cannot be moved. Reactivate first.", "error");
      return;
    }

    const ordered = [...activeTemplates];
    const currentIndex = ordered.findIndex((item) => item.id === template.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }

    const moved = [...ordered];
    const [currentItem] = moved.splice(currentIndex, 1);
    moved.splice(targetIndex, 0, currentItem);

    showStatus("Updating display order...", "info");

    try {
      await Promise.all(
        moved.map((item, index) =>
          updateClinicalTemplateInSupabase({
            id: item.id,
            text: item.text,
            sortOrder: index + 1,
            isActive: item.isActive,
          })
        )
      );

      await loadTemplates(selectedType, { quiet: true });
      showStatus("Template order updated.", "success");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Could not update template order.",
        "error"
      );
    }
  }

  return (
    <AppShell
      title="Admin Masters"
      subtitle="Manage doctor and optometrist chips/templates"
    >
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionCard
          title="Template Categories"
          subtitle="Choose which clinical chip list to edit"
        >
          <div className="grid gap-3">
            {templateTypes.map((type) => {
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p
                    className={`font-semibold ${
                      isSelected ? "text-indigo-900" : "text-slate-900"
                    }`}
                  >
                    {type}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {getTypeDescription(type)}
                  </p>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard
            title={`${selectedType} Templates`}
            subtitle={`${activeCount} active of ${templates.length} total`}
          >
            <div className="grid gap-4">
              {statusMessage && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${getStatusClass(
                    statusTone
                  )}`}
                >
                  {statusMessage}
                </div>
              )}

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-900">
                  {editingTemplate ? "Edit Template" : "Add New Template"}
                </p>

                <div className="mt-4 grid gap-3">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Template Text
                    <textarea
                      value={templateText}
                      onChange={(event) => setTemplateText(event.target.value)}
                      placeholder={`Enter ${selectedType.toLowerCase()} text`}
                      className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700 md:max-w-xs">
                    Sort Order
                    <input
                      type="number"
                      min="1"
                      value={sortOrder}
                      onChange={(event) => setSortOrder(event.target.value)}
                      className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs font-normal text-slate-500">
                      You can also use Move Up / Move Down below. Moving an item
                      will automatically renumber active templates cleanly.
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
                    >
                      {editingTemplate ? "Update Template" : "Add Template"}
                    </button>

                    {editingTemplate && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {templates.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No templates found for this category.
                  </div>
                ) : (
                  sortTemplatesForDisplay(templates).map((template) => {
                    const activeIndex = activeTemplates.findIndex(
                      (item) => item.id === template.id
                    );
                    const canMoveUp = template.isActive && activeIndex > 0;
                    const canMoveDown =
                      template.isActive &&
                      activeIndex >= 0 &&
                      activeIndex < activeTemplates.length - 1;

                    return (
                      <div
                        key={template.id}
                        className={`rounded-xl border p-4 ${
                          template.isActive
                            ? "border-slate-200 bg-white"
                            : "border-slate-200 bg-slate-50 opacity-75"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                Sort {template.sortOrder}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  template.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {template.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-slate-900">
                              {template.text}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleMoveTemplate(template, "up")}
                              disabled={!canMoveUp}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              ↑ Up
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveTemplate(template, "down")}
                              disabled={!canMoveDown}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              ↓ Down
                            </button>

                            <button
                              type="button"
                              onClick={() => startEdit(template)}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(template)}
                              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                template.isActive
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  : "bg-emerald-700 text-white hover:bg-emerald-800"
                              }`}
                            >
                              {template.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
