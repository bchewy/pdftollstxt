import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

function optimizeForLLMs(markdown: string): string {
  let result = markdown;

  // Remove image references (base64 or URLs) - not useful for text-only LLM context
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");

  // Remove empty image tags
  result = result.replace(/<img[^>]*>/g, "");

  // Normalize heading levels (ensure consistent hierarchy)
  result = result.replace(/^(#{1,6})\s+/gm, (match, hashes) => {
    return `${hashes} `;
  });

  // Remove excessive blank lines (more than 2 consecutive)
  result = result.replace(/\n{4,}/g, "\n\n\n");

  // Remove trailing whitespace on lines
  result = result.replace(/[ \t]+$/gm, "");

  // Ensure document starts cleanly (no leading whitespace)
  result = result.trimStart();

  // Ensure document ends with single newline
  result = result.trimEnd() + "\n";

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Call Mistral OCR API
    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: `data:application/pdf;base64,${base64}`,
      },
    });

    // Extract text from all pages
    const pages = ocrResponse.pages || [];
    const markdownContent = pages
      .map((page, index) => {
        const pageHeader =
          pages.length > 1 ? `\n\n---\n\n## Page ${index + 1}\n\n` : "";
        return pageHeader + (page.markdown || "");
      })
      .join("");

    // Optimize for LLMs.txt format
    const optimizedText = optimizeForLLMs(markdownContent);

    return NextResponse.json({
      text: optimizedText,
      pageCount: pages.length,
      filename: file.name,
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR processing failed" },
      { status: 500 }
    );
  }
}

