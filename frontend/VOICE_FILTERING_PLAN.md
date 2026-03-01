# Voice-Driven Chat Filtering Plan

This document captures the implementation plan for a low-latency voice-to-chat shopping flow where spoken intent progressively filters products in the UI.

## Goal

Enable users to speak shopping requests such as:

`I want a tshirt that is under 20 GBP and for men that is of size medium`

As the utterance arrives, the UI should react in a streaming manner:

- `tshirt` narrows the visible products to shirts/tshirts
- `under 20 GBP` applies a price cap
- `for men` applies a gender filter
- `size medium` applies a size filter

The transcript shown in the chat UI should reflect the words exactly as heard. The filtering logic should re-run on every partial update and become more accurate as more context arrives.

## Product Decision

The correct implementation order is:

1. Build streaming filtering from typed text first.
2. Make parsing incremental and stable.
3. Reuse the same pipeline for live voice transcription.

This reduces risk because the core problem is not speech recognition. The core problem is incremental intent parsing tied to reactive product filtering.

## Core Principles

- Prioritize low latency over perfect first-token accuracy.
- Allow early guesses to be wrong and later words to correct them.
- Keep filtering local on the client for the MVP.
- Use strict, structured filters first; use LLM reasoning only as a fallback when needed.
- Preserve the raw transcript exactly as heard for the visible chat text.

## Why Client-Side Filtering

For the MVP, all products should be fetched once and stored in client memory.

Benefits:

- Lowest possible latency for live updates
- No network round trip on each transcript change
- Simpler implementation while tuning the UX
- Easier to reason about transient partial matches

Constraint:

- The product catalog must be intentionally structured and consistently tagged so deterministic filtering works reliably.

If the catalog grows substantially later, we can move to hybrid search, but that should not be the first implementation.

## High-Level Architecture

The feature should be built as a single streaming pipeline:

1. Input source emits partial text.
2. A parser converts partial text into the best current filter state.
3. A client-side filter engine applies that state to the cached product list.
4. The UI re-renders the product grid immediately.
5. The chat input displays the latest transcript exactly as heard.

Two input sources will eventually share the same pipeline:

- typed input stream (MVP)
- microphone transcription stream (phase 2)

## Suggested Data Model

Use a single state object for the current query interpretation.

```ts
type LiveFilters = {
  rawTranscript: string;
  category?: string;
  subcategory?: string;
  maxPrice?: number;
  minPrice?: number;
  currency?: "GBP" | "USD" | "EUR";
  gender?: "men" | "women" | "unisex";
  size?: string;
  color?: string;
  sort?: "price_asc" | "price_desc" | "newest";
  confidence?: {
    category?: "tentative" | "stable";
    price?: "tentative" | "stable";
    gender?: "tentative" | "stable";
    size?: "tentative" | "stable";
  };
};
```

Notes:

- `rawTranscript` is the visible chat text and should not be normalized for display.
- Parsed filter fields may be normalized internally.
- Confidence is optional but useful to reduce UI flicker during partial word recognition.

## Parsing Strategy

Do not depend on an LLM for every partial transcript update.

Primary path:

- Use deterministic parsing for common shopping constraints.
- Re-parse the full current transcript on each partial update.
- Treat parsing as idempotent: each update recomputes the best current state.

Initial deterministic parsing should support:

- Categories: `tshirt`, `shirt`, `hoodie`, `pants`, `jeans`, `jacket`
- Price phrases: `under 20`, `less than 20`, `below 20`, `under 20 GBP`
- Gender phrases: `for men`, `mens`, `for women`, `womens`, `unisex`
- Size phrases: `small`, `medium`, `large`, `extra large`, `size m`
- Basic colors if useful later

Fallback path:

- If deterministic parsing cannot confidently map the transcript, send the latest transcript to an LLM that returns structured filters.
- The fallback should be asynchronous and non-blocking.
- The deterministic result should remain active until the LLM returns a better interpretation.

This avoids adding latency to the common path while still allowing broader language coverage later.

## Streaming Behavior

Filtering should happen on every partial update, but with guardrails.

Expected behavior:

- Early partials may produce tentative guesses.
- Later partials may overwrite prior guesses.
- The UI should feel responsive, not perfectly stable from the first syllable.

Recommended safeguards:

- Apply a small debounce window (`100-200ms`) before committing UI updates.
- Track tentative vs. stable matches internally.
- Avoid aggressive category switching on extremely short fragments.
- Recompute from the full transcript instead of mutating state incrementally token-by-token.

Recomputing from the full transcript keeps correction logic simple and prevents stale state from accumulating.

## Voice Transcription Strategy

The speech layer should plug into the same typed-stream pipeline.

Requirements:

- Near-real-time partial transcription
- Support for interim transcript updates, not only final transcript segments
- Low enough latency that the product grid visibly updates during speech

Potential provider direction:

- A fast hosted transcription model such as Groq-backed Whisper-style transcription can be evaluated
- `whisper-large-v3` is a candidate, but the key requirement is streaming responsiveness, not just final accuracy

Selection criteria:

- Partial transcript support
- End-to-end latency
- Stability of interim outputs
- Cost at expected usage
- Ease of browser or edge integration

The voice system should not own business logic. It should only produce transcript chunks for the same parser used by typed input.

## Implementation Phases

### Phase 1: Text Streaming MVP

Goal:

Prove the UX using typed input before adding microphone capture.

Tasks:

- Create a local product dataset in the frontend with strongly typed filterable fields
- Add a live text input bound to `rawTranscript`
- Re-parse the transcript on each input update
- Convert parsed output into `LiveFilters`
- Filter the in-memory product list on each update
- Render the filtered product list alongside the chat/sidebar UI

Exit criteria:

- Typing `tshirt under 20 GBP for men size medium` progressively narrows the list
- Updating or deleting text recalculates filters correctly

### Phase 2: Parser Hardening

Goal:

Make typed streaming feel stable enough to support voice.

Tasks:

- Add a deterministic parser module with isolated tests
- Normalize synonyms into canonical filter values
- Add confidence states for partial matches
- Add small debounce/smoothing to reduce jitter
- Define overwrite rules when later phrases supersede earlier interpretations

Exit criteria:

- Partial inputs can be noisy without causing unusable UI flicker
- Parsing remains deterministic for the core supported phrases

### Phase 3: Voice Input Integration

Goal:

Replace typed stream input with microphone-driven transcript updates.

Tasks:

- Add browser microphone capture
- Integrate a streaming transcription provider
- Feed interim transcript text into the existing parser pipeline
- Keep the visible transcript exactly as heard
- Handle transcript corrections when the ASR revises earlier words

Exit criteria:

- Speaking a supported request updates the product list while the user is still talking

### Phase 4: LLM Fallback and Recovery

Goal:

Handle messier phrasing without slowing down the core path.

Tasks:

- Add an optional LLM normalization layer that maps free text to the filter schema
- Use it only when the deterministic parser is incomplete or ambiguous
- Merge fallback results carefully so they do not cause jarring UI jumps

Exit criteria:

- Unsupported but understandable phrasing can still produce useful filters

## Suggested Frontend Modules

These modules should keep responsibilities separated:

- `catalog.ts`
  - static or fetched product dataset
- `types.ts`
  - product and `LiveFilters` types
- `parseLiveFilters.ts`
  - deterministic parser for partial transcripts
- `filterProducts.ts`
  - pure function that filters products from `LiveFilters`
- `useLiveShoppingQuery.ts`
  - stateful hook that owns transcript, debounce, parsing, and filtered results
- UI component(s)
  - transcript input/display
  - product list
  - optional debug panel for current parsed filters

## UX Notes

- The user should see the words exactly as heard in the chat area.
- The products should update continuously, even before the sentence is complete.
- Corrections are expected and acceptable as long as the system converges quickly.
- The UI should optimize for responsiveness, not perfect early precision.

For debugging, it is useful to temporarily show:

- raw transcript
- parsed filter state
- filtered item count

This will make parser tuning much easier.

## Risks

- Partial ASR output may oscillate and create visible filter jitter.
- Overly aggressive early matching may cause distracting product jumps.
- A loose product taxonomy will make “strict” filtering unreliable.
- LLM fallback used too early will increase latency and cost.

## Non-Goals for MVP

- Full natural-language understanding for arbitrary shopping requests
- Server-side search on every utterance update
- Personalized ranking
- Cart checkout by voice
- Multi-turn memory beyond the current live query

## First Build Checklist

- Create a small but clean client-side clothing catalog
- Define the `LiveFilters` type
- Build deterministic transcript parsing for category, price, gender, and size
- Re-filter products locally on each transcript update
- Render a basic UI that proves the progressive narrowing behavior

Once that works well with typed input, voice should be added by swapping the input source rather than redesigning the system.
