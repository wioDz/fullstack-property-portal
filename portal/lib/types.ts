/**
 * Shared TypeScript types used across the Next.js portal.
 */

export interface HouseFeatures {
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
  [key: string]: number;
}

export interface PredictionRecord {
  id: number;
  features: HouseFeatures;
  predicted_price: number;
  created_at: string;
}

export interface PredictionResponse {
  predicted_price: number;
  record: PredictionRecord;
}

export interface CompareResult {
  features: HouseFeatures;
  predicted_price: number;
}

export interface MarketStatistics {
  count: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  averageSquareFootage: number;
  averageSchoolRating: number;
}

export interface HouseRecord extends HouseFeatures {
  id: number;
  price: number;
}

export interface FilterRequest {
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  minSchoolRating?: number;
  maxSchoolRating?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface WhatIfRequest extends HouseFeatures {}

export interface WhatIfResponse {
  predictedPrice: number;
  comparables: HouseRecord[];
}
