"use client";

import { useState, useRef, useCallback } from "react";

interface ParsedUser {
  name: string;
  email: string;
}

interface UploadResult {
  success: boolean;
  count: number;
  users: ParsedUser[];
  errors?: string[];
}

export default function CSVUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Only .csv files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-mono">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        * { font-family: 'IBM Plex Mono', monospace; }

        .drop-zone {
          border: 1px solid #2a2a2a;
          transition: all 0.2s;
        }
        .drop-zone.dragging {
          border-color: #c8f04a;
          background: rgba(200, 240, 74, 0.04);
        }
        .drop-zone:hover {
          border-color: #444;
        }
        .upload-btn {
          background: #c8f04a;
          color: #0a0a0a;
          transition: all 0.15s;
        }
        .upload-btn:hover:not(:disabled) {
          background: #d8ff5a;
          transform: translateY(-1px);
        }
        .upload-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tag {
          background: rgba(200, 240, 74, 0.08);
          border: 1px solid rgba(200, 240, 74, 0.2);
          color: #c8f04a;
        }
        .row-item {
          border-bottom: 1px solid #1a1a1a;
          transition: background 0.1s;
        }
        .row-item:last-child { border-bottom: none; }
        .row-item:hover { background: #111; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.8s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#c8f04a] text-xs tracking-widest uppercase">csv import</span>
            <div className="flex-1 h-px bg-[#1e1e1e]" />
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            Upload Contacts
          </h1>
          <p className="text-[#555] text-sm mt-1">
            Extracts <span className="text-[#888]">name</span> &{" "}
            <span className="text-[#888]">email</span> columns from your file.
          </p>
        </div>

        {/* Drop Zone */}
        {!result && (
          <div
            className={`drop-zone rounded-lg p-8 text-center cursor-pointer mb-4 ${dragging ? "dragging" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              title="Upload a CSV file"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {file ? (
              <div className="fade-in">
                <div className="text-[#c8f04a] text-3xl mb-3">✓</div>
                <p className="text-white text-sm font-medium">{file.name}</p>
                <p className="text-[#444] text-xs mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <>
                <div className="text-[#2a2a2a] text-4xl mb-3 select-none">⬆</div>
                <p className="text-[#555] text-sm">
                  Drop your <span className="text-[#777]">.csv</span> here, or{" "}
                  <span className="text-[#c8f04a]">browse</span>
                </p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="fade-in mb-4 px-4 py-3 rounded border border-red-900 bg-red-950/30 text-red-400 text-xs">
            ✕ {error}
          </div>
        )}

        {/* Actions */}
        {!result && (
          <div className="flex gap-3">
            <button
              className="upload-btn flex-1 py-3 rounded text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Processing...
                </>
              ) : (
                "Upload & Parse →"
              )}
            </button>
            {file && (
              <button
                onClick={reset}
                className="px-4 py-3 rounded border border-[#2a2a2a] text-[#555] text-sm hover:border-[#444] hover:text-[#777] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="fade-in">
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="tag text-xs px-2 py-1 rounded">
                  {result.count} records
                </span>
                {result.errors && result.errors.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-red-950/30 border border-red-900/40 text-red-400">
                    {result.errors.length} skipped
                  </span>
                )}
              </div>
              <button
                onClick={reset}
                className="text-xs text-[#444] hover:text-[#c8f04a] transition-colors"
              >
                ← Upload another
              </button>
            </div>

            {/* Table */}
            <div className="border border-[#1e1e1e] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-2 px-4 py-2 bg-[#111] border-b border-[#1e1e1e]">
                <span className="text-[#444] text-xs uppercase tracking-widest">Name</span>
                <span className="text-[#444] text-xs uppercase tracking-widest">Email</span>
              </div>

              {/* Rows */}
              <div className="max-h-72 overflow-y-auto">
                {result.users.map((u, i) => (
                  <div key={i} className="row-item grid grid-cols-2 px-4 py-3">
                    <span className="text-white text-xs truncate pr-2">{u.name || <span className="text-[#333]">—</span>}</span>
                    <span className="text-[#888] text-xs truncate">{u.email}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Skipped errors */}
            {result.errors && result.errors.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-[#444] cursor-pointer hover:text-[#666]">
                  Show skipped rows ({result.errors.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500/60">{e}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}