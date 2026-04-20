export type ItemType = 'link' | 'image' | 'text' | 'pdf' | 'document';
export type ItemStatus = 'unread' | 'read';
export type ItemSource = 'telegram' | 'web' | 'import';
export type ItemSection = 'inbox' | 'saved' | 'trash';
export type ItemStateFilter = 'all' | 'read' | 'unread';

export interface Item {
  id: string;
  user_id: string;
  folder_id?: string | null;
  type: ItemType;
  title: string;
  description?: string;
  url?: string;
  file_url?: string;
  file_mime_type?: string;
  file_size?: number;
  cloudinary_public_id?: string;
  storage_provider?: string;
  preview_image?: string;
  tags: string[];
  status: ItemStatus;
  is_saved?: boolean;
  deleted_at?: string | null;
  source: ItemSource;
  url_hash?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  position: number;
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  github_id?: string;
  telegram_user_id?: number;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  count: number;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ItemsResponse extends ApiResponse<Item[]> {
  total?: number;
  page?: number;
  perPage?: number;
  counts?: {
    inbox: number;
    saved: number;
    trash: number;
    unread: number;
    read: number;
  };
}

export interface FoldersResponse extends ApiResponse<Folder[]> {}
