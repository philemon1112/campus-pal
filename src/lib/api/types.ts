// Shared API types for CampusPal.
//
// Two different things live in this file and it matters which is which:
//
//   1. Shapes the live backend returns TODAY (envelope, pagination, auth,
//      user profile, food joints via ./restaurants.ts).
//   2. Shapes CampusPal needs but the backend does not implement yet —
//      campus Locations, the AI assistant, food-joint reviews. These are
//      written here as the contract the UI is built against, and every one
//      of them is specced for the backend team in docs/API_REQUIREMENTS.md.
//
// Group 2 is typed, not faked. A screen backed by a group-2 type renders its
// real markup and an honest empty state; it never invents rows to fill in.

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

// --- Accounts ---

// SRS 2.3 describes five user classes. The live backend still uses the
// tourism app's enum (`TOURIST | OPERATOR | ADMIN`), so the extra members
// below will 403 until the backend renames them — see
// docs/API_REQUIREMENTS.md §D. `RoleGate` is presentation only, so an
// unmapped role simply means the console isn't offered.
export type UserRole = 'STUDENT' | 'STAFF' | 'VISITOR' | 'VENDOR' | 'ADMIN';

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

// --- Campus locations (SRS 3.1) — NOT YET IMPLEMENTED BY THE BACKEND ---

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
  // SRS 6.1 says "Photo(s)" — plural. The tourism API only ever carried one
  // hero image per record, which is why this is specced as an array.
  photos: string[];
  // SRS 6.1 "Associated Building/Landmark notes" — e.g. "second floor,
  // above the Registry".
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

// The live endpoint exists but its enum is the tourism one
// (`TOUR|STAY|RESTAURANT|DESTINATION`). `FOOD_JOINT` maps onto `RESTAURANT`
// today; `LOCATION` has no server-side equivalent yet, which is why saving a
// campus location is inert. See docs/API_REQUIREMENTS.md §D.
export type FavoriteType = 'LOCATION' | 'FOOD_JOINT';

export interface Favorite {
  id: string;
  type: FavoriteType;
  itemId: string;
  item?: {
    id: string;
    slug?: string;
    name: string;
    subtitle?: string;
    imageUrl?: string;
  };
  createdAt: string;
}

// --- Reviews (SRS FR-2.8) — NOT YET IMPLEMENTED BY THE BACKEND ---

export interface Review {
  id: string;
  rating: number; // 1-5
  body: string;
  createdAt: string;
  // The tourism API's review payload carried an `authorId` and no name, so
  // its review list deliberately showed no identity. Specced with an author
  // summary here so CampusPal's cards can attribute feedback.
  author?: { fullName: string; avatarUrl?: string };
}

export interface CreateReviewInput {
  rating: number;
  body: string;
}

// --- AI assistant (SRS 3.3) — NOT YET IMPLEMENTED BY THE BACKEND ---

// FR-3.5 is the reason this is a closed, discriminated union rather than
// free text: the client executes these, and it cannot safely act on prose.
// Anything the assistant wants the app to DO has to arrive as one of these.
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

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
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
  title: string;
  createdAt: string;
  messageCount: number;
}

export interface SendMessageInput {
  sessionId?: string;
  message: string;
}

// --- Request payloads ---

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
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
