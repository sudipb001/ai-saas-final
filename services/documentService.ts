import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import type { ListDocumentsResponse } from "@/types/document";

// type ProcessDocumentResponse = {
//   summary: string;
//   filePath: string;
//   fileName: string;
// };

type ProcessDocumentResponse = {
  job_id: string;
  status: string;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const response = await fetch("/api/document/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filePath,
      userId: user.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Processing failed");
  }

  const payload = await response.json();

  // return payload as ProcessDocumentResponse;
  return payload;
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

export async function listDocuments(): Promise<ListDocumentsResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const response = await fetch(`/api/documents?userId=${user.id}`);

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to load documents");
  }

  return {
    documents: payload.data ?? [],
  };
}
