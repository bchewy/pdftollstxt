"use client";

import { useState, useCallback, useRef } from "react";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [pageCount, setPageCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      setStatus("error");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be under 50MB");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setError("");
    setResult("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("processing");
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process PDF");
      }

      setResult(data.text);
      setFilename(data.filename);
      setPageCount(data.pageCount);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.pdf$/i, "") + "_llms.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, filename]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setResult("");
    setError("");
    setFilename("");
    setPageCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-zinc-100 font-mono">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            PDF → llms.txt
          </h1>
          <p className="text-zinc-500 text-sm">
            Extract and optimize PDF content for LLM ingestion using Mistral OCR
          </p>
        </header>

        {/* Drop Zone */}
        {status !== "done" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-16 text-center cursor-pointer
              transition-all duration-200 ease-out
              ${
                isDragging
                  ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]"
                  : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
              }
              ${status === "processing" || status === "uploading" ? "pointer-events-none opacity-60" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {status === "idle" && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-zinc-300 mb-2">
                  Drop your PDF here or{" "}
                  <span className="text-emerald-400 underline underline-offset-2">
                    browse
                  </span>
                </p>
                <p className="text-zinc-600 text-xs">PDF files up to 50MB</p>
              </>
            )}

            {(status === "uploading" || status === "processing") && (
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-zinc-300">
                  {status === "uploading"
                    ? "Uploading..."
                    : "Processing with Mistral OCR..."}
                </p>
                <p className="text-zinc-600 text-xs mt-2">
                  This may take a moment for large documents
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-red-400 mb-2">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="text-zinc-500 text-sm hover:text-zinc-300 underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {status === "done" && (
          <div className="space-y-4">
            {/* Stats & Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-zinc-500 text-sm">{filename}</span>
                <span className="text-zinc-700">•</span>
                <span className="text-zinc-500 text-sm">
                  {pageCount} page{pageCount !== 1 ? "s" : ""}
                </span>
                <span className="text-zinc-700">•</span>
                <span className="text-zinc-500 text-sm">
                  {(result.length / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-100 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .txt
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  New file
                </button>
              </div>
            </div>

            {/* Text Output */}
            <div className="relative">
              <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 overflow-auto max-h-[600px] text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-900">
          <p className="text-zinc-600 text-xs text-center">
            Powered by{" "}
            <a
              href="https://docs.mistral.ai/capabilities/document_ai/basic_ocr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2"
            >
              Mistral OCR
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
