import * as XLSX from "xlsx";

export function generateExcelFromDocuments(
  documents: {
    file_name: string;
    summary: string;
    created_at: string;
  }[],
): Buffer {
  // Step 1 — Convert to tabular JSON
  const data = documents.map((doc) => ({
    "File Name": doc.file_name,
    Summary: doc.summary,
    "Created At": new Date(doc.created_at).toLocaleString(),
  }));

  // Step 2 — Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Step 3 — Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");

  // Step 4 — Generate buffer
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return buffer;
}
