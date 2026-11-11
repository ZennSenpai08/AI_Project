import { resolve } from 'node:path';

export function configFromEnv(env = process.env) {
  const config = {
    port: Number(env.PORT || 3210), host: '127.0.0.1',
    appName: (env.APP_NAME || 'Hiraya AI').slice(0, 60),
    characterName: (env.CHARACTER_NAME || 'Hiraya').slice(0, 40),
    avatarProvider: env.AVATAR_PROVIDER || 'live2d',
    chatProvider: env.CHAT_PROVIDER || 'demo', chatModel: env.CHAT_MODEL || 'gpt-4.1-mini',
    openaiKey: env.OPENAI_API_KEY || '', openaiBase: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    ollamaBase: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1', ollamaModel: env.OLLAMA_MODEL || 'qwen3:8b',
    ttsProvider: env.TTS_PROVIDER || 'browser', ttsModel: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    ttsVoice: env.OPENAI_TTS_VOICE || 'coral', sttModel: env.STT_MODEL || 'gpt-transcribe',
    azureKey: env.AZURE_SPEECH_KEY || '', azureRegion: env.AZURE_SPEECH_REGION || 'southeastasia',
    azureVoice: env.AZURE_SPEECH_VOICE || 'fil-PH-BlessicaNeural',
    dataDir: resolve(env.DATA_DIR || './data'),
    embeddingProvider: env.EMBEDDING_PROVIDER || 'local', embeddingModel: env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dailyRequests: Number(env.DAILY_PROVIDER_REQUESTS || 250), dailySpeechChars: Number(env.DAILY_SPEECH_CHARACTERS || 25000),
    timeoutMs: Number(env.PROVIDER_TIMEOUT_MS || 60000), retries: Number(env.PROVIDER_RETRIES || 0),
  };
  if (!['demo', 'openai', 'ollama'].includes(config.chatProvider)) throw new Error('Invalid CHAT_PROVIDER');
  if (!['live2d', 'svg'].includes(config.avatarProvider)) throw new Error('AVATAR_PROVIDER must be live2d or svg');
  if (!['local', 'openai'].includes(config.embeddingProvider)) throw new Error('Invalid EMBEDDING_PROVIDER');
  if (config.embeddingProvider === 'openai' && !config.openaiKey) throw new Error('Cloud embeddings require OPENAI_API_KEY');
  for (const value of [config.dailyRequests, config.dailySpeechChars, config.timeoutMs]) if (!Number.isInteger(value) || value < 1) throw new Error('Usage ceilings and timeout must be positive integers');
  if (![0, 1, 2].includes(config.retries)) throw new Error('PROVIDER_RETRIES must be 0, 1 or 2');
  if (!['browser', 'azure', 'openai'].includes(config.ttsProvider)) throw new Error('Invalid TTS_PROVIDER');
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) throw new Error('Invalid PORT');
  if (!/^[a-z0-9-]+$/.test(config.azureRegion)) throw new Error('Invalid Azure region');
  if (config.chatProvider === 'openai' && !config.openaiKey) throw new Error('CHAT_PROVIDER=openai requires OPENAI_API_KEY');
  if (config.ttsProvider === 'openai' && !config.openaiKey) throw new Error('TTS_PROVIDER=openai requires OPENAI_API_KEY');
  if (config.ttsProvider === 'azure' && !config.azureKey) throw new Error('TTS_PROVIDER=azure requires AZURE_SPEECH_KEY');
  for (const url of [config.openaiBase, config.ollamaBase]) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))) throw new Error('Provider URLs must use HTTPS or local HTTP');
  }
  return config;
}
