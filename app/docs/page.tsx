"use client";

import { useState } from "react";

type Lang = "curl" | "javascript" | "python";

function highlightCode(code: string, lang: Lang): string {
  if (lang === "curl") {
    return code
      .replace(/(curl|POST)/g, '<span class="text-blue-400">$1</span>')
      .replace(/(-[A-Z]|-F)/g, '<span class="text-sky-300">$1</span>')
      .replace(/(https?:\/\/[^\s"\\]+)/g, '<span class="text-neutral-300">$1</span>')
      .replace(/("file=@[^"]+"|"provider=[^"]+")/g, '<span class="text-sky-200">$1</span>');
  }
  if (lang === "javascript") {
    return code
      .replace(/\b(const|await|new|async)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/\b(fetch|FormData|append|json)\b/g, '<span class="text-sky-300">$1</span>')
      .replace(/("\/api\/ocr"|"POST"|"file"|"provider"|"mistral")/g, '<span class="text-sky-200">$1</span>')
      .replace(/(\/\/.*$)/gm, '<span class="text-neutral-600">$1</span>');
  }
  if (lang === "python") {
    return code
      .replace(/\b(import|with|as|open)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/\b(requests|post|json|print)\b/g, '<span class="text-sky-300">$1</span>')
      .replace(/("https?:\/\/[^"]+"|"[^"]*")/g, '<span class="text-sky-200">$1</span>')
      .replace(/(#.*$)/gm, '<span class="text-neutral-600">$1</span>');
  }
  return code;
}

const EXAMPLES = {
  curl: `curl -X POST https://your-domain.com/api/ocr \\
  -F "file=@document.pdf" \\
  -F "provider=mistral"`,
  javascript: `const formData = new FormData();
formData.append("file", pdfFile);
formData.append("provider", "mistral");

const response = await fetch("/api/ocr", {
  method: "POST",
  body: formData,
});

const { text, pageCount } = await response.json();`,
  python: `import requests

with open("document.pdf", "rb") as f:
    response = requests.post(
        "https://your-domain.com/api/ocr",
        files={"file": f},
        data={"provider": "mistral"}
    )

result = response.json()
print(result["text"])`,
};

const RESPONSE = `{
  "text": "# Document Title\\n\\nExtracted markdown...",
  "pageCount": 5,
  "filename": "document.pdf",
  "provider": "mistral"
}`;

const ERROR_RESPONSE = `{
  "error": "Only PDF files are supported"
}`;

export default function DocsPage() {
  const [lang, setLang] = useState<Lang>("curl");

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-white font-light text-lg">
              pdf<span className="text-blue-500">→</span>llms.txt
            </a>
            <span className="text-neutral-700">/</span>
            <span className="text-neutral-400 text-sm">API Reference</span>
          </div>
          <a href="/" className="text-neutral-500 text-sm hover:text-white transition-colors">
            ← Back to app
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Endpoint Section */}
        <section className="grid lg:grid-cols-2 border-b border-neutral-900">
          {/* Left: Request */}
          <div className="p-8 lg:border-r border-neutral-900">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-mono rounded">
                POST
              </span>
              <code className="text-white font-mono">/api/ocr</code>
            </div>
            
            <p className="text-neutral-400 text-sm mb-8">
              Convert a PDF file to optimized LLM-ready text using OCR.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-4">Request Body</h3>
                <p className="text-neutral-600 text-xs mb-3">Content-Type: multipart/form-data</p>
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-blue-400 text-sm font-mono">file</code>
                      <span className="text-neutral-600 text-xs">File</span>
                      <span className="text-[10px] uppercase tracking-wider text-amber-500 ml-auto">required</span>
                    </div>
                    <p className="text-neutral-500 text-sm">The PDF file to process</p>
                  </div>
                  <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-blue-400 text-sm font-mono">provider</code>
                      <span className="text-neutral-600 text-xs">string</span>
                      <span className="text-[10px] uppercase tracking-wider text-neutral-600 ml-auto">optional</span>
                    </div>
                    <p className="text-neutral-500 text-sm">&quot;mistral&quot; (default) or &quot;openai&quot;</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-4">Providers</h3>
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-neutral-800/50">
                    <code className="text-blue-400 font-mono text-xs">mistral</code>
                    <span className="text-neutral-500 text-xs">mistral-ocr-latest • Native OCR</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <code className="text-blue-400 font-mono text-xs">openai</code>
                    <span className="text-neutral-500 text-xs">gpt-5.1 • Vision-based</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-4">Limits</h3>
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>Max file size</span>
                    <span className="text-white font-mono text-xs">50 MB</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>Formats</span>
                    <span className="text-white font-mono text-xs">PDF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Response & Examples */}
          <div className="bg-neutral-950 p-8">
            <div className="space-y-6">
              {/* Code Examples */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-wider text-neutral-500">Example Request</h3>
                  <div className="flex gap-1">
                    {(["curl", "javascript", "python"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={`px-2.5 py-1 text-xs rounded transition-colors ${
                          lang === l 
                            ? "bg-neutral-800 text-white" 
                            : "text-neutral-600 hover:text-neutral-400"
                        }`}
                      >
                        {l === "curl" ? "cURL" : l === "javascript" ? "JS" : "Python"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                  <pre className="p-4 text-xs font-mono overflow-auto leading-relaxed">
                    <code 
                      dangerouslySetInnerHTML={{ __html: highlightCode(EXAMPLES[lang], lang) }}
                    />
                  </pre>
                </div>
              </div>

              {/* Success Response */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs uppercase tracking-wider text-neutral-500">Response</h3>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-green-500">200</span>
                  </span>
                </div>
                <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                  <pre className="p-4 text-xs font-mono text-neutral-300 overflow-auto leading-relaxed">
                    {RESPONSE}
                  </pre>
                </div>
              </div>

              {/* Error Response */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs uppercase tracking-wider text-neutral-500">Error</h3>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span className="text-red-500">4xx</span>
                  </span>
                </div>
                <div className="bg-neutral-900 rounded-lg overflow-hidden border border-red-900/30">
                  <pre className="p-4 text-xs font-mono text-neutral-400 overflow-auto leading-relaxed">
                    {ERROR_RESPONSE}
                  </pre>
                </div>
              </div>

              {/* Response Fields */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Response Fields</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-3 py-2 border-b border-neutral-800/50">
                    <code className="text-blue-400 font-mono shrink-0">text</code>
                    <span className="text-neutral-500">Extracted content as markdown</span>
                  </div>
                  <div className="flex items-start gap-3 py-2 border-b border-neutral-800/50">
                    <code className="text-blue-400 font-mono shrink-0">pageCount</code>
                    <span className="text-neutral-500">Number of pages processed</span>
                  </div>
                  <div className="flex items-start gap-3 py-2 border-b border-neutral-800/50">
                    <code className="text-blue-400 font-mono shrink-0">filename</code>
                    <span className="text-neutral-500">Original file name</span>
                  </div>
                  <div className="flex items-start gap-3 py-2">
                    <code className="text-blue-400 font-mono shrink-0">provider</code>
                    <span className="text-neutral-500">OCR provider used</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
