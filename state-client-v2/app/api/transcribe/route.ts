import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_TRANSCRIBE_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ELEVENLABS_TRANSCRIBE_MODEL = "scribe_v2";
const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const providerValue = form.get("provider");
  const provider =
    providerValue === "elevenlabs" || providerValue === "groq"
      ? providerValue
      : process.env.DEFAULT_STT_PROVIDER === "elevenlabs"
        ? "elevenlabs"
        : "groq";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Audio file is required." },
      { status: 400 },
    );
  }

  if (provider === "elevenlabs") {
    return transcribeWithElevenLabs(file);
  }

  return transcribeWithGroq(file);
}

async function transcribeWithGroq(file: File) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name || "recording.webm");
  outbound.append("model", GROQ_TRANSCRIBE_MODEL);
  outbound.append("language", "en");
  outbound.append("temperature", "0");
  outbound.append("response_format", "verbose_json");

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
    provider: "groq",
    text: payload.text ?? "",
    rawResponse: payload,
    model: GROQ_TRANSCRIBE_MODEL,
  });
}

async function transcribeWithElevenLabs(file: File) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name || "recording.webm");
  outbound.append("model_id", ELEVENLABS_TRANSCRIBE_MODEL);
  outbound.append("language_code", "eng");

  const response = await fetch(ELEVENLABS_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: outbound,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `ElevenLabs transcription failed: ${errorText}` },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as {
    text?: string;
  };

  return NextResponse.json({
    provider: "elevenlabs",
    text: payload.text ?? "",
    rawResponse: payload,
    model: ELEVENLABS_TRANSCRIBE_MODEL,
  });
}
