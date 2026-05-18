/** Client-side CSV / print-PDF helpers for reports. */

export function escapeCsvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "")
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ]
  return "\uFEFF" + lines.join("\n")
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function printReportHtml(title: string, htmlBody: string) {
  const w = window.open("", "_blank", "width=900,height=700")
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
h1{font-size:20px;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
th{background:#f8fafc}
@media print{body{padding:12px}}
</style></head><body>
<h1>${title}</h1>
${htmlBody}
<p style="margin-top:24px;font-size:11px;color:#94a3b8">aSistan — ${new Date().toLocaleString("tr-TR")}</p>
</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
  }, 300)
}
