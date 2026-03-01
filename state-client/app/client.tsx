"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat, type InputProps } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import "./style.css";
import { PRODUCTS, Product } from "./data";
import HomeView from "./components/HomeView";

type ViewState = "home" | Product["ageGroup"];

type PriceRange = {
  min: number;
  max: number;
};

type FilterState = {
  categories: Product["category"][];
  colors: string[];
  sizes: string[];
  priceRange: PriceRange;
};

type ShoppingAgentState = {
  view: ViewState;
  filters: FilterState;
};

type TranscriptionResponse = {
  text: string;
};

const uniqueValues = <T extends string>(values: T[]) => Array.from(new Set(values)).sort();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sanitizePriceRange = (range: Partial<PriceRange>, maxPrice: number): PriceRange => {
  let min = Number.isFinite(range.min) ? Number(range.min) : 0;
  let max = Number.isFinite(range.max) ? Number(range.max) : maxPrice;
  min = clamp(min, 0, maxPrice);
  max = clamp(max, 0, maxPrice);
  if (min > max) {
    [min, max] = [max, min];
  }
  return { min, max };
};

const buildFilterOptions = (products: Product[]) => {
  const maxPrice = products.length
    ? Math.max(...products.map((product) => product.priceUsd))
    : 0;
  const categoryOptions = uniqueValues(
    products.map((product) => product.category) as Product["category"][]
  );
  const colorOptions = uniqueValues(products.flatMap((product) => product.colors));
  const sizeOptions = uniqueValues(products.flatMap((product) => product.sizes));
  return { maxPrice, categoryOptions, colorOptions, sizeOptions };
};

const createInitialFilters = (maxPrice: number): FilterState => ({
  categories: [],
  colors: [],
  sizes: [],
  priceRange: { min: 0, max: maxPrice },
});

const normalizeFilters = (
  next: Partial<FilterState> & {
    category?: Product["category"] | "all";
    categories?: Product["category"][];
  },
  maxPrice: number
): FilterState => {
  const categories = Array.isArray(next.categories)
    ? next.categories
    : typeof next.category === "string" && next.category !== "all"
      ? [next.category as Product["category"]]
      : [];
  return {
    categories,
    colors: Array.isArray(next.colors) ? next.colors : [],
    sizes: Array.isArray(next.sizes) ? next.sizes : [],
    priceRange: sanitizePriceRange(next.priceRange ?? { min: 0, max: maxPrice }, maxPrice),
  };
};

const getProductsForView = (view: ViewState) => {
  if (view === "home") return PRODUCTS;
  return PRODUCTS.filter((product) => product.ageGroup === view);
};

const getFilterOptionsForView = (view: ViewState) => buildFilterOptions(getProductsForView(view));

const filterProducts = (products: Product[], filters: FilterState) =>
  products.filter((product) => {
    if (filters.categories.length > 0 && !filters.categories.includes(product.category)) {
      return false;
    }
    if (filters.colors.length > 0 && !filters.colors.some((color) => product.colors.includes(color)))
      return false;
    if (filters.sizes.length > 0 && !filters.sizes.some((size) => product.sizes.includes(size)))
      return false;
    if (product.priceUsd < filters.priceRange.min || product.priceUsd > filters.priceRange.max)
      return false;
    return true;
  });

const INITIAL_STATE: ShoppingAgentState = {
  view: "home",
  filters: createInitialFilters(
    PRODUCTS.length ? Math.max(...PRODUCTS.map((product) => product.priceUsd)) : 0
  ),
};

export default function ShoppingClient() {
  return (
    <div className="app-shell">
      <ShoppingApp />
      <div className="chat-shell">
        <ChatPanel />
      </div>
    </div>
  );
}

function ShoppingApp() {
  const { state: agentState, setState: setAgentState } = useCoAgent<ShoppingAgentState>({
    name: "strands_agent",
    initialState: INITIAL_STATE,
  });

  const [view, setView] = useState<ViewState>(agentState?.view ?? "home");
  const viewRef = useRef<ViewState>(agentState?.view ?? "home");

  const applyView = (nextView: ViewState) => {
    const nextProducts = getProductsForView(nextView);
    const { maxPrice: nextMaxPrice } = buildFilterOptions(nextProducts);
    const nextFilters = createInitialFilters(nextMaxPrice);
    viewRef.current = nextView;
    setView(nextView);
    setAgentState({ view: nextView, filters: nextFilters });
  };

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (!agentState) return;
    if (agentState.view && agentState.view !== view) {
      viewRef.current = agentState.view;
      setView(agentState.view);
      return;
    }
  }, [agentState, view]);

  useCopilotAction({
    name: "go_to_age_group",
    description: "Navigate to the kids or adults catalog view.",
    parameters: [
      {
        name: "ageGroup",
        type: "string",
        description: 'Age group to browse ("kids" or "adults").',
      },
    ],
    handler: async ({ ageGroup }) => {
      if (ageGroup === "kids" || ageGroup === "adults") {
        applyView(ageGroup);
        const { maxPrice, categoryOptions, colorOptions, sizeOptions } =
          getFilterOptionsForView(ageGroup);
        return {
          view: ageGroup,
          categoryOptions,
          colorOptions,
          sizeOptions,
          priceRange: { min: 0, max: maxPrice },
        };
      }
      return null;
    },
  });

  useCopilotAction({
    name: "go_home",
    description: "Navigate back to the home view.",
    parameters: [],
    handler: async () => {
      applyView("home");
    },
  });

  return (
    <div className="catalog">
      <header className="catalog-header">
        <div>
          <h1>{view === "home" ? "Slopyfy Shop" : `${view === "kids" ? "Kids" : "Adults"} Shop`}</h1>
          <p>
            {view === "home"
              ? "Start at home and pick a collection."
              : "Browse essentials and let the agent filter for you."}
          </p>
        </div>
      </header>

      {view === "home" ? (
        <HomeView onSelectAgeGroup={(ageGroup) => applyView(ageGroup)} />
      ) : (
        <ProductView
          view={view}
          agentState={agentState}
          setAgentState={setAgentState}
          onGoHome={() => applyView("home")}
        />
      )}
    </div>
  );
}

function ProductView({
  view,
  agentState,
  setAgentState,
  onGoHome,
}: {
  view: Exclude<ViewState, "home">;
  agentState: ShoppingAgentState | undefined;
  setAgentState: (state: ShoppingAgentState) => void;
  onGoHome: () => void;
}) {
  const baseProducts = getProductsForView(view);
  const { maxPrice, categoryOptions, colorOptions, sizeOptions } = buildFilterOptions(baseProducts);
  const [filters, setFilters] = useState<FilterState>(createInitialFilters(maxPrice));

  useEffect(() => {
    const nextFilters = agentState?.filters
      ? normalizeFilters(agentState.filters, maxPrice)
      : createInitialFilters(maxPrice);
    setFilters((current) =>
      JSON.stringify(current) === JSON.stringify(nextFilters) ? current : nextFilters
    );
  }, [agentState?.filters, maxPrice]);

  const applyFilters = (partial: Partial<FilterState>) => {
    const merged = normalizeFilters(
      {
        ...filters,
        ...partial,
        priceRange: {
          ...filters.priceRange,
          ...(partial.priceRange ?? {}),
        },
      },
      maxPrice
    );
    setFilters(merged);
    setAgentState({ view, filters: merged });
  };

  useCopilotAction({
    name: "apply_filters",
    description:
      "Apply catalog filters. Provide only the fields you want to change. Omit others.",
    parameters: [
      {
        name: "category",
        type: "string",
        description: `Single category (${categoryOptions.join(", ")}). Use "all" to clear.`,
      },
      {
        name: "categories",
        type: "string[]",
        description: `Categories to include (${categoryOptions.join(", ")}). Use ["all"] to clear.`,
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
    handler: async ({ category, categories, colors, sizes, minPrice, maxPrice }) => {
      const categoryLookup = new Map(
        categoryOptions.map((option) => [option.toLowerCase(), option])
      );
      const normalizedCategory =
        typeof category === "string" ? category.toLowerCase() : undefined;
      const resolvedCategory =
        normalizedCategory && categoryLookup.has(normalizedCategory)
          ? categoryLookup.get(normalizedCategory)
          : undefined;
      const normalizedCategories = Array.isArray(categories)
        ? categories
            .map((value) => (typeof value === "string" ? value.toLowerCase() : ""))
            .filter(Boolean)
        : [];
      const hasClearAll = normalizedCategories.includes("all");
      const resolvedCategories = hasClearAll
        ? []
        : normalizedCategories
            .map((value) => categoryLookup.get(value))
            .filter((value): value is Product["category"] => Boolean(value));
      const nextCategories =
        resolvedCategories.length > 0
          ? resolvedCategories
          : resolvedCategory
            ? [resolvedCategory]
            : filters.categories;
      const colorLookup = new Map(colorOptions.map((option) => [option.toLowerCase(), option]));
      const normalizedColors = Array.isArray(colors)
        ? colors
            .map((color) => (typeof color === "string" ? color.toLowerCase() : ""))
            .filter(Boolean)
            .map((color) => colorLookup.get(color))
            .filter((color): color is string => Boolean(color))
        : [];
      const sizeLookup = new Map(sizeOptions.map((option) => [option.toLowerCase(), option]));
      const normalizedSizes = Array.isArray(sizes)
        ? sizes
            .map((size) => (typeof size === "string" ? size.toLowerCase() : ""))
            .filter(Boolean)
            .map((size) => sizeLookup.get(size))
            .filter((size): size is string => Boolean(size))
        : [];
      const isAllColors =
        normalizedColors.length > 0 &&
        normalizedColors.length === colorOptions.length &&
        colorOptions.every((color) => normalizedColors.includes(color));
      const isAllSizes =
        normalizedSizes.length > 0 &&
        normalizedSizes.length === sizeOptions.length &&
        sizeOptions.every((size) => normalizedSizes.includes(size));
      const nextColors =
        normalizedColors.length > 0 && !isAllColors ? normalizedColors : filters.colors;
      const nextSizes =
        normalizedSizes.length > 0 && !isAllSizes ? normalizedSizes : filters.sizes;
      applyFilters({
        categories: nextCategories,
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
    name: "get_active_filters",
    description: "Return the current view and active filters.",
    parameters: [],
    handler: async () => ({ view, filters }),
  });

  useCopilotAction({
    name: "get_filter_options",
    description: "Return the available filter options for the current view.",
    parameters: [],
    handler: async () => ({
      view,
      categoryOptions,
      colorOptions,
      sizeOptions,
      priceRange: { min: 0, max: maxPrice },
    }),
  });

  useCopilotAction({
    name: "clear_filters",
    description: "Clear all catalog filters.",
    parameters: [],
    handler: async () => {
      applyFilters(createInitialFilters(maxPrice));
    },
  });

  const filteredProducts = filterProducts(baseProducts, filters);

  useCopilotAction({
    name: "get_filtered_products",
    description: "Return the currently visible products for this view.",
    parameters: [],
    handler: async () => ({
      view,
      total: filteredProducts.length,
      products: filteredProducts,
    }),
  });

  useCopilotAction({
    name: "get_product_details",
    description: "Return details for a visible product by id or name.",
    parameters: [
      {
        name: "id",
        type: "string",
        description: "Product id (preferred if known).",
      },
      {
        name: "name",
        type: "string",
        description: "Product name (case-insensitive).",
      },
    ],
    handler: async ({ id, name }) => {
      const normalizedName = typeof name === "string" ? name.toLowerCase() : "";
      const match = filteredProducts.find((product) => {
        if (id && product.id === id) return true;
        if (normalizedName && product.name.toLowerCase() === normalizedName) return true;
        return false;
      });
      return match ?? null;
    },
  });

  const setCategories = (next: Product["category"][]) => {
    applyFilters({ categories: next });
  };

  const setColors = (next: string[]) => {
    applyFilters({ colors: next });
  };

  const setSizes = (next: string[]) => {
    applyFilters({ sizes: next });
  };

  return (
    <>
      <div className="header-actions">
        <button className="secondary-button" type="button" onClick={onGoHome}>
          Home
        </button>
        <button
          className="secondary-button clear-filters-button"
          type="button"
          onClick={() => applyFilters(createInitialFilters(maxPrice))}
        >
          Clear filters
        </button>
      </div>

      <section className="filters">
        <MultiSelectDropdown
          label="Category"
          options={categoryOptions}
          selected={filters.categories}
          placeholder="All categories"
          onChange={setCategories}
        />

        <MultiSelectDropdown
          label="Colors"
          options={colorOptions}
          selected={filters.colors}
          placeholder="Any color"
          onChange={setColors}
        />

        <MultiSelectDropdown
          label="Sizes"
          options={sizeOptions}
          selected={filters.sizes}
          placeholder="Any size"
          onChange={setSizes}
        />

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
          <span className="results-count">Showing {filteredProducts.length} of {baseProducts.length}</span>
          <div className="active-filters">
            <span>
              {filters.categories.length > 0
                ? filters.categories.join(", ")
                : "All categories"}
            </span>
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
              onClick={() => applyFilters(createInitialFilters(maxPrice))}
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
    </>
  );
}

function MultiSelectDropdown<T extends string>({
  label,
  options,
  selected,
  placeholder,
  onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  placeholder: string;
  onChange: (next: T[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: T) => {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(next);
  };

  const clearAll = () => onChange([]);

  return (
    <div className="filter-card" ref={containerRef}>
      <h2>{label}</h2>
      <button
        className={`dropdown-trigger ${isOpen ? "dropdown-trigger-open" : ""}`}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="dropdown-trigger-content">
          {selected.length > 0 ? (
            selected.map((item) => (
              <span key={item} className="dropdown-chip">
                {item}
              </span>
            ))
          ) : (
            <span className="dropdown-placeholder">{placeholder}</span>
          )}
        </div>
        <span className="dropdown-caret" aria-hidden="true">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>
      {isOpen ? (
        <div className="dropdown-menu" role="listbox">
          <button type="button" className="dropdown-clear" onClick={clearAll}>
            Clear
          </button>
          <div className="dropdown-options">
            {options.map((option) => (
              <label key={option} className="dropdown-option">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div>
          <h2>Shop Assistant</h2>
          <p>Pick kids or adults, then tell me how to refine the catalog.</p>
        </div>
      </div>
      <CopilotChat
        className="chat-panel-body"
        Input={ChatVoiceInput}
        labels={{
          initial: "Hi, how can I help you today?",
        }}
      />
    </div>
  );
}

function ChatVoiceInput({ inProgress, onSend, onStop }: InputProps) {
  const [text, setText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.onerror = null;
        mediaRecorderRef.current.stop();
      }
      releaseMediaStream(mediaStreamRef);
    };
  }, []);

  const isBusy = inProgress || isTranscribing;
  const canStopGeneration = inProgress && typeof onStop === "function";

  const sendText = async () => {
    const nextText = text.trim();
    if (!nextText || isBusy || isRecording) {
      return;
    }

    setVoiceError(null);
    await onSend(nextText);
    setText("");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = async () => {
    if (isTranscribing || inProgress) {
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Microphone capture is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorderChunksRef.current = [];
      setVoiceError(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        recorder.onstop = null;
        setVoiceError("Voice recording failed.");
        setIsRecording(false);
        mediaRecorderRef.current = null;
        if (recorder.state === "recording") {
          recorder.stop();
        }
        releaseMediaStream(mediaStreamRef);
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(recorderChunksRef.current, { type: blobType });
        recorderChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);
        releaseMediaStream(mediaStreamRef);

        void transcribeAndSend(blob, onSend, setIsTranscribing, setVoiceError);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setVoiceError((error as Error).message);
      setIsRecording(false);
      releaseMediaStream(mediaStreamRef);
    }
  };

  return (
    <div className="voice-input-shell">
      {voiceError ? <p className="voice-input-error">{voiceError}</p> : null}
      <div className="voice-input-row">
        <textarea
          className="voice-input-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !isComposing) {
              event.preventDefault();
              void sendText();
            }
          }}
          placeholder="Type or record a request..."
          disabled={isBusy || isRecording}
          rows={3}
        />
        <div className="voice-input-actions">
          <button
            type="button"
            className={`voice-input-button ${isRecording ? "voice-input-button-recording" : ""}`}
            onClick={() => void toggleRecording()}
            disabled={isTranscribing || inProgress}
          >
            {isRecording ? "Stop" : "Mic"}
          </button>
          <button
            type="button"
            className="voice-input-button"
            onClick={canStopGeneration ? onStop : () => void sendText()}
            disabled={isRecording || isTranscribing || (!canStopGeneration && text.trim().length === 0)}
          >
            {canStopGeneration ? "Stop" : "Send"}
          </button>
        </div>
      </div>
      <p className="voice-input-status">
        {isRecording
          ? "Recording voice input..."
          : isTranscribing
            ? "Transcribing voice input..."
            : "Record once to send a transcribed message."}
      </p>
    </div>
  );
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }

  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }

  return "";
}

function releaseMediaStream(mediaStreamRef: { current: MediaStream | null }) {
  if (!mediaStreamRef.current) {
    return;
  }

  mediaStreamRef.current.getTracks().forEach((track) => track.stop());
  mediaStreamRef.current = null;
}

async function transcribeAndSend(
  blob: Blob,
  onSend: InputProps["onSend"],
  setIsTranscribing: React.Dispatch<React.SetStateAction<boolean>>,
  setVoiceError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  if (blob.size === 0) {
    return;
  }

  const form = new FormData();
  form.append("file", new File([blob], "recording.webm", { type: blob.type || "audio/webm" }));

  setIsTranscribing(true);
  setVoiceError(null);

  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error ?? `Request failed with ${response.status}`);
    }

    const payload = (await response.json()) as TranscriptionResponse;
    const nextText = payload.text.trim();
    if (!nextText) {
      setVoiceError("No speech was detected.");
      return;
    }

    await onSend(nextText);
  } catch (error) {
    setVoiceError((error as Error).message);
  } finally {
    setIsTranscribing(false);
  }
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      {product.imageUrl ? (
        <img className="product-image" src={product.imageUrl} alt={product.name} />
      ) : (
        <div className="product-image-placeholder">Image</div>
      )}
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
