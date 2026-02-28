"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CopilotKit, useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import "./style.css";
import { PRODUCTS, Product } from "./data";

type PriceRange = {
  min: number;
  max: number;
};

type FilterState = {
  category: Product["category"] | "all";
  colors: string[];
  sizes: string[];
  priceRange: PriceRange;
};

type ShoppingAgentState = {
  filters: FilterState;
};

const maxPrice = Math.max(...PRODUCTS.map((product) => product.priceUsd));

const INITIAL_FILTERS: FilterState = {
  category: "all",
  colors: [],
  sizes: [],
  priceRange: { min: 0, max: maxPrice },
};

const INITIAL_STATE: ShoppingAgentState = {
  filters: INITIAL_FILTERS,
};

const uniqueValues = <T extends string>(values: T[]) => Array.from(new Set(values)).sort();

const categoryOptions: FilterState["category"][] = [
  "all",
  ...uniqueValues(PRODUCTS.map((product) => product.category) as Product["category"][]),
];
const colorOptions = uniqueValues(PRODUCTS.flatMap((product) => product.colors));
const sizeOptions = uniqueValues(PRODUCTS.flatMap((product) => product.sizes));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sanitizePriceRange = (range: Partial<PriceRange>): PriceRange => {
  let min = Number.isFinite(range.min) ? Number(range.min) : 0;
  let max = Number.isFinite(range.max) ? Number(range.max) : maxPrice;
  min = clamp(min, 0, maxPrice);
  max = clamp(max, 0, maxPrice);
  if (min > max) {
    [min, max] = [max, min];
  }
  return { min, max };
};

const normalizeFilters = (next: Partial<FilterState>): FilterState => ({
  category: (next.category ?? INITIAL_FILTERS.category) as FilterState["category"],
  colors: Array.isArray(next.colors) ? next.colors : [],
  sizes: Array.isArray(next.sizes) ? next.sizes : [],
  priceRange: sanitizePriceRange(next.priceRange ?? INITIAL_FILTERS.priceRange),
});

export default function ShoppingClient() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false} agent="strands_agent">
      <div className="app-shell">
        <ShoppingApp />
        <CopilotSidebar
          defaultOpen
          labels={{
            title: "Shop Assistant",
            initial: "Tell me how to filter the catalog.",
          }}
          clickOutsideToClose={false}
        />
      </div>
    </CopilotKit>
  );
}

function ShoppingApp() {
  const { state: agentState, setState: setAgentState } = useCoAgent<ShoppingAgentState>({
    name: "strands_agent",
    initialState: INITIAL_STATE,
  });

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const applyFilters = (partial: Partial<FilterState>) => {
    const merged = normalizeFilters({
      ...filters,
      ...partial,
      priceRange: sanitizePriceRange({
        ...filters.priceRange,
        ...(partial.priceRange ?? {}),
      }),
    });
    setFilters(merged);
    setAgentState({ filters: merged });
  };

  useEffect(() => {
    if (!agentState?.filters) return;
    const normalized = normalizeFilters(agentState.filters);
    if (JSON.stringify(normalized) !== JSON.stringify(filters)) {
      setFilters(normalized);
    }
  }, [agentState]);

  useCopilotAction({
    name: "apply_filters",
    description:
      "Apply catalog filters. Provide any subset of category, colors, sizes, minPrice, maxPrice.",
    parameters: [
      {
        name: "category",
        type: "string",
        description: `Category to filter (${categoryOptions.join(", ")}). Use "all" to clear.`,
      },
      {
        name: "colors",
        type: "string[]",
        description: `Colors to include (${colorOptions.join(", ")}).`,
      },
      {
        name: "sizes",
        type: "string[]",
        description: `Sizes to include (${sizeOptions.join(", ")}).`,
      },
      { name: "minPrice", type: "number", description: "Minimum price in USD." },
      { name: "maxPrice", type: "number", description: "Maximum price in USD." },
    ],
    handler: async ({ category, colors, sizes, minPrice, maxPrice }) => {
      const nextCategory =
        category && categoryOptions.includes(category as FilterState["category"])
          ? (category as FilterState["category"])
          : filters.category;
      applyFilters({
        category: nextCategory,
        colors: colors ?? filters.colors,
        sizes: sizes ?? filters.sizes,
        priceRange: {
          min: minPrice ?? filters.priceRange.min,
          max: maxPrice ?? filters.priceRange.max,
        },
      });
    },
  });

  useCopilotAction({
    name: "clear_filters",
    description: "Clear all catalog filters.",
    parameters: [],
    handler: async () => {
      applyFilters(INITIAL_FILTERS);
    },
  });

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      if (filters.category !== "all" && product.category !== filters.category) return false;
      if (filters.colors.length > 0 && !filters.colors.some((color) => product.colors.includes(color)))
        return false;
      if (filters.sizes.length > 0 && !filters.sizes.some((size) => product.sizes.includes(size)))
        return false;
      if (product.priceUsd < filters.priceRange.min || product.priceUsd > filters.priceRange.max)
        return false;
      return true;
    });
  }, [filters]);

  const toggleColor = (color: string) => {
    const next = filters.colors.includes(color)
      ? filters.colors.filter((item) => item !== color)
      : [...filters.colors, color];
    applyFilters({ colors: next });
  };

  const toggleSize = (size: string) => {
    const next = filters.sizes.includes(size)
      ? filters.sizes.filter((item) => item !== size)
      : [...filters.sizes, size];
    applyFilters({ sizes: next });
  };

  return (
    <div className="catalog">
      <header className="catalog-header">
        <div>
          <h1>Slopyfy Shop</h1>
          <p>Browse essentials and let the agent filter for you.</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => applyFilters(INITIAL_FILTERS)}
        >
          Clear filters
        </button>
      </header>

      <section className="filters">
        <div className="filter-card">
          <h2>Category</h2>
          <div className="chip-group">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                className={category === filters.category ? "chip chip-active" : "chip"}
                onClick={() => applyFilters({ category })}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-card">
          <h2>Colors</h2>
          <div className="checkbox-group">
            {colorOptions.map((color) => (
              <label key={color} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.colors.includes(color)}
                  onChange={() => toggleColor(color)}
                />
                <span>{color}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-card">
          <h2>Sizes</h2>
          <div className="checkbox-group">
            {sizeOptions.map((size) => (
              <label key={size} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.sizes.includes(size)}
                  onChange={() => toggleSize(size)}
                />
                <span>{size}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-card">
          <h2>Price (USD)</h2>
          <div className="price-row">
            <label>
              Min
              <input
                type="number"
                min={0}
                max={maxPrice}
                value={filters.priceRange.min}
                onChange={(event) =>
                  applyFilters({
                    priceRange: {
                      ...filters.priceRange,
                      min: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label>
              Max
              <input
                type="number"
                min={0}
                max={maxPrice}
                value={filters.priceRange.max}
                onChange={(event) =>
                  applyFilters({
                    priceRange: {
                      ...filters.priceRange,
                      max: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </div>
      </section>

      <section className="results">
        <div className="results-header">
          <h2>
            Results <span>({filteredProducts.length})</span>
          </h2>
          <div className="active-filters">
            <span>{filters.category === "all" ? "All categories" : filters.category}</span>
            <span>{filters.colors.length ? filters.colors.join(", ") : "Any color"}</span>
            <span>{filters.sizes.length ? filters.sizes.join(", ") : "Any size"}</span>
            <span>
              ${filters.priceRange.min} - ${filters.priceRange.max}
            </span>
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-meta">
                <span className="pill">{product.category}</span>
                <span className="price">${product.priceUsd}</span>
              </div>
              <h3>{product.name}</h3>
              <p className="description">{product.description}</p>
              <div className="detail-row">
                <span>Colors:</span>
                <span>{product.colors.join(", ")}</span>
              </div>
              <div className="detail-row">
                <span>Sizes:</span>
                <span>{product.sizes.join(", ")}</span>
              </div>
              <div className="detail-row">
                <span>Inventory:</span>
                <span>{product.inventory}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
