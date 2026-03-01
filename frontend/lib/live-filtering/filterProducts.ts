import type { CatalogProduct } from "../catalog";
import type { LiveFilters } from "./types";

export function filterProducts(
  products: CatalogProduct[],
  filters: LiveFilters,
): CatalogProduct[] {
  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    if (filters.gender && product.gender !== filters.gender) {
      return false;
    }

    if (filters.size && !product.availableSizes.includes(filters.size)) {
      return false;
    }

    if (filters.color && !product.colors.includes(filters.color)) {
      return false;
    }

    if (typeof filters.maxPrice === "number" && product.price > filters.maxPrice) {
      return false;
    }

    if (typeof filters.minPrice === "number" && product.price < filters.minPrice) {
      return false;
    }

    if (filters.currency && product.currency !== filters.currency) {
      return false;
    }

    return true;
  });
}
