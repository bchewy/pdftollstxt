import { Mistral } from "@mistralai/mistralai";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const mistralClient = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

async function processWithMistral(base64: string): Promise<{ text: string; pageCount: number }> {
  const ocrResponse = await mistralClient.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: `data:application/pdf;base64,${base64}`,
    },
  });

  const pages = ocrResponse.pages || [];
  const markdownContent = pages
    .map((page, index) => {
      const pageHeader =
        pages.length > 1 ? `\n\n---\n\n## Page ${index + 1}\n\n` : "";
      return pageHeader + (page.markdown || "");
    })
    .join("");

  return { text: markdownContent, pageCount: pages.length };
}

async function processWithOpenAI(base64: string): Promise<{ text: string; pageCount: number }> {
  const response = await openaiClient.responses.create({
    model: "gpt-5.1-2025-11-13",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename: "document.pdf",
            file_data: `data:application/pdf;base64,${base64}`,
          } as const,
          {
            type: "input_text",
            text: `Extract all text content from this PDF document. 
Format the output as clean markdown:
- Use proper heading levels (# ## ###)
- Preserve lists, tables, and formatting
- Keep the document structure intact
- Do not add any commentary or explanations
- Just output the extracted text in markdown format`,
          } as const,
        ],
      },
    ],
  });

  // Extract text from response
  let extractedText = "";
  for (const item of response.output) {
    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type === "output_text") {
          extractedText += content.text;
        }
      }
    }
  }

  // Estimate page count (rough heuristic based on content length)
  const estimatedPages = Math.max(1, Math.ceil(extractedText.length / 3000));

  return { text: extractedText, pageCount: estimatedPages };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const provider = (formData.get("provider") as string) || "mistral";

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

    let result: { text: string; pageCount: number };

    if (provider === "openai") {
      result = await processWithOpenAI(base64);
    } else {
      result = await processWithMistral(base64);
    }

    // Optimize for LLMs.txt format
    const optimizedText = optimizeForLLMs(result.text);

    return NextResponse.json({
      text: optimizedText,
      pageCount: result.pageCount,
      filename: file.name,
      provider,
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR processing failed" },
      { status: 500 }
    );
  }
}
