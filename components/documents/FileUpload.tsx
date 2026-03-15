"use client";

import { useState } from "react";
import { uploadDocument } from "@/services/documentService";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    try {
      setUploading(true);

      const filePath = await uploadDocument(file);

      setMessage(`File uploaded: ${filePath}`);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl border border-gray-700 rounded p-4 bg-gray-900">
      <h2 className="text-xl font-bold mb-4">Upload Document</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-purple-600 text-white px-4 py-2 rounded"
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload File"}
      </button>

      {message && <p className="mt-4 text-gray-300">{message}</p>}
    </div>
  );
}
