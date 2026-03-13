"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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

interface RegisteredAttendee {
  id: number;
  name: string | null;
  email: string;
  registeredAt: string;
}

interface EventRegistrationProps {
  eventId: number;
  eventName: string;
}

export default function EventRegistration({ eventId, eventName }: EventRegistrationProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<UserRow[]>([]);
  const [manualRows, setManualRows] = useState<UserRow[]>([{ name: "", email: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingAttendees, setExistingAttendees] = useState<RegisteredAttendee[]>([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadExistingAttendees = useCallback(async () => {
    setAttendeesLoading(true);
    setAttendeesError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/attendees`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load attendees.');
      }

      setExistingAttendees(Array.isArray(data.attendees) ? data.attendees : []);
      setTotalRegistered(typeof data.totalRegistered === 'number' ? data.totalRegistered : 0);
    } catch (fetchError) {
      setAttendeesError(fetchError instanceof Error ? fetchError.message : 'Failed to load attendees.');
      setExistingAttendees([]);
      setTotalRegistered(0);
    } finally {
      setAttendeesLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadExistingAttendees();
  }, [loadExistingAttendees]);

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

  const handleFile = useCallback((nextFile: File) => {
    if (!nextFile.name.endsWith(".csv")) {
      setError("Only .csv files accepted.");
      return;
    }
    setFile(nextFile);
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPreview(parseCSVPreview(text));
    };
    reader.readAsText(nextFile);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files[0];
    if (nextFile) handleFile(nextFile);
  }, [handleFile]);

  const handleSubmit = async () => {
    const validManualRows = manualRows
      .map((row) => ({ name: row.name.trim(), email: row.email.trim() }))
      .filter((row) => row.email.length > 0);

    if (!file && validManualRows.length === 0) {
      setError("Please upload a CSV file or add at least one manual attendee.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("eventId", String(eventId));
    formData.append("manualEntries", JSON.stringify(validManualRows));

    try {
      const response = await fetch("/api/events/register", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Submission failed.");
      else {
        setResult(data);
        loadExistingAttendees();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setManualRows([{ name: "", email: "" }]);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
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
      <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mb-8 rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 px-6 py-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <p className="mb-4 inline-flex rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-[11px] tracking-[0.22em] uppercase text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            Event Management
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-tight md:text-5xl">
            Add Attendees
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">
            Register attendees for <span className="font-semibold text-slate-800 dark:text-slate-200">{eventName}</span> via CSV or manual rows.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 md:p-8 transition-colors">
            {result ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-center py-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-slate-100 shadow-[0_0_0_8px_rgba(15,23,42,0.08),0_0_0_16px_rgba(15,23,42,0.04)] dark:bg-slate-100 dark:text-slate-900">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-1">Attendees saved</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Event <span className="font-medium text-slate-900 dark:text-slate-100">#{result.eventId}</span> received{' '}
                <span className="font-medium text-slate-900 dark:text-slate-100">{result.usersAdded}</span> attendees.
              </p>
              {result.errors && result.errors.length > 0 ? (
                <div className="text-left mb-6 rounded-lg border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2 uppercase tracking-wide">
                    {result.errors.length} rows skipped
                  </p>
                  {result.errors.map((entry, index) => (
                    <p key={index} className="text-xs text-amber-700 dark:text-amber-300/90">{entry}</p>
                  ))}
                </div>
              ) : null}
              <button onClick={reset} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors">
                Add More Attendees
              </button>
            </div>
            ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800/70">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Selected Event</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-medium truncate">{eventName}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                  Attendees CSV
                </label>
                <div
                  className={`rounded-2xl border border-dashed p-6 text-center transition-all cursor-pointer ${dragging ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/70"}`}
                  onDrop={onDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    title="Upload a CSV file containing attendees"
                    onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
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
                        Drop <span className="text-slate-900 dark:text-slate-100">.csv</span> here or{' '}
                        <span className="text-emerald-600 dark:text-emerald-400">browse</span>
                      </p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Requires email column, name optional</p>
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

              {preview.length > 0 ? (
                <div className="animate-in fade-in duration-200">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest font-medium mb-2">
                    Preview (first {preview.length} rows)
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 px-4 py-2 bg-slate-100 dark:bg-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</span>
                    </div>
                    {preview.map((user, index) => (
                      <div key={index} className="grid grid-cols-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        <span className="text-xs text-slate-900 dark:text-slate-100 truncate pr-2">{user.name || <span className="text-slate-400 dark:text-slate-500">—</span>}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                  {error}
                </p>
              ) : null}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 bg-slate-900 text-slate-100 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Saving attendees...
                  </>
                ) : "Save Attendees"}
              </button>
            </div>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Already Registered</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalRegistered}</p>
              </div>
              <button
                type="button"
                onClick={loadExistingAttendees}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Latest attendees for this selected event.</p>

            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {attendeesLoading ? (
                <p className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">Loading attendees...</p>
              ) : attendeesError ? (
                <p className="px-3 py-4 text-xs text-rose-600 dark:text-rose-300">{attendeesError}</p>
              ) : existingAttendees.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">No attendees yet for this event.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {existingAttendees.slice(0, 8).map((attendee) => (
                    <div key={attendee.id} className="px-3 py-2.5">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{attendee.name || 'Unnamed attendee'}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{attendee.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {existingAttendees.length > 8 ? (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Showing 8 of {existingAttendees.length} latest loaded attendees.</p>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
