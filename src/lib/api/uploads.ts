import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';
import type { UploadResult } from './types';

// The one multipart endpoint in the API. Returns a hosted Cloudinary URL to
// drop into a `heroImageUrl`/`avatarUrl` field.
//
// Two error codes worth handling at the call site:
//   400 -- the file isn't an image
//   503 -- Cloudinary isn't configured on the server
//
// The old OPERATOR/ADMIN-only restriction is GONE -- the endpoint is now
// open to any authenticated role (verified with a TOURIST token, which got
// a 201 and a real Cloudinary URL back). Tourist avatars can be uploaded
// directly; no externally hosted URL needed any more.
export function uploadImage$(file: File): Observable<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest$<UploadResult>('/uploads/image', { method: 'POST', body: form });
}
