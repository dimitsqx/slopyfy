import { NextRequest, NextResponse } from "next/server";

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const prompt = form.get("prompt");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Audio file is required." },
      { status: 400 },
    );
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name || "audio.webm");
  outbound.append("model", GROQ_TRANSCRIBE_MODEL);
  outbound.append("language", "en");
  outbound.append("temperature", "0");
  outbound.append("response_format", "verbose_json");

  if (typeof prompt === "string" && prompt.trim()) {
    outbound.append("prompt", prompt.trim());
  }

  const response = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: outbound,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Groq transcription failed: ${errorText}` },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as {
    text?: string;
  };

  return NextResponse.json({
    text: payload.text ?? "",
    rawResponse: payload,
    model: GROQ_TRANSCRIBE_MODEL,
  });
}
