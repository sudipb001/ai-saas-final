import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

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
