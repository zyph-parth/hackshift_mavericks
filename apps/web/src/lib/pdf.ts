/** Client-side PDF text extraction. pdf.js is loaded on demand so it never weighs down the first page load. */
export async function pdfText(file: File, maxPages = 30): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) { lines.push(line.trim()); line = ''; } else line += ' ';
    }
    if (line.trim()) lines.push(line.trim());
    out.push(lines.filter(Boolean).join('\n'));
  }
  await doc.destroy();
  return { text: out.join('\n\n').replace(/[ \t]+/g, ' ').trim(), pages: doc.numPages };
}
