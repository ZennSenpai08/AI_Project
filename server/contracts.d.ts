/** Provider boundaries. Implementations are injectable; credentials stay server-side. */
export type Emotion = 'warm' | 'playful' | 'curious' | 'concerned' | 'excited' | 'calm';
export interface Reply { text: string; emotion: Emotion; memorySuggestion: string | null; usage?: { total_tokens?: number } }
export interface ChatProvider {
  chat(text: string, history: {role: string; content: string}[], memories: {content: string; kind: string}[], language: string, signal: AbortSignal, onText?: (text: string) => void, context?: string): Promise<Reply>;
}
export interface SpeechRecognitionProvider { transcribe(wav: Uint8Array, signal: AbortSignal): Promise<string> }
export interface SpeechSynthesisProvider { speech(text: string, emotion: Emotion, signal: AbortSignal, speed?: number): Promise<Uint8Array> }
export interface EmbeddingProvider { model: string; embed(texts: string[], signal: AbortSignal): Promise<number[][]> }
export interface AvatarAdapter { update(state: { state?: string; emotion?: Emotion; mouth?: number; speaking?: boolean }): void }
