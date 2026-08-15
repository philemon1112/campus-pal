// SRS 6.3 — Restaurant & MenuItem entities (Module M4, FR-FOOD-01 to 11)
export interface Restaurant {
  restId: string;
  providerId: string;
  name: string;
  cuisineType: string;
  priceRange: '$' | '$$' | '$$$';
  latitude: number;
  longitude: number;
  openingHours: string;
}

export interface MenuItem {
  itemId: string;
  restId: string;
  name: string;
  description: string;
  price: number;
  dietaryTags: string[]; // e.g. vegetarian, vegan, halal, gluten-free, nut-free
  photoUrl?: string;
}
