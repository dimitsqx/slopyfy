import { NextRequest, NextResponse } from 'next/server';

const AGENT_URL = process.env.AGENT_URL ?? 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const response = await fetch(`${AGENT_URL}/mcp-apps/resources/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  return NextResponse.json(payload);
}
