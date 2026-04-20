import { supabaseAdmin } from '@/lib/supabase';

type SupabaseStorageUploadResult = {
  bucket: string;
  path: string;
  publicUrl: string | null;
};

export function parseSupabaseStorageUri(uri: string): { bucket: string; path: string } | null {
  if (!uri.startsWith('supabase://')) {
    return null;
  }

  const withoutProtocol = uri.replace('supabase://', '');
  const firstSlash = withoutProtocol.indexOf('/');

  if (firstSlash < 1 || firstSlash === withoutProtocol.length - 1) {
    return null;
  }

  const bucket = withoutProtocol.slice(0, firstSlash);
  const path = withoutProtocol.slice(firstSlash + 1);

  return { bucket, path };
}

export async function uploadBufferToSupabaseStorage(options: {
  userId: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
  bucket?: string;
}): Promise<SupabaseStorageUploadResult> {
  const bucket = options.bucket || process.env.SUPABASE_DOCUMENTS_BUCKET || 'documents';
  const path = `${options.userId}/${Date.now()}-${options.fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, options.fileBuffer, {
      contentType: options.mimeType,
      upsert: false,
    });

  if (error || !data?.path) {
    throw new Error(error?.message || 'Supabase Storage upload failed');
  }

  const isPublic = String(process.env.SUPABASE_DOCUMENTS_BUCKET_PUBLIC || 'false').toLowerCase() === 'true';

  if (!isPublic) {
    return { bucket, path: data.path, publicUrl: null };
  }

  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

  return {
    bucket,
    path: data.path,
    publicUrl: publicData?.publicUrl || null,
  };
}

export async function createSupabaseSignedUrl(options: {
  bucket?: string;
  path: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const bucket = options.bucket || process.env.SUPABASE_DOCUMENTS_BUCKET || 'documents';
  const expiresInSeconds = options.expiresInSeconds || 3600;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(options.path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Failed to create signed URL');
  }

  return data.signedUrl;
}
