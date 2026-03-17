import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

type ProcessDocumentResponse = {
  summary: string;
  filePath: string;
  fileName: string;
};

export async function uploadDocument(file: File) {
  const fileExt = file.name.split(".").pop();

  const fileName = `${uuidv4()}.${fileExt}`;

  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw error;
  }

  return data?.path;
}

export async function processUploadedDocument(
  filePath: string,
): Promise<ProcessDocumentResponse> {
  const response = await fetch("/api/document/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filePath }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || "Document processing failed");
  }

  return payload as ProcessDocumentResponse;
}

export async function uploadAndProcessDocument(
  file: File,
): Promise<ProcessDocumentResponse> {
  const filePath = await uploadDocument(file);

  if (!filePath) {
    throw new Error("Upload succeeded but no file path was returned");
  }

  return processUploadedDocument(filePath);
}
