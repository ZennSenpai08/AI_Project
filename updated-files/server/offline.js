const blocked = message => Object.assign(new Error(`Offline Only: ${message}`), { status: 403 });
export function assertOfflineConfig(c) {
  if (!c.offlineOnly) return;
  // External loopback services may proxy cloud providers. Until their egress is
  // verifiably confined they are deliberately unavailable in strict mode.
  if (c.chatProvider !== 'demo') throw blocked('the configured conversation service has not been verified for downstream network isolation. Use demo for local UI checks or disable Offline Only explicitly.');
  if (!['faster-whisper', 'disabled'].includes(c.sttProvider)) throw blocked('select STT_PROVIDER=faster-whisper or disabled; browser recognition and external speech services are not allowed.');
  if (!['browser', 'disabled'].includes(c.ttsProvider)) throw blocked('select a local device voice or TTS_PROVIDER=disabled; external speech services are not allowed.');
  if (c.embeddingProvider !== 'local') throw blocked('cloud embeddings are prohibited. Select EMBEDDING_PROVIDER=local.');
}
export function assertNetworkAllowed(c, url) {
  if (c.offlineOnly) throw blocked('outbound provider requests are prohibited. No cloud or loopback proxy fallback is permitted.');
}
export function rendererRequestAllowed(url, origin, offlineOnly) {
  if (!offlineOnly) return true;
  try { const u = new URL(url); return u.origin === origin || ['blob:', 'data:'].includes(u.protocol); } catch { return false; }
}
