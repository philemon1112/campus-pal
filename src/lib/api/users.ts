import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';
import type { UpdateProfileInput, UserProfile } from './types';

export function getMe$(): Observable<UserProfile> {
  return apiRequest$<UserProfile>('/users/me');
}

export function updateMe$(input: UpdateProfileInput): Observable<UserProfile> {
  return apiRequest$<UserProfile>('/users/me', { method: 'PATCH', body: input });
}
