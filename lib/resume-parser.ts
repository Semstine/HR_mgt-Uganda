import mammoth from 'mammoth'
import fs from 'fs/promises'
import path from 'path'

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.docx') {
    const buffer = await fs.readFile(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === '.pdf') {
    // For PDF, return a message — full PDF parsing requires pdf.js or pdfjs-dist
    // which has complex setup. For MVP, we read the text if it's embedded.
    try {
      const buffer = await fs.readFile(filePath)
      const text = buffer.toString('utf-8')
      // Simple extraction: look for readable text chunks
      const readable = text
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return readable.length > 100 ? readable : '[PDF text extraction unavailable — please review file manually]'
    } catch {
      return '[Could not read PDF file]'
    }
  }

  if (ext === '.txt') {
    return fs.readFile(filePath, 'utf-8')
  }

  return '[Unsupported file format]'
}

export function parseContactInfo(text: string): {
  email?: string
  phone?: string
  name?: string
  location?: string
} {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/)?.[0]
  const phoneMatch = text.match(/(\+?[\d\s()-]{10,15})/)?.[0]?.trim()

  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  const name = lines[0]?.trim().replace(/resume|cv|curriculum vitae/gi, '').trim()

  const locationKeywords = ['kampala', 'nairobi', 'dar es salaam', 'kigali', 'entebbe', 'mombasa', 'uganda', 'kenya', 'tanzania', 'rwanda']
  const locationLine = lines.find((l) => locationKeywords.some((kw) => l.toLowerCase().includes(kw)))

  return {
    email: emailMatch,
    phone: phoneMatch,
    name: name && name.length < 60 ? name : undefined,
    location: locationLine?.trim(),
  }
}
