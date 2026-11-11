import { spokenText } from '../public/audio-core.js';
import { emotions } from './personality.js';
import { cueFor } from '../public/performance.js';
export function deliveryPlan(reply) {
  if (!emotions.includes(reply.emotion)) throw new Error('Unsupported delivery emotion');
  return {
    display_text: reply.text, spoken_text: spokenText(reply.text), emotion: reply.emotion,
    intensity: reply.emotion === 'excited' ? .55 : reply.emotion === 'concerned' ? .2 : .35,
    optional_reaction: null, avatar_expression: reply.emotion,
    performance: reply.performance || cueFor(reply.emotion, { concerned: 'concern', curious: 'thinking', playful: 'tease', excited: 'celebrate' }[reply.emotion] || 'none'),
  };
}
