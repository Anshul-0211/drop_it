'use client';

import { useState, useRef, useCallback } from 'react';
import { Link2, FileText, Paperclip, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickCaptureProps {
  onItemCreated: () => void;
}

type DetectedType = 'url' | 'note' | 'file' | null;

const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/i;

const PLACEHOLDERS = [
  'Paste a link to save it...',
  'Write a quick note...',
  'Drop a file to capture it...',
];

export default function QuickCapture({ onItemCreated }: QuickCaptureProps) {
  const [value, setValue] = useState('');
  const [detectedType, setDetectedType] = useState<DetectedType>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [placeholderIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectType = useCallback((text: string): DetectedType => {
    if (!text.trim()) return null;
    if (URL_PATTERN.test(text.trim())) return 'url';
    return 'note';
  }, []);

  const handleChange = (v: string) => {
    setValue(v);
    setDetectedType(detectType(v));
    setError(null);
  };

  const handleSave = async () => {
    if (!value.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const trimmed = value.trim();
      const body: Record<string, unknown> = { source: 'web' };

      if (detectedType === 'url') {
        const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        body.type = 'link';
        body.url = normalizedUrl;
        body.title = normalizedUrl;
      } else {
        body.type = 'text';
        body.title = trimmed.substring(0, 80);
        body.description = trimmed;
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      setValue('');
      setDetectedType(null);
      setSuccessMsg(detectedType === 'url' ? '🔗 Link saved!' : '📝 Note saved!');
      setTimeout(() => setSuccessMsg(null), 2500);
      onItemCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || 'Upload failed');
      }

      setSuccessMsg(`📁 File "${file.name}" uploaded successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      onItemCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      handleChange(text);
    }
  };

  const typeConfig: Record<NonNullable<DetectedType>, { icon: typeof Link2; label: string; color: string }> = {
    url: { icon: Link2, label: 'Save Link', color: 'var(--accent-primary)' },
    note: { icon: FileText, label: 'Save Note', color: '#6366F1' },
    file: { icon: Paperclip, label: 'Upload File', color: '#10B981' },
  };

  const activeType = detectedType ? typeConfig[detectedType] : null;

  return (
    <div className="mb-6">
      <div
        className="dt-capture-bar"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={isDragging ? { borderColor: 'var(--accent-primary)', background: 'var(--accent-soft)' } : {}}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div style={{ color: activeType?.color ?? 'var(--text-muted)', flexShrink: 0 }}>
            {detectedType === 'url' ? (
              <Link2 size={18} />
            ) : detectedType === 'note' ? (
              <FileText size={18} />
            ) : (
              <Paperclip size={18} />
            )}
          </div>

          {/* Input */}
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)', '::placeholder': { color: 'var(--text-muted)' } } as React.CSSProperties}
          />

          {/* Clear button */}
          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => {
                  setValue('');
                  setDetectedType(null);
                }}
                className="p-1 rounded-full transition-all"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* File upload trigger */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg transition-all"
            title="Attach file"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Paperclip size={16} />
          </button>

          {/* Save button */}
          <AnimatePresence mode="wait">
            {activeType ? (
              <motion.button
                key="save"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="dt-btn-primary shrink-0"
                style={{ background: activeType.color, opacity: isSaving ? 0.7 : 1 }}
              >
                <activeType.icon size={14} />
                {isSaving ? 'Saving...' : activeType.label}
                <ArrowRight size={14} />
              </motion.button>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs px-3 py-1.5 rounded-lg shrink-0 hidden sm:block"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                ↵ Enter
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="px-4 pb-3 text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
            Drop to capture content...
          </div>
        )}
      </div>

      {/* Feedback messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-2 text-xs font-medium pl-1" style={{ color: 'var(--accent-primary)' }}>
            {successMsg}
          </motion.p>
        )}
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-2 text-xs pl-1" style={{ color: 'var(--destructive)' }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />
    </div>
  );
}
