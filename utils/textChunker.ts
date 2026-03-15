export function splitTextIntoChunks(text: string, maxLength = 3000): string[] {
  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = start + maxLength;

    chunks.push(text.slice(start, end));

    start = end;
  }

  return chunks;
}
