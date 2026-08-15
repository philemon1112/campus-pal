// Shared API types for CampusPal.
//
// These are the shapes the backend actually returns, verified against the
// live API on 2026-08-15. All three SRS features are backed now — campus
// locations, food joints with consent-gated contacts and reviews, and the
// assistant — so there is no longer a "specced but unimplemented" half of
// this file. docs/API_CONTRACT.md is the wire reference.
//
// Where a field is optional below it is genuinely optional on the wire, not
// a placeholder for something missing.

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface ApiPage<T> {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// The API rejects `limit` above this with a 400, so every list call has to
// stay under it — there is no "just ask for everything" page size.
export const MAX_PAGE_LIMIT = 100;

// --- Accounts ---

// Two products share one enum. TOURIST/OPERATOR are the tourism app's roles
// and still carry its bookings; STUDENT/STAFF/VISITOR/VENDOR are the SRS 2.3
// user classes; ADMIN serves both. Nothing was renamed, so a CampusPal user
// who registered without an affiliation is a TOURIST.
export type UserRole =
  | 'STUDENT'
  | 'STAFF'
  | 'VISITOR'
  | 'VENDOR'
  | 'ADMIN'
  | 'TOURIST'
  | 'OPERATOR';

// The only roles a user may self-declare at registration. VENDOR, OPERATOR
// and ADMIN are provisioned by the backend; sending one is a 400.
export const AFFILIATIONS = ['STUDENT', 'STAFF', 'VISITOR'] as const;
export type Affiliation = (typeof AFFILIATIONS)[number];

export const AFFILIATION_LABELS: Record<Affiliation, string> = {
  STUDENT: 'Student',
  STAFF: 'Staff or faculty',
  VISITOR: 'Visitor',
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

// --- Campus locations (SRS 3.1) ---

// SRS FR-1.1's six groups, verbatim.
export const LOCATION_CATEGORIES = [
  'LECTURE_HALL',
  'DEPARTMENT',
  'PARK_FIELD',
  'HOSTEL_HALL',
  'ADMINISTRATION',
  'OTHER',
] as const;

export type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

export const LOCATION_CATEGORY_LABELS: Record<LocationCategory, string> = {
  LECTURE_HALL: 'Lecture Halls',
  DEPARTMENT: 'Departments',
  PARK_FIELD: 'Parks & Fields',
  HOSTEL_HALL: 'Hostels & Halls',
  ADMINISTRATION: 'Administration',
  OTHER: 'Other',
};

export interface CampusLocation {
  id: string;
  slug: string;
  name: string;
  category: LocationCategory;
  description?: string;
  lat: number;
  lng: number;
  photos: string[];
  // SRS 6.1 "Associated Building/Landmark notes" — e.g. "Faces the Great
  // Hall".
  buildingNotes?: string;
  // Only present when the request supplied lat/lng.
  distanceKm?: number;
}

export interface LocationsQuery {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  q?: string;
  category?: LocationCategory;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface CreateLocationInput {
  // Unlike restaurants — where the server generates one from the name — a
  // location's slug is supplied by the caller and must be kebab-case. A
  // duplicate is a 409.
  slug: string;
  name: string;
  category: LocationCategory;
  description?: string;
  lat: number;
  lng: number;
  photos?: string[];
  buildingNotes?: string;
}

export type UpdateLocationInput = Partial<CreateLocationInput>;

// --- Favourites (SRS FR-1.7) ---

// The wire enum is the shared one (TOUR|STAY|RESTAURANT|DESTINATION|
// LOCATION). CampusPal uses two of its members: LOCATION as-is, and
// RESTAURANT under the name FOOD_JOINT. See favorites.ts for the mapping.
export type FavoriteType = 'LOCATION' | 'FOOD_JOINT';

export interface Favorite {
  id: string;
  type: FavoriteType;
  itemId: string;
  // Snapshotted server-side when the favourite is saved, so /saved renders
  // in one call with no per-item lookups. Note `title`, not `name`.
  item?: {
    title: string;
    slug?: string;
    imageUrl?: string;
  };
  createdAt: string;
}

// --- Reviews (SRS FR-2.8) ---

export interface Review {
  id: string;
  restaurantId: string;
  rating: number; // 1-5
  body: string;
  createdAt: string;
  // Always sent — the API resolves the reviewer rather than handing back a
  // bare authorId for the client to look up.
  author: { fullName: string; avatarUrl?: string | null };
}

export interface CreateReviewInput {
  rating: number;
  body: string;
}

// --- AI assistant (SRS 3.3) ---

// FR-3.5 is the reason this is a closed, discriminated union rather than
// free text: the client executes these, and it cannot safely act on prose.
// The server validates every member against real records before sending it,
// so each slug/id here resolves to something that exists.
export type AssistantAction =
  | { type: 'OPEN_LOCATION'; slug: string; name: string }
  | { type: 'OPEN_FOOD_JOINT'; slug: string; name: string }
  | { type: 'SHOW_DIRECTIONS'; lat: number; lng: number; name: string }
  | { type: 'CONTACT_FOOD_JOINT'; slug: string; name: string; channel: 'CALL' | 'WHATSAPP' }
  | { type: 'SAVE_FAVORITE'; favoriteType: FavoriteType; itemId: string; name: string };

// Inline result cards. `kind` picks which card component renders the row, so
// a chat result and a list result stay the same component.
export interface AssistantResults {
  kind: 'LOCATION' | 'FOOD_JOINT';
  items: unknown[];
}

// Roles are UPPERCASE on the wire (`USER`/`ASSISTANT`), matching the stored
// chat-message enum.
export type AssistantRole = 'USER' | 'ASSISTANT';

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
  createdAt: string;
  actions?: AssistantAction[];
  results?: AssistantResults[];
}

export interface AssistantReply {
  // Echoed back so a guest can keep one conversation without an account
  // (SRS 6.1 makes Chat Session.User ID nullable).
  sessionId: string;
  reply: string;
  actions: AssistantAction[];
  results?: AssistantResults[];
}

export interface AssistantSession {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantSessionDetail extends AssistantSession {
  messages: AssistantMessage[];
}

export interface SendMessageInput {
  sessionId?: string;
  message: string;
}

// --- Reference data ---

export interface ReferenceEntry {
  code: string;
  label: string;
}

// --- Request payloads ---

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  // Optional: omitting it creates a TOURIST, which is what the tourism app
  // relies on. CampusPal always sends one.
  affiliation?: Affiliation;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
}
