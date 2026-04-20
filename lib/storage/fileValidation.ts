export type FileValidationResult = {
  valid: boolean;
  reason?: string;
};

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export function getFileExtension(fileNameOrPath: string): string {
  const clean = fileNameOrPath.split('?')[0].toLowerCase();
  const parts = clean.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1];
}

function guessMimeFromExtension(ext: string): string | null {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  };

  return map[ext] || null;
}

export function resolveMimeType(inputMimeType: string | undefined, fileNameOrPath: string): string | null {
  if (inputMimeType && inputMimeType.trim()) {
    return inputMimeType.trim().toLowerCase();
  }

  const ext = getFileExtension(fileNameOrPath);
  if (!ext) return null;
  return guessMimeFromExtension(ext);
}

export function validateImageFile(mimeType: string | null, sizeBytes?: number): FileValidationResult {
  if (!mimeType || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: 'Unsupported image type' };
  }

  if (typeof sizeBytes === 'number' && sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    return { valid: false, reason: 'Image file too large' };
  }

  return { valid: true };
}

export function validateDocumentFile(mimeType: string | null, sizeBytes?: number): FileValidationResult {
  if (!mimeType) {
    return { valid: false, reason: 'Unknown document type' };
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType) && !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: 'Unsupported document type' };
  }

  if (typeof sizeBytes === 'number' && sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    return { valid: false, reason: 'Document file too large' };
  }

  return { valid: true };
}

export function sanitizeStorageFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}
