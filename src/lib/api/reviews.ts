import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';
import type { ApiPage, CreateReviewInput, Review } from './types';

export function listTourReviews$(tourId: string, page = 1, limit = 20): Observable<ApiPage<Review>> {
  return apiRequest$<ApiPage<Review>>(`/tours/${tourId}/reviews`, {
    auth: false,
    query: { page, limit },
  });
}

export function createReview$(
  bookingReference: string,
  input: CreateReviewInput,
): Observable<Review> {
  return apiRequest$<Review>(`/bookings/${bookingReference}/review`, {
    method: 'POST',
    body: input,
  });
}
