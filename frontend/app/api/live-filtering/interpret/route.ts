import { NextRequest, NextResponse } from "next/server";
import {
  createEmptyLiveFilters,
  type LiveFilters,
} from "../../../../lib/live-filtering/types";

const CEREBRAS_MODEL = "llama3.1-8b";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    category: {
      anyOf: [
        { type: "string", enum: ["tshirt", "shirt", "hoodie", "jacket", "pants", "jeans"] },
        { type: "null" },
      ],
    },
    maxPrice: {
      anyOf: [{ type: "number" }, { type: "null" }],
    },
    currency: {
      anyOf: [{ type: "string", enum: ["GBP", "USD", "EUR"] }, { type: "null" }],
    },
    gender: {
      anyOf: [{ type: "string", enum: ["men", "women", "unisex"] }, { type: "null" }],
    },
    size: {
      anyOf: [{ type: "string", enum: ["XS", "S", "M", "L", "XL"] }, { type: "null" }],
    },
    color: {
      anyOf: [
        { type: "string", enum: ["black", "white", "blue", "navy", "green", "red", "grey", "beige"] },
        { type: "null" },
      ],
    },
  },
  additionalProperties: false,
} as const;

function sanitizeFilters(rawTranscript: string, parsed: Partial<LiveFilters>): LiveFilters {
  const filters = createEmptyLiveFilters(rawTranscript);

  if (parsed.category) {
    filters.category = parsed.category;
    filters.confidence.category = "stable";
  }

  if (typeof parsed.maxPrice === "number") {
    filters.maxPrice = parsed.maxPrice;
    filters.confidence.price = "stable";
  }

  if (parsed.currency) {
    filters.currency = parsed.currency;
  }

  if (parsed.gender) {
    filters.gender = parsed.gender;
    filters.confidence.gender = "stable";
  }

  if (parsed.size) {
    filters.size = parsed.size;
    filters.confidence.size = "stable";
  }

  if (parsed.color) {
    filters.color = parsed.color;
  }

  return filters;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CEREBRAS_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const { transcript } = (await request.json()) as { transcript?: string };
  const rawTranscript = transcript?.trim() ?? "";

  if (!rawTranscript) {
    return NextResponse.json({
      filters: createEmptyLiveFilters(""),
      source: "cerebras",
      rawResponse: "",
    });
  }

  const completion = await fetch(CEREBRAS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CEREBRAS_MODEL,
      temperature: 0,
      max_completion_tokens: 96,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "live_filters",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Extract only explicit shopping filters from the user request. Return null for unsupported or missing fields. Do not return prose.",
        },
        {
          role: "user",
          content: rawTranscript,
        },
      ],
    }),
  });

  if (!completion.ok) {
    const errorText = await completion.text();
    return NextResponse.json(
      { error: `Cerebras request failed: ${errorText}` },
      { status: completion.status },
    );
  }

  const payload = (await completion.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json(
      { error: "Cerebras returned an empty response." },
      { status: 502 },
    );
  }

  const parsed = JSON.parse(content) as Partial<LiveFilters>;

  return NextResponse.json({
    filters: sanitizeFilters(rawTranscript, parsed),
    source: "cerebras",
    rawResponse: content,
  });
}
