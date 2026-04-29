import fs from 'fs/promises'
import path from 'path'
import { v4 as uuid } from 'uuid'

export type StorageProvider = 'local' | 's3' | 'supabase' | 'cloudinary'

export interface UploadResult {
  storageKey: string
  storageUrl: string | null
  provider: StorageProvider
  bucket: string | null
}

export interface SignedUrlResult {
  url: string
  expiresAt: Date
}

const PROVIDER: StorageProvider = (process.env.STORAGE_PROVIDER as StorageProvider) || 'local'
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// ─── Local provider ───────────────────────────────────────────────────────────

async function localUpload(
  buffer: Buffer,
  originalName: string,
  folder: string,
): Promise<UploadResult> {
  const ext = path.extname(originalName)
  const key = `${folder}/${uuid()}${ext}`
  const dest = path.join(LOCAL_UPLOAD_DIR, key)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, buffer)
  return { storageKey: key, storageUrl: null, provider: 'local', bucket: null }
}

async function localGetSignedUrl(key: string, _expiresInSeconds: number): Promise<SignedUrlResult> {
  // Local files served via /api/files/[...key] with session auth
  return {
    url: `/api/files/${key}`,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  }
}

async function localDelete(key: string): Promise<void> {
  try {
    await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key))
  } catch {
    // ignore missing files
  }
}

// ─── S3 provider (stub — wire up when AWS credentials are set) ───────────────

async function s3Upload(
  buffer: Buffer,
  originalName: string,
  folder: string,
): Promise<UploadResult> {
  // To activate: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  // Then replace this stub with real S3PutObjectCommand calls
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3').catch(() => {
    throw new Error('Install @aws-sdk/client-s3 to use S3 storage')
  })
  const ext = path.extname(originalName)
  const key = `${folder}/${uuid()}${ext}`
  const bucket = process.env.AWS_S3_BUCKET!
  const client = new S3Client({ region: process.env.AWS_REGION! })
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer }))
  return { storageKey: key, storageUrl: null, provider: 's3', bucket }
}

async function s3GetSignedUrl(key: string, expiresInSeconds: number): Promise<SignedUrlResult> {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3').catch(() => {
    throw new Error('Install @aws-sdk/client-s3 to use S3 storage')
  })
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner').catch(() => {
    throw new Error('Install @aws-sdk/s3-request-presigner to use S3 signed URLs')
  })
  const client = new S3Client({ region: process.env.AWS_REGION! })
  const bucket = process.env.AWS_S3_BUCKET!
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  )
  return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  folder: string,
): Promise<UploadResult> {
  switch (PROVIDER) {
    case 's3':
      return s3Upload(buffer, originalName, folder)
    case 'local':
    default:
      return localUpload(buffer, originalName, folder)
  }
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<SignedUrlResult> {
  switch (PROVIDER) {
    case 's3':
      return s3GetSignedUrl(key, expiresInSeconds)
    case 'local':
    default:
      return localGetSignedUrl(key, expiresInSeconds)
  }
}

export async function deleteFile(key: string): Promise<void> {
  switch (PROVIDER) {
    case 'local':
    default:
      return localDelete(key)
  }
}

export function getProvider(): StorageProvider {
  return PROVIDER
}
