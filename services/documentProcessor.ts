import { supabaseServer } from "@/lib/supabaseServer";
import pdf from "pdf-parse";

export async function extractTextFromDocument(filePath: string) {
  const { data, error } = await supabaseServer.storage
    .from("documents")
    .download(filePath);

  if (error) {
    throw new Error("Failed to download file");
  }

  const fileBuffer = await data.arrayBuffer();
  const fileName = filePath.toLowerCase();

  if (fileName.endsWith(".txt")) {
    const text = new TextDecoder().decode(fileBuffer);
    return text;
  }

  if (fileName.endsWith(".pdf")) {
    try {
      const pdfData = await pdf(Buffer.from(fileBuffer));
      return pdfData.text;
    } catch (error) {
      console.error("PDF parsing error:", error);
      return "PDF text extraction failed";
    }
  }

  throw new Error("Unsupported file format");
}
