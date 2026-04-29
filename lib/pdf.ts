import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function generateOfferLetter(params: {
  candidateName: string
  role: string
  salary: number
  currency: string
  startDate: string
  probationMonths: number
  supervisor?: string
  workLocation?: string
  benefits?: string
  companyName: string
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  const margin = 60
  let y = height - margin

  const draw = (text: string, x: number, yPos: number, size = 11, bold = false) => {
    page.drawText(text, {
      x,
      y: yPos,
      size,
      font: bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: width - margin * 2,
    })
  }

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.15, 0.39, 0.92) })
  draw(params.companyName, margin, height - 45, 18, true)
  page.drawText('OFFER OF EMPLOYMENT', { x: margin, y: height - 65, size: 11, font, color: rgb(1, 1, 1) })

  y -= 100

  draw(new Date().toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' }), margin, y, 10)
  y -= 30
  draw(`Dear ${params.candidateName},`, margin, y, 11, true)
  y -= 25

  const introText = `We are pleased to offer you the position of ${params.role} at ${params.companyName}. This letter outlines the terms and conditions of your employment.`
  const words = introText.split(' ')
  let line = ''
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (testLine.length > 80) {
      draw(line, margin, y, 11)
      y -= 18
      line = word
    } else {
      line = testLine
    }
  }
  if (line) { draw(line, margin, y, 11); y -= 25 }

  y -= 10
  draw('TERMS OF EMPLOYMENT', margin, y, 12, true)
  y -= 5
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.15, 0.39, 0.92) })
  y -= 20

  const terms = [
    ['Position:', params.role],
    ['Start Date:', params.startDate],
    ['Work Location:', params.workLocation || 'Company Premises'],
    ['Employment Type:', 'Full-Time, Permanent'],
    ['Probation Period:', `${params.probationMonths} months`],
    ['Annual Salary:', `${params.currency} ${params.salary.toLocaleString()}`],
    ['Reporting To:', params.supervisor || 'As advised by Management'],
  ]

  for (const [label, value] of terms) {
    draw(label, margin, y, 11, true)
    draw(value, margin + 140, y, 11)
    y -= 22
  }

  if (params.benefits) {
    y -= 10
    draw('BENEFITS:', margin, y, 11, true)
    y -= 20
    draw(params.benefits, margin, y, 10)
    y -= 30
  }

  y -= 20
  draw('Please sign below to accept this offer within 7 days of receipt.', margin, y, 10)
  y -= 40

  draw('Signature: _________________________', margin, y, 10)
  draw('Date: _________________________', margin + 240, y, 10)
  y -= 25
  draw(`${params.candidateName}`, margin, y, 10)
  draw('Candidate', margin, y - 15, 9)

  y -= 60
  draw('For and on behalf of ' + params.companyName, margin, y, 10)
  draw('Signature: _________________________', margin, y - 20, 10)
  draw('HR Manager', margin, y - 40, 9)

  return doc.save()
}
