import { Buffer } from 'node:buffer'

/** Minimal single-page PDF (Helvetica) for WHT certificate — ASCII lines only. */
export function buildAsciiPdf(lines: string[]): Buffer {
  const esc = (s: string) =>
    s
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, '?')

  const streamOps = lines.map((line, i) => {
    const y = 742 - i * 14
    return `BT /F1 10 Tf 40 ${y} Td (${esc(line)}) Tj ET`
  })
  const streamInner = streamOps.join('\n')
  const streamLen = Buffer.byteLength(streamInner, 'binary')

  let pdf = '%PDF-1.4\n'
  const xrefAt: number[] = []

  const pushObj = (n: number, body: string) => {
    xrefAt[n] = Buffer.byteLength(pdf, 'binary')
    pdf += `${n} 0 obj\n${body}\nendobj\n`
  }

  pushObj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  pushObj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  pushObj(
    3,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>'
  )
  pushObj(4, `<< /Length ${streamLen} >>\nstream\n${streamInner}\nendstream`)
  pushObj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const xrefStart = Buffer.byteLength(pdf, 'binary')
  const count = 6
  let xref = `xref\n0 ${count}\n`
  xref += '0000000000 65535 f \n'
  for (let i = 1; i < count; i++) {
    xref += `${String(xrefAt[i] ?? 0).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  pdf += xref + trailer

  return Buffer.from(pdf, 'binary')
}
