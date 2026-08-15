import { useRef, useState } from 'react';
import { ImageUp, X } from 'lucide-react';
import { ApiError, uploadsApi } from '@/lib/api';

// POST /uploads/image behind a field that always degrades to a plain URL
// input. The endpoint needs Cloudinary configured server-side and returns
// 503 when it isn't, so "paste a URL instead" has to be a first-class path
// rather than an afterthought.
//
// Shared by the operator tour form and the admin destination form; both
// store a hosted image URL in the same way.
export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    uploadsApi.uploadImage$(file).subscribe({
      next: (result) => onChange(result.url),
      error: (err: unknown) => {
        // 503 = Cloudinary not configured, 400 = not an image, 403 = wrong
        // role. All three are actionable, so show the server's own message
        // and leave the URL field available.
        setError(
          err instanceof ApiError
            ? err.code === 503
              ? 'Image uploads aren’t configured on the server. Paste a hosted image URL below instead.'
              : err.message
            : 'Upload failed.',
        );
        setUploading(false);
      },
      complete: () => setUploading(false),
    });
  }

  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white">{label}</span>

      {/* The preview frame is always present so uploading doesn't reflow
          the form; it just fills in. */}
      <div className="flex items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImageUp className={`size-6 ${uploading ? 'animate-pulse' : ''}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 disabled:opacity-50 dark:bg-neutral-900 dark:text-white"
            >
              {uploading ? 'Uploading…' : 'Choose image'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-neutral-500"
              >
                <X className="size-4" /> Clear
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste an image URL"
        className="mt-2 w-full rounded-xl bg-neutral-100 px-4 py-2.5 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
      />

      {error && <p className="mt-1.5 text-sm text-danger-500">{error}</p>}
    </div>
  );
}
