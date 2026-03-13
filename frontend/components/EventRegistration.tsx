"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface EventForm {
  type: string;
  plate: string;
  description: string;
}

interface UserRow {
  name: string;
  email: string;
}

interface SubmitResult {
  success: boolean;
  eventId: number;
  usersAdded: number;
  errors?: string[];
}

const EVENT_TYPES = ["Conference", "Workshop", "Seminar", "Meetup", "Webinar", "Other"];

export default function EventRegistration() {
  const [step, setStep] = useState<1 | 2>(1);
  const [eventForm, setEventForm] = useState<EventForm>({ type: "", plate: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<UserRow[]>([]);
  const [manualRows, setManualRows] = useState<UserRow[]>([{ name: "", email: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('zerocrush.event.result');
      if (stored) setResult(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const parseCSVPreview = (text: string): UserRow[] => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const nameIdx = headers.findIndex((h) => ["name", "full name", "fullname"].includes(h));
    const emailIdx = headers.findIndex((h) => ["email", "email address", "e-mail"].includes(h));
    if (emailIdx === -1) return [];
    return lines.slice(1, 6).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return { name: nameIdx !== -1 ? cols[nameIdx] ?? "" : "", email: cols[emailIdx] ?? "" };
    });
  };

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Only .csv files accepted."); return; }
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(parseCSVPreview(text));
    };
    reader.readAsText(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!eventForm.type) { setError("Event type is required."); return; }

    const validManualRows = manualRows
      .map((row) => ({ name: row.name.trim(), email: row.email.trim() }))
      .filter((row) => row.email.length > 0);

    if (!file && validManualRows.length === 0) {
      setError("Please upload a CSV file or add at least one manual attendee.");
      return;
    }

    setLoading(true); setError(null);

    const fd = new FormData();
    if (file) fd.append("file", file);
    fd.append("eventType", eventForm.type);
    fd.append("plate", eventForm.plate);
    fd.append("description", eventForm.description);
    fd.append("manualEntries", JSON.stringify(validManualRows));

    try {
      const res = await fetch("/api/events/register", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed.");
      } else {
        setResult(data);
        try { localStorage.setItem('zerocrush.event.result', JSON.stringify(data)); } catch { /* ignore */ }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setEventForm({ type: "", plate: "", description: "" });
    setFile(null); setPreview([]); setManualRows([{ name: "", email: "" }]); setResult(null); setError(null);
    if (inputRef.current) inputRef.current.value = "";
    try { localStorage.removeItem('zerocrush.event.result'); } catch { /* ignore */ }
  };

  const updateManualRow = (index: number, key: keyof UserRow, value: string) => {
    setManualRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addManualRow = () => {
    setManualRows((prev) => [...prev, { name: "", email: "" }]);
  };

  const removeManualRow = (index: number) => {
    setManualRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ name: "", email: "" }];
    });
  };

  return (
    <div className="flex justify-center px-4 py-10 md:px-6 md:py-14">
      <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mb-8 rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 px-6 py-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <p className="mb-4 inline-flex rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-[11px] tracking-[0.22em] uppercase text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            Event Management
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-tight md:text-5xl">
            Register an Event
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">
            Create your event and bulk-import attendees via CSV
          </p>

          {!result && (
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {[
                { n: 1, label: "Event Details", copy: "Choose a type, add a reference, and describe the session." },
                { n: 2, label: "Import Attendees", copy: "Upload a CSV to preview and register attendees in one pass." },
              ].map(({ n, label, copy }) => {
                const isCurrent = step === n;
                const isDone = step > n;

                return (
                  <div
                    key={n}
                    className={`rounded-2xl border px-4 py-4 transition-colors ${isCurrent ? "border-emerald-400/60 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                        {isDone ? "✓" : n}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{copy}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 md:p-8 transition-colors">
          {result && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-center py-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-slate-100 shadow-[0_0_0_8px_rgba(15,23,42,0.08),0_0_0_16px_rgba(15,23,42,0.04)] dark:bg-slate-100 dark:text-slate-900">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-1">All done!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Event <span className="text-slate-900 dark:text-slate-100 font-medium">#{result.eventId}</span> created with{" "}
                <span className="text-slate-900 dark:text-slate-100 font-medium">{result.usersAdded}</span> attendees registered.
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="text-left mb-6 rounded-lg border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2 uppercase tracking-wide">
                    {result.errors.length} rows skipped
                  </p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-300/90">{e}</p>
                  ))}
                </div>
              )}
              <button onClick={reset} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors">
                Register Another Event
              </button>
            </div>
          )}

          {!result && step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
              <div className="mb-1">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Step 1</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Event Details</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Set the event type, add a reference code if you use one, and write a short description for operations.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Event Type <span className="text-emerald-500">*</span>
                </label>
                <select
                  title="Event Type"
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Select a type...</option>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Plate / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. EVT-2024-001"
                  value={eventForm.plate}
                  onChange={(e) => setEventForm({ ...eventForm, plate: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="What's this event about?"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Next</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Import attendees from a CSV with an <span className="font-medium text-slate-700 dark:text-slate-300">email</span> column and an optional <span className="font-medium text-slate-700 dark:text-slate-300">name</span> column.</p>
              </div>

              <button
                onClick={() => {
                  if (!eventForm.type) { setError("Event type is required."); return; }
                  setError(null); setStep(2);
                }}
                className="mt-2 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-medium text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
              >
                Continue to Attendees →
              </button>
            </div>
          )}

          {!result && step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
              <div className="mb-1">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Step 2</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Import Attendees</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Upload the attendee CSV, inspect the first rows, then commit the event and registrations together.</p>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800/70">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Event</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-medium truncate">
                    {eventForm.type}{eventForm.plate ? ` · ${eventForm.plate}` : ""}
                  </p>
                </div>
                <button onClick={() => setStep(1)} className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                  Edit
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Attendees CSV
                </label>
                <div
                  className={`rounded-2xl border border-dashed p-6 text-center transition-all cursor-pointer ${dragging ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/70"}`}
                  onDrop={onDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef} type="file" accept=".csv" className="hidden"
                    title="Upload a CSV file containing attendees"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                  {file ? (
                    <div>
                      <p className="text-emerald-500 text-xl mb-1">📄</p>
                      <p className="text-slate-900 dark:text-slate-100 text-sm font-medium">{file.name}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-2xl mb-2">⬆</p>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Drop <span className="text-slate-900 dark:text-slate-100">.csv</span> here or{" "}
                        <span className="text-emerald-600 dark:text-emerald-400">browse</span>
                      </p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Requires name &amp; email columns</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-widest">Manual Attendees</p>
                  <button
                    type="button"
                    onClick={addManualRow}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    + Add Row
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {manualRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(event) => updateManualRow(index, "name", event.target.value)}
                        placeholder="Name (optional)"
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <input
                        type="email"
                        value={row.email}
                        onChange={(event) => updateManualRow(index, "email", event.target.value)}
                        placeholder="Email (required)"
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeManualRow(index)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {preview.length > 0 && (
                <div className="animate-in fade-in duration-200">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest font-medium mb-2">
                    Preview (first {preview.length} rows)
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 px-4 py-2 bg-slate-100 dark:bg-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</span>
                    </div>
                    {preview.map((u, i) => (
                      <div key={i} className="grid grid-cols-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        <span className="text-xs text-slate-900 dark:text-slate-100 truncate pr-2">{u.name || <span className="text-slate-400 dark:text-slate-500">—</span>}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep(1); setError(null); }} className="px-4 py-3 rounded-2xl text-sm border border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-white transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || loading}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Saving to database...
                    </>
                  ) : "Save Event & Attendees →"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          CSV and manual entries require an <span className="font-medium text-slate-500 dark:text-slate-400">email</span> and can include an optional <span className="font-medium text-slate-500 dark:text-slate-400">name</span>.
        </p>
      </div>
    </div>
  );
}