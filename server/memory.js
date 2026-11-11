const sensitive = /password|api.?key|secret|bank|credit.?card|diagnos|address|phone|sexual|suicid|\b\d{7,}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
export function groundedSuggestion(suggestion, source) {
  if (typeof suggestion !== 'string' || !suggestion.trim() || suggestion.length > 300 || sensitive.test(suggestion)) return null;
  if (/\b(?:pretend|imagine|suppose|hypothetical|joke|quoted)\b|[“”"]/i.test(source)) return null;
  return source.toLowerCase().includes(suggestion.toLowerCase().trim()) ? suggestion.trim() : null;
}
export function memoryConflict(content, memories) {
  // Conservative, visible heuristic; never silently merges contradictory facts.
  const prefix = content.toLowerCase().match(/^(?:my\s+\w+\s+(?:is|are)|i\s+(?:like|prefer|live|work)|ang\s+\w+\s+ko)/)?.[0];
  return prefix ? memories.filter(m => m.content.toLowerCase().startsWith(prefix) && m.content.toLowerCase() !== content.toLowerCase()).map(m => m.id) : [];
}
