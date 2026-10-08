export interface EmbeddingResult { model: string; dimensions: number; values: number[] }
export interface EmbeddingProvider { embed(text: string): Promise<EmbeddingResult> }

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}
  async embed(text: string): Promise<EmbeddingResult> {
    const model = this.model.replace(/^models\//, "");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":embedContent", {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({ model: "models/" + model, content: { parts: [{ text }] } }), signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Embedding provider returned HTTP " + response.status + ".");
    const payload = await response.json() as { embedding?: { values?: unknown } };
    const values = payload.embedding?.values;
    if (!Array.isArray(values) || !values.length || !values.every((value) => typeof value === "number" && Number.isFinite(value))) throw new Error("Embedding provider returned an invalid vector.");
    return { model, dimensions: values.length, values: values as number[] };
  }
}

export function getEmbeddingProvider(): EmbeddingProvider | null {
  if (process.env.EMBEDDING_PROVIDER !== "gemini" || !process.env.GEMINI_API_KEY || !process.env.EMBEDDING_MODEL) return null;
  return new GeminiEmbeddingProvider(process.env.GEMINI_API_KEY, process.env.EMBEDDING_MODEL);
}
