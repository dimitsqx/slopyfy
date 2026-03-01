import type {
  CurrencyCode,
  ProductCategory,
  ProductColor,
  ProductGender,
  ProductSize,
} from "../catalog";
import {
  createEmptyLiveFilters,
  type LiveFiltersResult,
} from "./types";

type MatchEntry<T> = {
  value: T;
  patterns: string[];
};

const CATEGORY_MATCHES: MatchEntry<ProductCategory>[] = [
  { value: "tshirt", patterns: ["tshirt", "t-shirt", "tee", "tees"] },
  { value: "shirt", patterns: ["shirt", "button shirt", "button-up", "button down"] },
  { value: "hoodie", patterns: ["hoodie", "sweatshirt"] },
  { value: "jacket", patterns: ["jacket", "coat", "overshirt"] },
  { value: "pants", patterns: ["pants", "trousers", "chino", "chinos"] },
  { value: "jeans", patterns: ["jeans", "denim"] },
];

const GENDER_MATCHES: MatchEntry<ProductGender>[] = [
  { value: "men", patterns: ["for men", "mens", "men's", "male", "for him"] },
  { value: "women", patterns: ["for women", "womens", "women's", "female", "for her"] },
  { value: "unisex", patterns: ["unisex", "for everyone"] },
];

const SIZE_MATCHES: MatchEntry<ProductSize>[] = [
  { value: "XS", patterns: ["extra small", "size xs", " xs "] },
  { value: "S", patterns: ["small", "size s", " size s "] },
  { value: "M", patterns: ["medium", "size m", " size m "] },
  { value: "L", patterns: ["large", "size l", " size l "] },
  { value: "XL", patterns: ["extra large", "size xl", " xl "] },
];

const COLOR_MATCHES: MatchEntry<ProductColor>[] = [
  { value: "black", patterns: ["black"] },
  { value: "white", patterns: ["white"] },
  { value: "blue", patterns: ["blue"] },
  { value: "navy", patterns: ["navy"] },
  { value: "green", patterns: ["green"] },
  { value: "red", patterns: ["red"] },
  { value: "grey", patterns: ["grey", "gray"] },
  { value: "beige", patterns: ["beige", "tan"] },
];

const PRICE_PATTERNS = [
  /(?:under|below|less than|max(?:imum)? of)\s+(\d+(?:\.\d+)?)(?:\s*(gbp|usd|eur))?/i,
  /(\d+(?:\.\d+)?)\s*(gbp|usd|eur)\s+or less/i,
];

function findValue<T>(input: string, entries: MatchEntry<T>): T | undefined;
function findValue<T>(input: string, entries: MatchEntry<T>[]): T | undefined;
function findValue<T>(input: string, entries: MatchEntry<T> | MatchEntry<T>[]) {
  const list = Array.isArray(entries) ? entries : [entries];

  for (const entry of list) {
    if (entry.patterns.some((pattern) => input.includes(pattern))) {
      return entry.value;
    }
  }

  return undefined;
}

function normalizeInput(rawTranscript: string) {
  return ` ${rawTranscript.trim().toLowerCase()} `;
}

function detectCurrency(input: string): CurrencyCode | undefined {
  if (input.includes("usd") || input.includes("dollar")) {
    return "USD";
  }

  if (input.includes("eur") || input.includes("euro")) {
    return "EUR";
  }

  if (input.includes("gbp") || input.includes("pound")) {
    return "GBP";
  }

  return undefined;
}

export function parseLiveFilters(rawTranscript: string): LiveFiltersResult {
  const normalized = normalizeInput(rawTranscript);
  const filters = createEmptyLiveFilters(rawTranscript);

  if (!rawTranscript.trim()) {
    return {
      filters,
      source: "deterministic",
    };
  }

  const category = findValue(normalized, CATEGORY_MATCHES);
  if (category) {
    filters.category = category;
    filters.confidence.category = "stable";
  }

  const gender = findValue(normalized, GENDER_MATCHES);
  if (gender) {
    filters.gender = gender;
    filters.confidence.gender = "stable";
  }

  const size = findValue(normalized, SIZE_MATCHES);
  if (size) {
    filters.size = size;
    filters.confidence.size = "stable";
  }

  const color = findValue(normalized, COLOR_MATCHES);
  if (color) {
    filters.color = color;
  }

  for (const pattern of PRICE_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }

    const amount = match[1];
    const explicitCurrency = match[2];
    const parsed = Number(amount);
    if (Number.isNaN(parsed)) {
      continue;
    }

    filters.maxPrice = parsed;
    if (explicitCurrency) {
      filters.currency = explicitCurrency.toUpperCase() as CurrencyCode;
    }
    filters.confidence.price = "stable";
    break;
  }

  if (!filters.currency) {
    filters.currency = detectCurrency(normalized);
  }

  return {
    filters,
    source: "deterministic",
  };
}
