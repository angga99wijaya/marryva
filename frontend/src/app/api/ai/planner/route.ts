import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";

export const runtime = "nodejs";

const MAX_PROMPT_LENGTH = 2000;
const DEFAULT_MODEL = "gemini-2.5-flash";

function getProviderCode(providerError: unknown): string | undefined {
  if (!providerError || typeof providerError !== "object") return undefined;
  const error = (providerError as { error?: { status?: unknown; details?: unknown } }).error;
  if (typeof error?.status === "string" && /^[A-Z_]{1,60}$/.test(error.status)) {
    return error.status;
  }
  if (Array.isArray(error?.details)) {
    for (const detail of error.details) {
      if (!detail || typeof detail !== "object") continue;
      const reason = (detail as { reason?: unknown }).reason;
      if (typeof reason === "string" && /^[A-Z_]{1,60}$/.test(reason)) {
        return reason;
      }
    }
  }
  return undefined;
}

async function requestGemini(model: string, apiKey: string, contents: string): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: "Kamu adalah NikahKita AI Planner, asisten berbahasa Indonesia untuk perencanaan pernikahan di Indonesia. Berikan saran praktis, terstruktur, realistis, dan sensitif pada adat/budaya. Untuk biaya, nyatakan bahwa angka adalah estimasi dan sesuaikan dengan kota serta budget. Jangan mengaku melakukan pemesanan atau tindakan eksternal. Jika pertanyaan di luar pernikahan, arahkan dengan sopan kembali ke topik perencanaan pernikahan.",
          }],
        },
        contents: [{ role: "user", parts: [{ text: contents }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    },
  );
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = (body as Record<string, unknown>).prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.trim().length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt must contain 1-${MAX_PROMPT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("AI Planner is unavailable: GEMINI_API_KEY is not configured.");
    return NextResponse.json({ error: "AI Planner is not configured." }, { status: 503 });
  }

  const configuredModel = (
    process.env.GEMINI_GENERATION_MODEL?.trim()
    || process.env.GEMINI_MODEL?.trim()
    || DEFAULT_MODEL
  ).replace(/^models\//, "");
  const weddingContext = [
    `Nama pengguna: ${user.name.slice(0, 160)}`,
    `Kota: ${user.city.slice(0, 120) || "belum ditentukan"}`,
    `Tanggal pernikahan: ${user.wedding_date || "belum ditentukan"}`,
  ].join("\n");

  try {
    const contents = `Konteks pernikahan:\n${weddingContext}\n\nPertanyaan:\n${prompt.trim()}`;
    let response = await requestGemini(configuredModel, apiKey, contents);
    if (response.status === 404 && configuredModel !== DEFAULT_MODEL) {
      response = await requestGemini(DEFAULT_MODEL, apiKey, contents);
    }

    if (response.status === 429) {
      return NextResponse.json({ error: "AI service is busy.", code: "quota_or_rate_limit" }, { status: 429 });
    }
    if (!response.ok) {
      let providerCode: string | undefined;
      try {
        providerCode = getProviderCode(await response.json());
      } catch {
        // Provider error bodies are optional; only status and safe codes are used for diagnostics.
      }

      const code = providerCode === "API_KEY_INVALID" || response.status === 401
        ? "invalid_api_key"
        : response.status === 403
          ? "api_key_forbidden"
          : response.status === 404
            ? "model_not_found"
            : response.status === 400
              ? "invalid_request"
              : response.status >= 500
                ? "provider_unavailable"
              : "provider_error";
      console.error("Gemini request failed.", { status: response.status, code });
      const status = code === "invalid_api_key" || code === "api_key_forbidden" ? 503 : 502;
      return NextResponse.json(
        { error: "AI Planner request failed.", code, providerStatus: response.status },
        { status },
      );
    }

    const result: unknown = await response.json();
    const candidates = (result as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> }).candidates;
    const answer = candidates?.[0]?.content?.parts
      ?.map((part) => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!answer) {
      console.error("Gemini returned no usable answer.");
      return NextResponse.json({ error: "AI Planner returned no answer.", code: "empty_response" }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Gemini request could not be completed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    const code = error instanceof Error && error.name === "TimeoutError" ? "provider_timeout" : "provider_unavailable";
    return NextResponse.json({ error: "AI Planner is temporarily unavailable.", code }, { status: 502 });
  }
}
