// Extract only a complete prefix of a JSON string while structured output streams.
export function partialText(json) {
  const match = /"text"\s*:\s*"/.exec(json); if (!match) return '';
  let raw = ''; let escaped = false;
  for (const char of json.slice(match.index + match[0].length)) {
    if (char === '"' && !escaped) break;
    raw += char; escaped = char === '\\' ? !escaped : false;
  }
  for (let trim = 0; trim <= 6 && trim <= raw.length; trim++) {
    try { return JSON.parse('"' + raw.slice(0, raw.length - trim) + '"'); } catch {}
  }
  return '';
}
export async function readSSE(response, onDelta, signal) {
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = '', full = '', usage = null, refusal = '';
  const consume = line => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim(); if (!data || data === '[DONE]') return;
    const event = JSON.parse(data);
    if (event.error) throw new Error('Provider stream failed.');
    if (event.usage) usage = event.usage;
    refusal += event.choices?.[0]?.delta?.refusal || '';
    const delta = event.choices?.[0]?.delta?.content || '';
    full += delta; if (full.length > 24000) throw new Error('Provider response exceeded its limit.');
    if (delta) onDelta?.(partialText(full));
  };
  try {
    while (true) {
      signal?.throwIfAborted(); const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let newline; while ((newline = pending.indexOf('\n')) >= 0) { consume(pending.slice(0, newline).trim()); pending = pending.slice(newline + 1); }
      if (pending.length > 100000) throw new Error('Provider stream frame too large.');
    }
    pending += decoder.decode(); if (pending.trim()) consume(pending.trim());
    return { full, usage, refusal };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
