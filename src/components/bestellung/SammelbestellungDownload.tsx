import { FileSpreadsheet, FileText } from 'lucide-react'

// Download der Sammelbestellung einer abgeschlossenen Runde als PDF und
// Excel. Die Dateien erzeugt der Server bei jedem Abruf neu, nur für Admins.
export function SammelbestellungDownload({
  runde,
  klein = false,
}: {
  runde: string
  klein?: boolean
}) {
  const pfad = (format: 'pdf' | 'xlsx') =>
    `/api/sammelbestellung/${encodeURIComponent(runde)}/${format}`
  const stil = `bg-slate text-bone hover:bg-line inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:translate-y-px ${
    klein ? 'min-h-10 px-4 text-[14px]' : 'min-h-12 px-5 text-[15px]'
  }`
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={pfad('pdf')} download className={stil}>
        <FileText className="size-4" /> PDF
      </a>
      <a href={pfad('xlsx')} download className={stil}>
        <FileSpreadsheet className="size-4" /> Excel
      </a>
    </div>
  )
}
