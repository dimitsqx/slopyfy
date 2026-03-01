"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import "./style.css";
import { PRODUCTS, Product } from "./data";
import { useRouter } from "next/navigation";

type PriceRange = {
  min: number;
  max: number;
};

type AgeGroup = "kids" | "adults";

type FilterState = {
  ageGroup: AgeGroup | "all";
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
  ageGroup: "all",
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
const ageGroupOptions: AgeGroup[] = ["kids", "adults"];
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
  ageGroup: (next.ageGroup ?? INITIAL_FILTERS.ageGroup) as FilterState["ageGroup"],
  category: (next.category ?? INITIAL_FILTERS.category) as FilterState["category"],
  colors: Array.isArray(next.colors) ? next.colors : [],
  sizes: Array.isArray(next.sizes) ? next.sizes : [],
  priceRange: sanitizePriceRange(next.priceRange ?? INITIAL_FILTERS.priceRange),
});

export default function ShoppingClient() {
  return <ShoppingPage initialAgeGroup="all" />;
}

export function ShoppingPage({ initialAgeGroup }: { initialAgeGroup: FilterState["ageGroup"] }) {
  return (
    <ShoppingShell>
      <ShoppingApp initialAgeGroup={initialAgeGroup} />
    </ShoppingShell>
  );
}

export function HomePage() {
  const router = useRouter();
  return (
    <ShoppingShell>
      <div className="home-hero">
        <h1>Hello 👋</h1>
        <p>Ask the assistant to show kids or adults items.</p>
        <div className="home-actions">
          <button type="button" className="secondary-button" onClick={() => router.push("/kids")}>
            Browse kids
          </button>
          <button type="button" className="secondary-button" onClick={() => router.push("/adults")}>
            Browse adults
          </button>
        </div>
      </div>
    </ShoppingShell>
  );
}

function ShoppingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <div>{children}</div>
      <div className="chat-shell">
        <ChatPanel />
      </div>
    </div>
  );
}

function ShoppingApp({ initialAgeGroup }: { initialAgeGroup: FilterState["ageGroup"] }) {
  const router = useRouter();
  const { state: agentState, setState: setAgentState } = useCoAgent<ShoppingAgentState>({
    name: "strands_agent",
    initialState: {
      ...INITIAL_STATE,
      filters: {
        ...INITIAL_FILTERS,
        ageGroup: initialAgeGroup,
      },
    },
  });

  const [filters, setFilters] = useState<FilterState>({
    ...INITIAL_FILTERS,
    ageGroup: initialAgeGroup,
  });

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
      "Apply catalog filters. Provide only the fields you want to change. Omit others.",
    parameters: [
      {
        name: "category",
        type: "string",
        description: `Category to filter (${categoryOptions.join(", ")}). Use "all" to clear.`,
      },
      {
        name: "colors",
        type: "string[]",
        description: `Colors to include (${colorOptions.join(", ")}). Omit to leave unchanged.`,
      },
      {
        name: "sizes",
        type: "string[]",
        description: `Sizes to include (${sizeOptions.join(", ")}). Omit to leave unchanged.`,
      },
      { name: "minPrice", type: "number", description: "Minimum price in USD." },
      { name: "maxPrice", type: "number", description: "Maximum price in USD." },
    ],
    handler: async ({ category, colors, sizes, minPrice, maxPrice }) => {
      const nextCategory =
        category && categoryOptions.includes(category as FilterState["category"])
          ? (category as FilterState["category"])
          : filters.category;
      const isAllColors =
        Array.isArray(colors) &&
        colors.length === colorOptions.length &&
        colorOptions.every((color) => colors.includes(color));
      const isAllSizes =
        Array.isArray(sizes) &&
        sizes.length === sizeOptions.length &&
        sizeOptions.every((size) => sizes.includes(size));
      const nextColors =
        Array.isArray(colors) && colors.length > 0 && !isAllColors ? colors : filters.colors;
      const nextSizes =
        Array.isArray(sizes) && sizes.length > 0 && !isAllSizes ? sizes : filters.sizes;
      applyFilters({
        category: nextCategory,
        colors: nextColors,
        sizes: nextSizes,
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
      if (filters.ageGroup !== "all" && product.ageGroup !== filters.ageGroup) return false;
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
      <section className="age-group">
        <h2>Shop by age</h2>
        <div className="chip-group">
          {ageGroupOptions.map((group) => (
            <button
              key={group}
              type="button"
              className={filters.ageGroup === group ? "chip chip-active" : "chip"}
              onClick={() => {
                const nextRoute = group === "kids" ? "/kids" : "/adults";
                applyFilters({ ageGroup: group });
                router.push(nextRoute);
              }}
            >
              {group}
            </button>
          ))}
        </div>
      </section>
      <header className="catalog-header">
        <div>
          <h1>Slopyfy Shop</h1>
          <p>Browse essentials and let the agent filter for you.</p>
        </div>
        <button
          className="secondary-button clear-filters-button"
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
          <span className="results-count">Showing {filteredProducts.length} of {PRODUCTS.length}</span>
          <div className="active-filters">
            <span>{filters.category === "all" ? "All categories" : filters.category}</span>
            <span>{filters.colors.length ? filters.colors.join(", ") : "Any color"}</span>
            <span>{filters.sizes.length ? filters.sizes.join(", ") : "Any size"}</span>
            <span>
              ${filters.priceRange.min} - ${filters.priceRange.max}
            </span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>No products match these filters.</p>
            <button
              className="secondary-button clear-filters-button"
              type="button"
              onClick={() => applyFilters(INITIAL_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ChatPanel() {
  const router = useRouter();

  useCopilotAction({
    name: "go_to_age_group",
    description: "Navigate to the kids or adults shopping page.",
    parameters: [
      {
        name: "ageGroup",
        type: "string",
        description: "The target age group route: kids or adults.",
      },
    ],
    handler: async ({ ageGroup }) => {
      const target = ageGroup === "kids" ? "/kids" : ageGroup === "adults" ? "/adults" : null;
      if (!target) return;
      router.push(target);
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (window.location.pathname !== target) {
            window.location.assign(target);
          }
        }, 0);
      }
    },
  });

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div>
          <h2>Shop Assistant</h2>
          <p>Ask me to filter the catalog.</p>
        </div>
      </div>
      <CopilotChat
        className="chat-panel-body"
        labels={{ initial: "Tell me how to filter the catalog." }}
      />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <div className="product-image-placeholder">Image</div>
      <div className="product-meta">
        <span className="pill">{product.category}</span>
        <span className="price">${product.priceUsd}</span>
      </div>
      <h3>{product.name}</h3>
      <p className="description">{product.productDescription}</p>
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
  );
}
