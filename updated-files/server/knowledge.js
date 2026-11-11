export function chunkText(text, size = 700) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\0/g, '').trim();
  const chunks = [];
  for (let start = 0; start < clean.length; start += size - 100) { chunks.push(clean.slice(start, start + size)); if (start + size >= clean.length) break; }
  return chunks;
}
export function localEmbedding(text) {
  // Explicit lexical fallback, NOT a learned multilingual semantic model.
  const vector = Array(256).fill(0);
  for (const word of text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []) {
    let hash = 2166136261; for (const char of word) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
    vector[(hash >>> 0) % vector.length]++;
  }
  const length = Math.hypot(...vector) || 1; return vector.map(x => x / length);
}
export function cosine(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return dot / (Math.sqrt(aa * bb) || 1);
}
export class EmbeddingProvider {
  constructor(config, providers, store) { Object.assign(this, { config, providers, store }); this.model = config.embeddingProvider === 'openai' ? config.embeddingModel : 'local-lexical-256-v1'; }
  async embed(texts, signal) {
    if (this.config.embeddingProvider === 'local') return texts.map(localEmbedding);
    this.store.reserveUsage(this.config);
    const response = await this.providers.request(`${this.config.openaiBase.replace(/\/$/, '')}/embeddings`, {
      method: 'POST', headers: { Authorization: `Bearer ${this.config.openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts }),
    }, signal);
    const data = await response.json(); this.store.recordUsage(data.usage?.total_tokens);
    const vectors = data.data?.sort((a, b) => a.index - b.index).map(item => item.embedding);
    if (!Array.isArray(vectors) || vectors.length !== texts.length || vectors.some(v => !Array.isArray(v) || !v.length || !v.every(Number.isFinite))) throw Object.assign(new Error('Invalid embedding response.'), { status: 502 });
    return vectors;
  }
  async retrieve(text, signal) {
    const documents = this.store.documents(); if (!documents.length) return [];
    const [query] = await this.embed([text], signal);
    return documents.flatMap(d => this.store.documentChunks(d.id).filter(c => c.model === this.model).map(c => ({ documentId: d.id, name: d.name, chunk: c.ordinal, content: c.content, score: cosine(query, JSON.parse(c.vector)) })))
      .filter(c => c.score > .12).sort((a, b) => b.score - a.score).slice(0, 4);
  }
}
