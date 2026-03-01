import type {
  CurrencyCode,
  ProductCategory,
  ProductColor,
  ProductGender,
  ProductSize,
} from "../catalog";

export type FilterConfidence = "tentative" | "stable";
export type FilterSource = "deterministic" | "cerebras";

export type LiveFilters = {
  rawTranscript: string;
  category?: ProductCategory;
  maxPrice?: number;
  minPrice?: number;
  currency?: CurrencyCode;
  gender?: ProductGender;
  size?: ProductSize;
  color?: ProductColor;
  confidence: {
    category?: FilterConfidence;
    price?: FilterConfidence;
    gender?: FilterConfidence;
    size?: FilterConfidence;
  };
};

export type LiveFiltersResult = {
  filters: LiveFilters;
  source: FilterSource;
  rawResponse?: string;
};

export function createEmptyLiveFilters(rawTranscript = ""): LiveFilters {
  return {
    rawTranscript,
    confidence: {},
  };
}
