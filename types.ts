
export interface PlaceDetail {
  label: string;
  value: string;
  icon: string; // e.g., 'calendar', 'globe', 'geology'
}

export interface HistoricalPlace {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  zoom_level: number;
  details: PlaceDetail[];
  locationType: 'point' | 'area';
  placeId: string; // Google Place ID
}

export interface Category {
  key: string;
  name: string;
  emoji: string;
}

export interface Slide {
  slide_type: 'overview' | 'historical_timeline' | 'cultural_context' | 'then_vs_now' | 'architectural_details';
  title: string;
  subtitle: string;
  key_points: string[];
  image_prompt: string;
}
