import { supabaseAdmin } from "@/lib/supabaseAdmin";
import pdf from "pdf-parse";

export class DocumentExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

function normalizeExtractedText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function fallbackDecodePdfText(fileBytes: Buffer) {
  // Fallback for malformed PDFs: extract printable text chunks from raw bytes.
  const latin1 = fileBytes.toString("latin1");
  const printableChunks = latin1.match(/[\x20-\x7E]{8,}/g) ?? [];
  return normalizeExtractedText(printableChunks.join(" "));
}

export async function extractTextFromDocument(filePath: string) {
  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .download(filePath);

  if (error) {
    throw new DocumentExtractionError("Failed to download file from storage");
  }

  const fileArrayBuffer = await data.arrayBuffer();
  const fileBytes = Buffer.from(fileArrayBuffer);
  const fileName = filePath.toLowerCase();

  if (fileName.endsWith(".txt")) {
    const text = new TextDecoder().decode(fileArrayBuffer);
    return text;
  }

  if (fileName.endsWith(".pdf")) {
    try {
      const pdfData = await pdf(fileBytes);
      const normalizedPdfText = normalizeExtractedText(pdfData.text ?? "");

      if (normalizedPdfText) {
        return normalizedPdfText;
      }

      const fallbackText = fallbackDecodePdfText(fileBytes);
      if (fallbackText) {
        return fallbackText;
      }

      throw new DocumentExtractionError(
        "PDF has no extractable text. It may be scanned or image-only.",
      );
    } catch (error) {
      console.error("PDF parsing error:", error);

      const fallbackText = fallbackDecodePdfText(fileBytes);
      if (fallbackText) {
        return fallbackText;
      }

      throw new DocumentExtractionError(
        "Unable to extract text from this PDF. The file may be corrupted, scanned, or use an unsupported structure.",
      );
    }
  }

  throw new DocumentExtractionError("Unsupported file format");
}
