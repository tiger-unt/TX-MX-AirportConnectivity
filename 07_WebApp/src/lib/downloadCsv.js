/**
 * Convert an array of flat objects to a CSV string and trigger a browser download.
 *
 * ── BOILERPLATE NOTE ────────────────────────────────────────────────────────
 * This utility is data-agnostic: it reads column names from the first row's
 * keys, so it works with ANY flat dataset automatically. No changes needed
 * when swapping datasets.
 *
 * If your data contains nested objects, flatten them before calling this
 * function (e.g. `{ address: { city: 'Austin' } }` → `{ address_city: 'Austin' }`).
 *
 * @param {Object[]} data     – rows to export (array of flat objects)
 * @param {string}   filename – file name without extension (default: 'data')
 */
export function downloadCsv(data, filename = 'data') {
  if (!data?.length) return

  const keys = Object.keys(data[0])
  const header = keys.join(',')
  const rows = data.map((row) =>
    keys
      .map((k) => {
        const v = row[k]
        if (v == null) return ''
        const str = String(v)
        // Wrap in quotes if the value contains comma, quote, or newline
        return /[,"\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
      })
      .join(','),
  )

  const csv = [header, ...rows].join('\n')
  // Prefix with UTF-8 BOM so Excel opens the file with correct encoding
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
