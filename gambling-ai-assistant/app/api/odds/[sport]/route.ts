const oddsApiBaseUrl = process.env.ODDS_API_URL ?? "http://127.0.0.1:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sport: string }> },
) {
  const { sport } = await params;

  try {
    const response = await fetch(`${oddsApiBaseUrl}/odds/${encodeURIComponent(sport)}`, {
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json(
      { detail: "Odds service is unavailable. Start the backend and ingest odds first." },
      { status: 503 },
    );
  }
}
