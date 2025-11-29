"use client";

import { useState, useCallback, useRef } from "react";

type Status = "idle" | "uploading" | "processing" | "done" | "error";
type Provider = "mistral" | "openai";

const PROVIDERS: { id: Provider; name: string; model: string }[] = [
  { id: "mistral", name: "Mistral", model: "mistral-ocr-latest" },
  { id: "openai", name: "OpenAI", model: "gpt-5.1" },
];

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [pageCount, setPageCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState<Provider>("mistral");
  const [usedProvider, setUsedProvider] = useState<Provider>("mistral");
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
    formData.append("provider", provider);

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
      setUsedProvider(data.provider || provider);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, [provider]);

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

  const currentProvider = PROVIDERS.find((p) => p.id === provider);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-light tracking-tight mb-3">
            pdf<span className="text-blue-500">→</span>llms.txt
          </h1>
          <p className="text-neutral-500 text-sm font-light">
            Extract text from PDFs for LLM consumption
          </p>
        </header>

        {/* Provider Toggle */}
        {status !== "done" && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-neutral-900 rounded-full p-1">
              <button
                onClick={() => setProvider("mistral")}
                disabled={status === "processing" || status === "uploading"}
                className={`
                  flex items-center gap-2 px-5 py-2 text-sm rounded-full transition-all duration-200
                  ${provider === "mistral"
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:text-white"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <img src="/m-boxed-orange.svg" alt="Mistral" className="w-4 h-4 rounded-sm" />
                Mistral
              </button>
              <button
                onClick={() => setProvider("openai")}
                disabled={status === "processing" || status === "uploading"}
                className={`
                  flex items-center gap-2 px-5 py-2 text-sm rounded-full transition-all duration-200
                  ${provider === "openai"
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:text-white"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <img 
                  src={provider === "openai" ? "/OpenAI-black-monoblossom.svg" : "/OpenAI-white-monoblossom.svg"} 
                  alt="OpenAI" 
                  className="w-4 h-4" 
                />
                OpenAI
              </button>
            </div>
          </div>
        )}

        {/* Drop Zone */}
        {status !== "done" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative rounded-2xl p-20 text-center cursor-pointer
              transition-all duration-300 ease-out
              ${isDragging
                ? "bg-blue-500/10 border border-blue-500/50"
                : "bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700"
              }
              ${status === "processing" || status === "uploading" ? "pointer-events-none" : ""}
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
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-neutral-300 text-sm">
                    Drop PDF or <span className="text-blue-400">browse</span>
                  </p>
                  <p className="text-neutral-600 text-xs mt-1">Max 50MB</p>
                </div>
              </div>
            )}

            {(status === "uploading" || status === "processing") && (
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto relative">
                  <div className="absolute inset-0 rounded-full border border-neutral-700" />
                  <div className="absolute inset-0 rounded-full border border-blue-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-neutral-400 text-sm">
                  {status === "uploading" ? "Uploading..." : `Processing with ${currentProvider?.name}...`}
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-400 text-sm">{error}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="text-neutral-500 text-xs mt-2 hover:text-white transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {status === "done" && (
          <div className="space-y-6">
            {/* Meta Bar */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-neutral-500">
                <span>{filename}</span>
                <span className="text-neutral-700">·</span>
                <span>{pageCount} page{pageCount !== 1 ? "s" : ""}</span>
                <span className="text-neutral-700">·</span>
                <span>{(result.length / 1024).toFixed(1)}KB</span>
                <span className="text-neutral-700">·</span>
                <span className="text-blue-400">{PROVIDERS.find((p) => p.id === usedProvider)?.name}</span>
              </div>
              <button
                onClick={handleReset}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                New file
              </button>
            </div>

            {/* Output */}
            <div className="relative group">
              <pre className="bg-neutral-900 rounded-xl p-6 overflow-auto max-h-[500px] text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono">
                {result}
              </pre>
              
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  title="Copy"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  title="Download"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        {status !== "done" && (
          <div className="mt-16 pt-8 border-t border-neutral-900">
            <details className="group">
              <summary className="text-neutral-500 text-xs cursor-pointer hover:text-neutral-300 transition-colors list-none flex items-center gap-2">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                What is llms.txt?
              </summary>
              <div className="mt-4 text-xs text-neutral-600 leading-relaxed space-y-2">
                <p>
                  A standard for providing LLMs with clean, structured text. Unlike HTML with navigation and ads, 
                  llms.txt gives AI models markdown-formatted content that&apos;s easy to parse.
                </p>
                <p>
                  Perfect for documentation, research papers, or any PDF you want to feed into ChatGPT, Claude, or a RAG pipeline.{" "}
                  <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
                    Learn more →
                  </a>
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 flex items-center justify-center gap-6 text-xs text-neutral-600">
          <a href="/docs" className="hover:text-white transition-colors">API</a>
          <span className="text-neutral-800">·</span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </footer>
      </div>
    </div>
  );
}
