"use client";

import { useState, useRef, useCallback } from "react";

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── CSV parsing (client-side preview) ──────────────────────────────────────
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

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!eventForm.type) { setError("Event type is required."); return; }
    if (!file) { setError("Please upload a CSV file."); return; }
    setLoading(true); setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("eventType", eventForm.type);
    fd.append("plate", eventForm.plate);
    fd.append("description", eventForm.description);

    try {
      const res = await fetch("/api/events/register", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Submission failed.");
      else setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setEventForm({ type: "", plate: "", description: "" });
    setFile(null); setPreview([]); setResult(null); setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-start justify-center py-16 px-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        .page { font-family: 'DM Sans', sans-serif; }
        .display { font-family: 'Playfair Display', serif; }

        .card {
          background: #fffdf7;
          border: 1px solid #e8e0d0;
          box-shadow: 0 2px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.8) inset;
        }
        .input-field {
          background: #f9f5ed;
          border: 1px solid #ddd5c0;
          color: #2a2218;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .input-field:focus {
          outline: none;
          border-color: #b8946a;
          background: #fffdf7;
          box-shadow: 0 0 0 3px rgba(184,148,106,0.12);
        }
        .input-field::placeholder { color: #b8ac9c; }
        select.input-field option { background: #fffdf7; }

        .btn-primary {
          background: #2a2218;
          color: #f5f0e8;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }
        .btn-primary:hover:not(:disabled) {
          background: #3d3326;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(42,34,24,0.25);
        }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-ghost {
          color: #8a7d6b;
          border: 1px solid #ddd5c0;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-ghost:hover { border-color: #b8946a; color: #2a2218; }

        .drop-zone {
          border: 1.5px dashed #c8baa6;
          background: #f9f5ed;
          transition: all 0.2s;
          cursor: pointer;
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: #b8946a;
          background: #f3ede1;
        }

        .step-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 500;
          transition: all 0.3s;
        }
        .step-dot.active { background: #2a2218; color: #f5f0e8; }
        .step-dot.done { background: #b8946a; color: #fff; }
        .step-dot.idle { background: #e8e0d0; color: #9a8d7c; }

        .tag { background: #eee7d8; color: #7a6a52; border-radius: 4px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        .fade-up { animation: fadeUp 0.35s ease forwards; }

        .preview-row { border-bottom: 1px solid #ede5d6; }
        .preview-row:last-child { border-bottom: none; }

        .success-ring {
          width: 64px; height: 64px; border-radius: 50%;
          background: #2a2218;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 0 0 8px rgba(42,34,24,0.08), 0 0 0 16px rgba(42,34,24,0.04);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.8s linear infinite; }
      `}</style>

      <div className="page w-full max-w-lg fade-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="tag text-xs px-3 py-1 inline-block mb-3 tracking-widest uppercase">
            Event Management
          </p>
          <h1 className="display text-4xl text-[#2a2218] leading-tight">
            Register an Event
          </h1>
          <p className="text-[#8a7d6b] mt-2 text-sm">
            Create your event and bulk-import attendees via CSV
          </p>
        </div>

        {/* Step indicator */}
        {!result && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { n: 1, label: "Event Details" },
              { n: 2, label: "Import Attendees" },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-3">
                {i > 0 && <div className={`h-px w-10 transition-all duration-500 ${step >= n ? "bg-[#b8946a]" : "bg-[#ddd5c0]"}`} />}
                <div className="flex items-center gap-2">
                  <div className={`step-dot ${step === n ? "active" : step > n ? "done" : "idle"}`}>
                    {step > n ? "✓" : n}
                  </div>
                  <span className={`text-xs font-medium ${step >= n ? "text-[#2a2218]" : "text-[#b8ac9c]"}`}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card rounded-2xl p-8">
          {/* ── SUCCESS ── */}
          {result && (
            <div className="fade-up text-center py-4">
              <div className="success-ring">
                <span className="text-2xl text-[#f5f0e8]">✓</span>
              </div>
              <h2 className="display text-2xl text-[#2a2218] mb-1">All done!</h2>
              <p className="text-[#8a7d6b] text-sm mb-6">
                Event <span className="text-[#2a2218] font-medium">#{result.eventId}</span> created with{" "}
                <span className="text-[#2a2218] font-medium">{result.usersAdded}</span> attendees registered.
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="text-left mb-6 bg-[#f9f2e4] border border-[#e8d9be] rounded-lg p-4">
                  <p className="text-xs text-[#b8946a] font-medium mb-2 uppercase tracking-wide">
                    {result.errors.length} rows skipped
                  </p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-[#9a7a52]">{e}</p>
                  ))}
                </div>
              )}
              <button onClick={reset} className="btn-primary w-full py-3 rounded-xl text-sm font-medium">
                Register Another Event
              </button>
            </div>
          )}

          {/* ── STEP 1: Event Details ── */}
          {!result && step === 1 && (
            <div className="fade-up space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#6a5d4d] uppercase tracking-widest mb-2">
                  Event Type <span className="text-[#b8946a]">*</span>
                </label>
                <select
                  title="Event Type"
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                  className="input-field w-full px-4 py-3 rounded-xl text-sm"
                >
                  <option value="">Select a type...</option>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6a5d4d] uppercase tracking-widest mb-2">
                  Plate / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. EVT-2024-001"
                  value={eventForm.plate}
                  onChange={(e) => setEventForm({ ...eventForm, plate: e.target.value })}
                  className="input-field w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6a5d4d] uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="What's this event about?"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="input-field w-full px-4 py-3 rounded-xl text-sm resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={() => {
                  if (!eventForm.type) { setError("Event type is required."); return; }
                  setError(null); setStep(2);
                }}
                className="btn-primary w-full py-3 rounded-xl text-sm font-medium mt-2"
              >
                Continue to Attendees →
              </button>
            </div>
          )}

          {/* ── STEP 2: CSV Upload ── */}
          {!result && step === 2 && (
            <div className="fade-up space-y-5">
              {/* Summary of step 1 */}
              <div className="flex items-center gap-3 bg-[#f3ede1] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[#b8946a] flex items-center justify-center text-white text-xs">✓</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6a5d4d] uppercase tracking-wide font-medium">Event</p>
                  <p className="text-sm text-[#2a2218] font-medium truncate">
                    {eventForm.type}{eventForm.plate ? ` · ${eventForm.plate}` : ""}
                  </p>
                </div>
                <button onClick={() => setStep(1)} className="text-xs text-[#b8946a] hover:text-[#2a2218]">
                  Edit
                </button>
              </div>

              {/* Drop zone */}
              <div>
                <label className="block text-xs font-medium text-[#6a5d4d] uppercase tracking-widest mb-2">
                  Attendees CSV <span className="text-[#b8946a]">*</span>
                </label>
                <div
                  className={`drop-zone rounded-xl p-6 text-center ${dragging ? "dragging" : ""}`}
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
                      <p className="text-[#b8946a] text-xl mb-1">📄</p>
                      <p className="text-[#2a2218] text-sm font-medium">{file.name}</p>
                      <p className="text-[#9a8d7c] text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[#c8baa6] text-2xl mb-2">⬆</p>
                      <p className="text-[#9a8d7c] text-sm">
                        Drop <span className="text-[#2a2218]">.csv</span> here or{" "}
                        <span className="text-[#b8946a]">browse</span>
                      </p>
                      <p className="text-[#b8ac9c] text-xs mt-1">Requires name &amp; email columns</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="fade-up">
                  <p className="text-xs text-[#6a5d4d] uppercase tracking-widest font-medium mb-2">
                    Preview (first {preview.length} rows)
                  </p>
                  <div className="border border-[#e8e0d0] rounded-xl overflow-hidden">
                    <div className="grid grid-cols-2 px-4 py-2 bg-[#f3ede1]">
                      <span className="text-xs text-[#9a8d7c] uppercase tracking-wide">Name</span>
                      <span className="text-xs text-[#9a8d7c] uppercase tracking-wide">Email</span>
                    </div>
                    {preview.map((u, i) => (
                      <div key={i} className="preview-row grid grid-cols-2 px-4 py-2.5">
                        <span className="text-xs text-[#2a2218] truncate pr-2">{u.name || <span className="text-[#c8baa6]">—</span>}</span>
                        <span className="text-xs text-[#8a7d6b] truncate">{u.email}</span>
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
                <button onClick={() => { setStep(1); setError(null); }} className="btn-ghost px-4 py-3 rounded-xl text-sm">
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file || loading}
                  className="btn-primary flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

        <p className="text-center text-xs text-[#b8ac9c] mt-6">
          CSV must contain <span className="text-[#8a7d6b]">email</span> and optionally <span className="text-[#8a7d6b]">name</span> columns.
        </p>
      </div>
    </div>
  );
}