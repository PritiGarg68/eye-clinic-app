"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../../components/AppShell";
import SectionCard from "../../components/SectionCard";
import MedicineMasterPanel from "../../components/MedicineMasterPanel";
import SimpleMasterPanel from "../../components/SimpleMasterPanel";
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
  "Spectacle Advice",
  "Instruction",
];

type AdminMasterSection =
  | "Medicines"
  | "Frequencies"
  | "Durations"
  | "Patient Sources"
  | ClinicalTemplateType;

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
    case "Spectacle Advice":
      return "Final spectacle remarks and usage advice.";
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
  const [selectedSection, setSelectedSection] =
    useState<AdminMasterSection>("Medicines");
  const [selectedType, setSelectedType] =
    useState<ClinicalTemplateType>("Chief Complaint");
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [templateText, setTemplateText] = useState("");
  const [editingTemplate, setEditingTemplate] =
    useState<ClinicalTemplate | null>(null);
  const templateFormRef = useRef<HTMLDivElement | null>(null);

  const activeTemplates = useMemo(
    () =>
      sortTemplatesForDisplay(templates).filter(
        (template) => template.isActive
      ),
    [templates]
  );

  const activeCount = activeTemplates.length;

  async function renumberActiveTemplates(ordered: ClinicalTemplate[]) {
    for (const [index, item] of ordered.entries()) {
      await updateClinicalTemplateInSupabase({
        id: item.id,
        text: item.text,
        sortOrder: index + 1,
        isActive: true,
      });
    }

    const storedActiveTemplates = sortTemplatesForDisplay(
      await fetchAllClinicalTemplatesFromSupabase(selectedType)
    ).filter((item) => item.isActive);

    const orderingIsValid =
      storedActiveTemplates.length === ordered.length &&
      storedActiveTemplates.every(
        (item, index) =>
          item.id === ordered[index].id &&
          item.sortOrder === index + 1
      );

    if (!orderingIsValid) {
      throw new Error(
        "Template ordering could not be saved correctly. Please refresh and try again."
      );
    }
  }

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
  }, [selectedType]);

  function startEdit(template: ClinicalTemplate) {
    setEditingTemplate(template);
    setTemplateText(template.text);
    showStatus(`Editing: ${template.text}`, "info");

    window.requestAnimationFrame(() => {
      templateFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function resetForm() {
    setEditingTemplate(null);
    setTemplateText("");
  }

  async function handleSaveTemplate() {
    const cleanText = templateText.trim();

    if (!cleanText) {
      showStatus("Enter template text first.", "error");
      return;
    }

    showStatus(editingTemplate ? "Updating template..." : "Adding template...", "info");

    try {
      if (editingTemplate) {
        await updateClinicalTemplateInSupabase({
          id: editingTemplate.id,
          text: cleanText,
          sortOrder: editingTemplate.sortOrder,
          isActive: editingTemplate.isActive,
        });
      } else {
        await createClinicalTemplateInSupabase({
          templateType: selectedType,
          text: cleanText,
          sortOrder: activeTemplates.length + 1,
        });
      }

      const refreshedTemplates =
        await fetchAllClinicalTemplatesFromSupabase(selectedType);

      const refreshedActiveTemplates =
        sortTemplatesForDisplay(refreshedTemplates).filter(
          (item) => item.isActive
        );

      await renumberActiveTemplates(refreshedActiveTemplates);

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
      if (nextStatus) {
        const reactivatedTemplate: ClinicalTemplate = {
          ...template,
          isActive: true,
          sortOrder: activeTemplates.length + 1,
        };

        await updateClinicalTemplateInSupabase({
          id: template.id,
          text: template.text,
          sortOrder: reactivatedTemplate.sortOrder,
          isActive: true,
        });

        await renumberActiveTemplates([
          ...activeTemplates,
          reactivatedTemplate,
        ]);
      } else {
        await setClinicalTemplateActiveStatusInSupabase({
          id: template.id,
          isActive: false,
        });

        await renumberActiveTemplates(
          activeTemplates.filter((item) => item.id !== template.id)
        );
      }

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
      await renumberActiveTemplates(moved);

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
      subtitle="Manage medicines, prescribing values, and clinical templates"
    >
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SectionCard
          title="Master Data"
          subtitle="Choose the list you want to manage"
        >
          <div className="grid gap-3">
            {(
              [
                {
                  section: "Medicines",
                  label: "Medicines",
                  description:
                    "Medicine names and optional prescribing suggestions.",
                },
                {
                  section: "Frequencies",
                  label: "Frequencies",
                  description: "Common dose-frequency values.",
                },
                {
                  section: "Durations",
                  label: "Durations",
                  description: "Common treatment-duration values.",
                },
                {
                  section: "Patient Sources",
                  label: "Patient Sources",
                  description: "How new patients originally found the clinic.",
                },
                {
                  section: "Chief Complaint",
                  label: "Chief Complaint",
                  description: getTypeDescription("Chief Complaint"),
                },
                {
                  section: "History",
                  label: "History",
                  description: getTypeDescription("History"),
                },
                {
                  section: "Finding",
                  label: "Finding",
                  description: getTypeDescription("Finding"),
                },
                {
                  section: "Diagnosis",
                  label: "Diagnosis",
                  description: getTypeDescription("Diagnosis"),
                },
                {
                  section: "Advice",
                  label: "Advice",
                  description: getTypeDescription("Advice"),
                },
                {
                  section: "Spectacle Advice",
                  label: "Spectacle Advice",
                  description: getTypeDescription("Spectacle Advice"),
                },
                {
                  section: "Instruction",
                  label: "Instructions",
                  description: getTypeDescription("Instruction"),
                },
              ] as Array<{
                section: AdminMasterSection;
                label: string;
                description: string;
              }>
            ).map((item) => {
              const isSelected = selectedSection === item.section;

              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => {
                    setSelectedSection(item.section);

                    if (
                      item.section !== "Medicines" &&
                      item.section !== "Frequencies" &&
                      item.section !== "Durations" &&
                      item.section !== "Patient Sources"
                    ) {
                      setSelectedType(item.section);
                    }
                  }}
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
                    {item.label}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <div className="min-w-0">
          {selectedSection === "Medicines" && <MedicineMasterPanel />}

          {selectedSection === "Frequencies" && (
            <SimpleMasterPanel masterType="Frequency" />
          )}

          {selectedSection === "Durations" && (
            <SimpleMasterPanel masterType="Duration" />
          )}

          {selectedSection === "Patient Sources" && (
            <SimpleMasterPanel masterType="Patient Source" />
          )}

          {selectedSection !== "Medicines" &&
            selectedSection !== "Frequencies" &&
            selectedSection !== "Durations" &&
            selectedSection !== "Patient Sources" && (
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

                  <div
                    ref={templateFormRef}
                    className="scroll-mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"
                  >
                    <p className="text-sm font-semibold text-indigo-900">
                      {editingTemplate
                        ? `Editing: ${editingTemplate.text}`
                        : "Add New Template"}
                    </p>

                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Template Text
                        <textarea
                          value={templateText}
                          onChange={(event) =>
                            setTemplateText(event.target.value)
                          }
                          placeholder={`Enter ${selectedType.toLowerCase()} text`}
                          className="min-h-24 rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500"
                        />
                      </label>

                      <p className="text-xs text-slate-500">
                        Display position is managed using the Up and Down buttons.
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleSaveTemplate}
                          className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
                        >
                          {editingTemplate
                            ? "Update Template"
                            : "Add Template"}
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

                        const canMoveUp =
                          template.isActive && activeIndex > 0;

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
                                  {template.isActive && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                      Sort {template.sortOrder}
                                    </span>
                                  )}

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      template.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {template.isActive
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </div>

                                <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-slate-900">
                                  {template.text}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveTemplate(template, "up")
                                  }
                                  disabled={!canMoveUp}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  ↑ Up
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveTemplate(template, "down")
                                  }
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
                                  onClick={() =>
                                    handleToggleActive(template)
                                  }
                                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                    template.isActive
                                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                      : "bg-emerald-700 text-white hover:bg-emerald-800"
                                  }`}
                                >
                                  {template.isActive
                                    ? "Deactivate"
                                    : "Reactivate"}
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
            )}
        </div>
      </div>
    </AppShell>
  );
}
