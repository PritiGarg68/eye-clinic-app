"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import {
  fetchPaidTransactionsForDateRange,
  fetchPendingFollowUpsForDateRange,
  FollowUpCallItem,
  ReportTransaction,
} from "../../lib/reportsDb";

type DatePreset = "Today" | "This Month" | "Custom";

type FollowUpPreset =
  | "Overdue"
  | "Today"
  | "Next 3 Days"
  | "Next 7 Days"
  | "Custom";

type PrintMode = "financial" | "followup" | null;

function localDateText(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstDayOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

function shiftDate(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateText(date);
}

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function paidTime(value: string): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function displayDate(value: string): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function ReportsPage() {
  const today = localDateText(new Date());

  const [preset, setPreset] = useState<DatePreset>("Today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [followUpPreset, setFollowUpPreset] =
    useState<FollowUpPreset>("Today");
  const [followUpStartDate, setFollowUpStartDate] = useState(today);
  const [followUpEndDate, setFollowUpEndDate] = useState(today);
  const [followUps, setFollowUps] = useState<FollowUpCallItem[]>([]);
  const [followUpStatus, setFollowUpStatus] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const [printMode, setPrintMode] = useState<PrintMode>(null);

  async function loadReport(nextStartDate = startDate, nextEndDate = endDate) {
    setLoading(true);
    setStatusMessage("Loading report...");

    try {
      const rows = await fetchPaidTransactionsForDateRange({
        startDate: nextStartDate,
        endDate: nextEndDate,
      });

      setTransactions(rows);
      setStatusMessage(
        rows.length === 0
          ? "No paid transactions found for this date range."
          : `Loaded ${rows.length} paid transaction(s).`
      );
    } catch (error) {
      setTransactions([]);
      setStatusMessage(
        error instanceof Error ? error.message : "Could not load report."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFollowUps(
    nextStartDate = followUpStartDate,
    nextEndDate = followUpEndDate
  ) {
    setFollowUpLoading(true);
    setFollowUpStatus("Loading follow-up list...");

    try {
      const rows = await fetchPendingFollowUpsForDateRange({
        startDate: nextStartDate,
        endDate: nextEndDate,
      });

      setFollowUps(rows);
      setFollowUpStatus(
        rows.length === 0
          ? "No pending follow-ups found for this period."
          : `Loaded ${rows.length} pending follow-up patient(s).`
      );
    } catch (error) {
      setFollowUps([]);
      setFollowUpStatus(
        error instanceof Error
          ? error.message
          : "Could not load follow-up list."
      );
    } finally {
      setFollowUpLoading(false);
    }
  }

  function applyPreset(nextPreset: DatePreset) {
    setPreset(nextPreset);

    const now = new Date();
    const currentDate = localDateText(now);

    if (nextPreset === "Today") {
      setStartDate(currentDate);
      setEndDate(currentDate);
      void loadReport(currentDate, currentDate);
      return;
    }

    if (nextPreset === "This Month") {
      const monthStart = firstDayOfMonth(now);
      setStartDate(monthStart);
      setEndDate(currentDate);
      void loadReport(monthStart, currentDate);
    }
  }

  function applyFollowUpPreset(nextPreset: FollowUpPreset) {
    setFollowUpPreset(nextPreset);

    if (nextPreset === "Custom") {
      return;
    }

    let nextStartDate = today;
    let nextEndDate = today;

    if (nextPreset === "Overdue") {
      nextStartDate = shiftDate(today, -14);
      nextEndDate = shiftDate(today, -1);
    }

    if (nextPreset === "Next 3 Days") {
      nextEndDate = shiftDate(today, 3);
    }

    if (nextPreset === "Next 7 Days") {
      nextEndDate = shiftDate(today, 7);
    }

    setFollowUpStartDate(nextStartDate);
    setFollowUpEndDate(nextEndDate);
    void loadFollowUps(nextStartDate, nextEndDate);
  }

  function printReport(mode: Exclude<PrintMode, null>) {
    setPrintMode(mode);

    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 150);
  }

  useEffect(() => {
    void loadReport(today, today);
    void loadFollowUps(today, today);
    // Initial report load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const totals = {
      gross: 0,
      discount: 0,
      net: 0,
      cash: 0,
      upi: 0,
      card: 0,
      bankTransfer: 0,
      consultation: 0,
      additionalService: 0,
    };

    for (const row of transactions) {
      totals.gross += row.grossAmount;
      totals.discount += row.discountAmount;
      totals.net += row.netAmount;

      if (row.paymentMode === "Cash") totals.cash += row.netAmount;
      if (row.paymentMode === "UPI") totals.upi += row.netAmount;
      if (row.paymentMode === "Card") totals.card += row.netAmount;
      if (row.paymentMode === "Bank Transfer") {
        totals.bankTransfer += row.netAmount;
      }

      if (row.paymentType === "Consultation") {
        totals.consultation += row.netAmount;
      }

      if (row.paymentType === "Additional Service") {
        totals.additionalService += row.netAmount;
      }
    }

    return totals;
  }, [transactions]);

  const financialHidden =
    printMode === "followup" ? "print:hidden" : "";

  const followUpHidden =
    printMode === "financial" ? "print:hidden" : "";

  return (
    <AppShell
      title="Reports"
      subtitle="Collections, billing and follow-up activity"
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          button,
          input,
          .report-screen-only {
            display: none !important;
          }

          .report-print-section {
            border: none !important;
            box-shadow: none !important;
          }

          table {
            font-size: 10px !important;
          }

          thead {
            display: table-header-group;
          }

          tr {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="grid gap-8">
        <div className={`${financialHidden} grid gap-6`}>
          <section className="report-screen-only rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Financial Report
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Paid receipts only. Amounts come from saved payment records.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["Today", "This Month", "Custom"] as DatePreset[]).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => applyPreset(item)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium ${
                        preset === item
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                From
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setPreset("Custom");
                    setStartDate(event.target.value);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                To
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setPreset("Custom");
                    setEndDate(event.target.value);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <button
                type="button"
                onClick={() => void loadReport()}
                disabled={loading}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
              >
                {loading ? "Loading..." : "Load Report"}
              </button>

              <button
                type="button"
                onClick={() => printReport("financial")}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Print Financial Report
              </button>
            </div>

            {statusMessage && (
              <p className="mt-4 text-sm font-medium text-slate-600">
                {statusMessage}
              </p>
            )}
          </section>

          <section className="report-print-section rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 hidden print:block">
              <h1 className="text-xl font-bold">Garg Eye Clinic</h1>
              <h2 className="mt-1 text-lg font-semibold">Financial Report</h2>
              <p className="mt-1 text-sm">
                {displayDate(startDate)} to {displayDate(endDate)}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Gross Billing</p>
                <p className="mt-1 text-xl font-bold">{money(summary.gross)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Discounts</p>
                <p className="mt-1 text-xl font-bold">
                  {money(summary.discount)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Net Collection</p>
                <p className="mt-1 text-xl font-bold">{money(summary.net)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-semibold">Payment Modes</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>Cash: {money(summary.cash)}</div>
                  <div>UPI: {money(summary.upi)}</div>
                  <div>Card: {money(summary.card)}</div>
                  <div>
                    Bank Transfer: {money(summary.bankTransfer)}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Revenue Split</h3>
                <div className="mt-2 grid gap-2 text-sm">
                  <div>Consultation: {money(summary.consultation)}</div>
                  <div>
                    Additional Services: {money(summary.additionalService)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <h3 className="mb-2 font-semibold">Transaction Detail</h3>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Paid At</th>
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Net</th>
                    <th className="px-3 py-2">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">{paidTime(row.paidAt)}</td>
                      <td className="px-3 py-2">{row.receiptNumber}</td>
                      <td className="px-3 py-2">
                        {row.patientName}
                        <div className="text-xs text-slate-500">{row.uhid}</div>
                      </td>
                      <td className="px-3 py-2">{row.paymentType}</td>
                      <td className="px-3 py-2 text-right">
                        {money(row.grossAmount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {money(row.discountAmount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {money(row.netAmount)}
                      </td>
                      <td className="px-3 py-2">{row.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className={`${followUpHidden} grid gap-6`}>
          <section className="report-screen-only rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Follow-Up Calls
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pending normal follow-up dates for Reception reminder calls.
                  Free-follow-up entitlement dates are not included.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "Overdue",
                    "Today",
                    "Next 3 Days",
                    "Next 7 Days",
                    "Custom",
                  ] as FollowUpPreset[]
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyFollowUpPreset(item)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium ${
                      followUpPreset === item
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                From
                <input
                  type="date"
                  value={followUpStartDate}
                  onChange={(event) => {
                    setFollowUpPreset("Custom");
                    setFollowUpStartDate(event.target.value);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                To
                <input
                  type="date"
                  value={followUpEndDate}
                  onChange={(event) => {
                    setFollowUpPreset("Custom");
                    setFollowUpEndDate(event.target.value);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
              </label>

              <button
                type="button"
                onClick={() => void loadFollowUps()}
                disabled={followUpLoading}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
              >
                {followUpLoading ? "Loading..." : "Load Follow-Ups"}
              </button>

              <button
                type="button"
                onClick={() => printReport("followup")}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Print Follow-Up List
              </button>
            </div>

            {followUpPreset === "Overdue" && (
              <p className="mt-3 text-xs text-slate-500">
                Overdue is intentionally limited to the previous 14 days.
                Use Custom for older periods.
              </p>
            )}

            {followUpStatus && (
              <p className="mt-4 text-sm font-medium text-slate-600">
                {followUpStatus}
              </p>
            )}
          </section>

          <section className="report-print-section overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <div className="hidden print:block">
                <h1 className="text-xl font-bold">Garg Eye Clinic</h1>
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                Follow-Up Call List
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {displayDate(followUpStartDate)} to{" "}
                {displayDate(followUpEndDate)}
              </p>
            </div>

            {followUps.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                No pending follow-ups to display.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Follow-Up Date</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">Last Visit</th>
                      <th className="px-4 py-3">Visit Type</th>
                      <th className="px-4 py-3">Called / Notes</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {followUps.map((row) => (
                      <tr key={row.consultationId}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {displayDate(row.followUpDate)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.patientName}</p>
                          <p className="text-xs text-slate-500">{row.uhid}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.mobile}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {displayDate(row.sourceVisitDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {row.sourceVisitType}
                        </td>
                        <td className="min-w-40 px-4 py-3">
                          <span className="print:inline hidden">
                            __________________
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
