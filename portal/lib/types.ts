/**
 * Shared TypeScript types used across the Next.js portal.
 *
 * These interfaces mirror the JSON shapes returned by the Python backend
 * (estimator) and the Java backend (market analysis). Keeping them in one
 * place makes it easier to keep the frontend and backend contracts in sync.
 */

/**
 * Core property features used for prediction.
 * The index signature allows iterating over fields generically in forms.
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

/**
 * A single prediction stored in the estimator history.
 */
export interface PredictionRecord {
  id: number;
  features: HouseFeatures;
  predicted_price: number;
  created_at: string;
}

/**
 * Response from the Python backend after predicting a single property.
 */
export interface PredictionResponse {
  predicted_price: number;
  record: PredictionRecord;
}

/**
 * One item in a batch comparison response.
 */
export interface CompareResult {
  features: HouseFeatures;
  predicted_price: number;
}

/**
 * Aggregate statistics returned by the Java backend for a market segment.
 */
export interface MarketStatistics {
  count: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  averageSquareFootage: number;
  averageSchoolRating: number;
}

/**
 * A record from the housing dataset, including its actual sale price.
 */
export interface HouseRecord extends HouseFeatures {
  id: number;
  price: number;
}

/**
 * Filters and sort order for the market data table.
 * All filter fields are optional; omitted values are treated as "no limit".
 */
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

/**
 * Request body for the what-if analysis endpoint.
 * Reuses HouseFeatures because a hypothetical property has the same inputs.
 */
export interface WhatIfRequest extends HouseFeatures {}

/**
 * Response from the Java backend after running a what-if analysis.
 */
export interface WhatIfResponse {
  predictedPrice: number;
  comparables: HouseRecord[];
}
