"use client";

import { useEffect, useRef, useState } from "react";
import { catalogProducts } from "../../lib/catalog";
import { filterProducts } from "../../lib/live-filtering/filterProducts";
import { parseLiveFilters } from "../../lib/live-filtering/parseLiveFilters";
import type { LiveFiltersResult } from "../../lib/live-filtering/types";

const INPUT_DEBOUNCE_MS = 140;
const FALLBACK_DEBOUNCE_MS = 180;

export function LiveFilteringDemo() {
  const [transcript, setTranscript] = useState("");
  const [resolved, setResolved] = useState<LiveFiltersResult>(() => parseLiveFilters(""));
  const [useCerebrasFallback, setUseCerebrasFallback] = useState(false);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const parseTimer = window.setTimeout(() => {
      const deterministic = parseLiveFilters(transcript);
      setResolved(deterministic);
      setFallbackError(null);

      if (activeRequest.current) {
        activeRequest.current.abort();
        activeRequest.current = null;
      }

      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      if (!useCerebrasFallback) {
        setIsFallbackLoading(false);
        return;
      }

      const controller = new AbortController();
      fallbackTimerRef.current = window.setTimeout(async () => {
        activeRequest.current = controller;
        setIsFallbackLoading(true);

        try {
          const response = await fetch("/api/live-filtering/interpret", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ transcript }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(payload?.error ?? `Request failed with ${response.status}`);
          }

          const payload = (await response.json()) as LiveFiltersResult;
          setResolved(payload);
        } catch (error) {
          if ((error as Error).name === "AbortError") {
            return;
          }

          setFallbackError((error as Error).message);
        } finally {
          if (!controller.signal.aborted) {
            setIsFallbackLoading(false);
          }
          if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
        }
      }, FALLBACK_DEBOUNCE_MS);
    }, INPUT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(parseTimer);
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (activeRequest.current) {
        activeRequest.current.abort();
        activeRequest.current = null;
      }
      setIsFallbackLoading(false);
    };
  }, [transcript, useCerebrasFallback]);

  const filteredProducts = filterProducts(catalogProducts, resolved.filters);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(247,233,203,0.8),_rgba(255,255,255,0.95)_40%,_rgba(220,234,255,0.88))] px-6 py-10 text-stone-900">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_70px_rgba(41,37,36,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Low-Latency Prototype
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">
            Typed streaming product filtering
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            This route is isolated from the root page. Deterministic parsing runs
            first, with an optional Cerebras fallback only when no useful filter
            is detected.
          </p>

          <label className="mt-6 block text-sm font-medium text-stone-700" htmlFor="transcript">
            Try: <span className="font-normal text-stone-500">tshirt under 20 GBP for men size medium</span>
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Type a shopping request..."
            className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
          />

          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={useCerebrasFallback}
              onChange={(event) => setUseCerebrasFallback(event.target.checked)}
              className="h-4 w-4 rounded border-stone-400 text-stone-900"
            />
            <span>
              Use Cerebras for interpretation instead of local-only filtering
            </span>
          </label>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Transcript
              </p>
              <p className="mt-2 min-h-12 text-sm text-stone-800">
                {resolved.filters.rawTranscript || "..."}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Active Source
              </p>
              <p className="mt-2 text-sm font-medium text-stone-900">
                {resolved.source === "cerebras" ? "Cerebras fallback" : "Deterministic parser"}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {!useCerebrasFallback
                  ? "Fallback is disabled"
                  : isFallbackLoading
                    ? "Fallback request in flight"
                    : "No fallback request running"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Parsed Filters
            </p>
            <pre className="mt-2 overflow-x-auto text-xs leading-5 text-stone-700">
              {JSON.stringify(resolved.filters, null, 2)}
            </pre>
          </div>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Raw Cerebras Response
            </p>
            <pre className="mt-2 overflow-x-auto text-xs leading-5 text-stone-700">
              {resolved.rawResponse || "No Cerebras response yet"}
            </pre>
          </div>

          {fallbackError ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {fallbackError}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_70px_rgba(41,37,36,0.08)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Catalog
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                {filteredProducts.length} matches
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              {catalogProducts.length} cached items
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border-4 border-stone-900 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-stone-900 text-[11px] uppercase tracking-[0.16em] text-white">
                  <tr>
                    <th className="border-b-4 border-r-4 border-stone-900 px-4 py-3 font-semibold">Product</th>
                    <th className="border-b-4 border-r-4 border-stone-900 px-4 py-3 font-semibold">Category</th>
                    <th className="border-b-4 border-r-4 border-stone-900 px-4 py-3 font-semibold">Price</th>
                    <th className="border-b-4 border-r-4 border-stone-900 px-4 py-3 font-semibold">Gender</th>
                    <th className="border-b-4 border-r-4 border-stone-900 px-4 py-3 font-semibold">Sizes</th>
                    <th className="border-b-4 border-stone-900 px-4 py-3 font-semibold">Colors</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className={`align-top text-stone-800 transition hover:bg-amber-100 ${
                        index % 2 === 0 ? "bg-white" : "bg-stone-100"
                      }`}
                    >
                      <td className="border-b-4 border-r-4 border-stone-900 px-4 py-3">
                        <div>
                          <p className="font-medium text-stone-950">{product.name}</p>
                          <p className="mt-1 text-xs text-stone-500">{product.subcategory}</p>
                        </div>
                      </td>
                      <td className="border-b-4 border-r-4 border-stone-900 px-4 py-3 text-stone-900">
                        {product.category}
                      </td>
                      <td className="border-b-4 border-r-4 border-stone-900 px-4 py-3 font-semibold text-stone-950">
                        {product.currency} {product.price}
                      </td>
                      <td className="border-b-4 border-r-4 border-stone-900 px-4 py-3 text-stone-900">
                        {product.gender}
                      </td>
                      <td className="border-b-4 border-r-4 border-stone-900 px-4 py-3 text-xs text-stone-700">
                        {product.availableSizes.join(", ")}
                      </td>
                      <td className="border-b-4 border-stone-900 px-4 py-3 text-xs text-stone-700">
                        {product.colors.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
