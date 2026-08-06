"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SimpleMasterItem,
  SimpleMasterType,
  createSimpleMasterItemInSupabase,
  fetchAllSimpleMasterItemsFromSupabase,
  setSimpleMasterItemActiveStatusInSupabase,
  updateSimpleMasterItemInSupabase,
} from "../../lib/simpleMasterDb";

type SimpleMasterPanelProps = {
  masterType: SimpleMasterType;
};

type StatusTone = "info" | "success" | "error";

function getStatusClass(tone: StatusTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function sortItemsForDisplay(items: SimpleMasterItem[]) {
  return [...items].sort((a, b) => {
    if (Number(a.isActive) !== Number(b.isActive)) {
      return Number(b.isActive) - Number(a.isActive);
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.label.localeCompare(b.label);
  });
}

export default function SimpleMasterPanel({
  masterType,
}: SimpleMasterPanelProps) {
  const [items, setItems] = useState<SimpleMasterItem[]>([]);
  const [editingItem, setEditingItem] = useState<SimpleMasterItem | null>(null);
  const [label, setLabel] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const formRef = useRef<HTMLDivElement | null>(null);

  const activeItems = useMemo(
    () => sortItemsForDisplay(items).filter((item) => item.isActive),
    [items]
  );

  const activeCount = activeItems.length;

  async function renumberActiveItems(ordered: SimpleMasterItem[]) {
    for (const [index, item] of ordered.entries()) {
      await updateSimpleMasterItemInSupabase({
        id: item.id,
        masterType,
        label: item.label,
        sortOrder: index + 1,
        isActive: true,
      });
    }

    const storedActiveItems = sortItemsForDisplay(
      await fetchAllSimpleMasterItemsFromSupabase(masterType)
    ).filter((item) => item.isActive);

    const orderingIsValid =
      storedActiveItems.length === ordered.length &&
      storedActiveItems.every(
        (item, index) =>
          item.id === ordered[index].id &&
          item.sortOrder === index + 1
      );

    if (!orderingIsValid) {
      throw new Error(
        `${masterType} ordering could not be saved correctly. Please refresh and try again.`
      );
    }
  }

  function showStatus(message: string, tone: StatusTone = "info") {
    setStatusMessage(message);
    setStatusTone(tone);
  }

  async function loadItems(options?: { quiet?: boolean }) {
    if (!options?.quiet) {
      showStatus(`Loading ${masterType.toLowerCase()} values...`, "info");
    }

    try {
      const rows = await fetchAllSimpleMasterItemsFromSupabase(masterType);
      setItems(rows);

      if (!options?.quiet) {
        showStatus(
          `Loaded ${rows.length} ${masterType.toLowerCase()} value(s).`,
          "success"
        );
      }
    } catch (error) {
      setItems([]);
      showStatus(
        error instanceof Error
          ? error.message
          : `Could not load ${masterType.toLowerCase()} values.`,
        "error"
      );
    }
  }

  useEffect(() => {
    void loadItems();
  }, [masterType]);

  function resetForm() {
    setEditingItem(null);
    setLabel("");
  }

  function startEdit(item: SimpleMasterItem) {
    setEditingItem(item);
    setLabel(item.label);
    showStatus(`Editing: ${item.label}`, "info");

    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function handleSave() {
    const cleanLabel = label.trim();

    if (!cleanLabel) {
      showStatus(`Enter a ${masterType.toLowerCase()} value first.`, "error");
      return;
    }

    showStatus(
      editingItem
        ? `Updating ${masterType.toLowerCase()}...`
        : `Adding ${masterType.toLowerCase()}...`,
      "info"
    );

    try {
      if (editingItem) {
        await updateSimpleMasterItemInSupabase({
          id: editingItem.id,
          masterType,
          label: cleanLabel,
          sortOrder: editingItem.sortOrder,
          isActive: editingItem.isActive,
        });
      } else {
        await createSimpleMasterItemInSupabase({
          masterType,
          label: cleanLabel,
          sortOrder: activeItems.length + 1,
        });
      }

      const successMessage = editingItem
        ? `${masterType} updated.`
        : `${masterType} added.`;

      const refreshedItems =
        await fetchAllSimpleMasterItemsFromSupabase(masterType);

      const refreshedActiveItems =
        sortItemsForDisplay(refreshedItems).filter(
          (item) => item.isActive
        );

      await renumberActiveItems(refreshedActiveItems);

      resetForm();
      await loadItems({ quiet: true });
      showStatus(successMessage, "success");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : `Could not save ${masterType.toLowerCase()}.`,
        "error"
      );
    }
  }

  async function handleToggleActive(item: SimpleMasterItem) {
    const nextStatus = !item.isActive;

    showStatus(
      nextStatus
        ? `Reactivating ${masterType.toLowerCase()}...`
        : `Deactivating ${masterType.toLowerCase()}...`,
      "info"
    );

    try {
      if (nextStatus) {
        const reactivatedItem: SimpleMasterItem = {
          ...item,
          isActive: true,
          sortOrder: activeItems.length + 1,
        };

        await updateSimpleMasterItemInSupabase({
          id: item.id,
          masterType,
          label: item.label,
          sortOrder: reactivatedItem.sortOrder,
          isActive: true,
        });

        await renumberActiveItems([
          ...activeItems,
          reactivatedItem,
        ]);
      } else {
        await setSimpleMasterItemActiveStatusInSupabase({
          id: item.id,
          masterType,
          isActive: false,
        });

        await renumberActiveItems(
          activeItems.filter((currentItem) => currentItem.id !== item.id)
        );
      }

      await loadItems({ quiet: true });
      showStatus(
        nextStatus
          ? `${masterType} reactivated.`
          : `${masterType} deactivated.`,
        "success"
      );
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : `Could not update ${masterType.toLowerCase()} status.`,
        "error"
      );
    }
  }

  async function handleMoveItem(
    item: SimpleMasterItem,
    direction: "up" | "down"
  ) {
    if (!item.isActive) {
      showStatus(
        `Inactive ${masterType.toLowerCase()} values cannot be moved. Reactivate first.`,
        "error"
      );
      return;
    }

    const ordered = [...activeItems];
    const currentIndex = ordered.findIndex(
      (currentItem) => currentItem.id === item.id
    );
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= ordered.length
    ) {
      return;
    }

    const moved = [...ordered];
    const [currentItem] = moved.splice(currentIndex, 1);
    moved.splice(targetIndex, 0, currentItem);

    showStatus(
      `Updating ${masterType.toLowerCase()} order...`,
      "info"
    );

    try {
      await renumberActiveItems(moved);

      await loadItems({ quiet: true });
      showStatus(`${masterType} order updated.`, "success");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : `Could not update ${masterType.toLowerCase()} order.`,
        "error"
      );
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {masterType} Master
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {activeCount} active of {items.length} total
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        {statusMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${getStatusClass(
              statusTone
            )}`}
          >
            {statusMessage}
          </div>
        )}

        <div
          ref={formRef}
          className="scroll-mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"
        >
          <p className="text-sm font-semibold text-indigo-900">
            {editingItem
              ? `Editing: ${editingItem.label}`
              : `Add New ${masterType}`}
          </p>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {masterType} Label
              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={
                  masterType === "Frequency"
                    ? "Example: Four times daily"
                    : "Example: 1 week"
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-indigo-500"
              />
            </label>

            <p className="text-xs text-slate-500">
              Display position is managed using the Up and Down buttons.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
              >
                {editingItem ? `Update ${masterType}` : `Add ${masterType}`}
              </button>

              {editingItem && (
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
          {items.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No {masterType.toLowerCase()} values found.
            </div>
          ) : (
            sortItemsForDisplay(items).map((item) => {
              const activeIndex = activeItems.findIndex(
                (activeItem) => activeItem.id === item.id
              );

              const canMoveUp =
                item.isActive && activeIndex > 0;

              const canMoveDown =
                item.isActive &&
                activeIndex >= 0 &&
                activeIndex < activeItems.length - 1;

              return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  item.isActive
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-50 opacity-75"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.isActive && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Sort {item.sortOrder}
                        </span>
                      )}

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-3 font-medium text-slate-900">
                      {item.label}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveItem(item, "up")}
                      disabled={!canMoveUp}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑ Up
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveItem(item, "down")}
                      disabled={!canMoveDown}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓ Down
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                        item.isActive
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          : "bg-emerald-700 text-white hover:bg-emerald-800"
                      }`}
                    >
                      {item.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
