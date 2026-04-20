import crypto from 'crypto';

type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  bytes?: number;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
};

type UploadOptions = {
  folder: string;
  fileName: string;
  mimeType: string;
};

function getCloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables are missing');
  }

  const isPlaceholder =
    cloudName.startsWith('your_') ||
    apiKey.startsWith('your_') ||
    apiSecret.startsWith('your_');

  if (isPlaceholder) {
    throw new Error('Cloudinary credentials are placeholders. Set real CLOUDINARY_* values in .env.local');
  }

  return { cloudName, apiKey, apiSecret };
}

function signUpload(folder: string, publicId: string, timestamp: number, apiSecret: string): string {
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  return crypto.createHash('sha1').update(toSign).digest('hex');
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadOptions
): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = options.fileName.replace(/\.[a-zA-Z0-9]+$/, '');
  const signature = signUpload(options.folder, publicId, timestamp, apiSecret);

  const formData = new FormData();
  const bytes = Uint8Array.from(buffer);
  const blob = new Blob([bytes], { type: options.mimeType });

  formData.append('file', blob, options.fileName);
  formData.append('folder', options.folder);
  formData.append('public_id', publicId);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  const resourceType = options.mimeType.startsWith('image/') ? 'image' : 'raw';
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = (await response.json()) as Record<string, any>;

  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(data?.error?.message || 'Cloudinary upload failed');
  }

  return {
    secureUrl: String(data.secure_url),
    publicId: String(data.public_id),
    bytes: typeof data.bytes === 'number' ? data.bytes : undefined,
    width: typeof data.width === 'number' ? data.width : undefined,
    height: typeof data.height === 'number' ? data.height : undefined,
    format: typeof data.format === 'string' ? data.format : undefined,
    resourceType: typeof data.resource_type === 'string' ? data.resource_type : undefined,
  };
}
