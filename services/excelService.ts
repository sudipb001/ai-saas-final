import * as XLSX from "xlsx";

function formatDateUtc(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

export function generateExcelFromDocuments(documents: any[]): Buffer {
  const rows = documents.map((doc) => [
    doc.file_name ?? "Untitled",
    doc.summary ?? "No summary available.",
    doc.created_at ? formatDateUtc(doc.created_at) : "",
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["File Name", "Summary", "Created At"],
    ...rows,
  ]);

  // Column widths
  worksheet["!cols"] = [{ wch: 32 }, { wch: 72 }, { wch: 24 }];

  // Styling
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:C1");

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;

      const isHeader = r === 0;

      cell.s = {
        font: { bold: isHeader },
        alignment: {
          vertical: "top",
          wrapText: c === 1,
        },
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
}
