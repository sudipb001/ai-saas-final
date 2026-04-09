"use client";

import { useEffect, useState } from "react";
import {
  listDocuments,
  uploadAndProcessDocument,
} from "@/services/documentService";
import type { DocumentRecord } from "@/types/document";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  const loadDocuments = async () => {
    try {
      const data = await listDocuments();
      setDocuments(data.documents ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "An error occurred");
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    try {
      setUploading(true);
      setSummary("");

      const allowedTypes = ["application/pdf", "text/plain"];

      if (!allowedTypes.includes(file.type)) {
        setMessage("Only PDF and TXT files are supported");
        return;
      }

      // const result = await uploadAndProcessDocument(file);

      // setMessage(`File processed: ${result.fileName}`);
      // setSummary(result.summary);
      // await loadDocuments();

      await uploadAndProcessDocument(file);

      setMessage("Processing started... Please wait.");

      // Reload documents after short delay
      setTimeout(() => {
        loadDocuments();
        setMessage("");
      }, 2000);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ NEW: PDF Download Handler
  const handleDownloadPdf = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(
        `/api/document/pdf?id=${encodeURIComponent(documentId)}`,
      );

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName.toLowerCase().endsWith(".pdf")
        ? fileName
        : `${fileName.replace(/\.[^/.]+$/, "")}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setMessage("PDF download failed.");
    }
  };

  // ✅ Excel Download Handler
  const handleDownloadExcel = async () => {
    try {
      const response = await fetch("/api/document/excel");

      if (!response.ok) {
        throw new Error("Failed to generate Excel");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "documents.xlsx";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel download failed:", error);
      alert("Failed to download Excel file");
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
      <br />
      <button
        type="button"
        onClick={handleDownloadExcel}
        className="mt-3 bg-green-600 text-white px-3 py-1 rounded text-sm"
      >
        Download Excel
      </button>

      {message && <p className="mt-4 text-gray-300">{message}</p>}

      {summary && (
        <div className="mt-4 rounded border border-gray-700 bg-gray-800 p-3">
          <h3 className="mb-2 font-semibold text-white">Generated Summary</h3>
          <p className="text-sm text-gray-200 whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      <div className="mt-6 rounded border border-gray-700 bg-gray-800 p-3">
        <h3 className="mb-3 font-semibold text-white">Recent Documents</h3>

        {(documents?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-300">No processed documents yet.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded border border-gray-700 bg-gray-900 p-3"
              >
                <p className="text-sm font-medium text-white">
                  {doc.file_name}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {new Date(doc.created_at).toLocaleString()}
                </p>

                <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">
                  {(doc.summary ?? "No summary available.").slice(0, 200)}
                  {(doc.summary ?? "").length > 200 ? "..." : ""}
                </p>

                {/* ✅ NEW: Download PDF Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(doc.id, doc.file_name)}
                  className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
