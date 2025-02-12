import { Message } from '@shared/schema';
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY is required');
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function generateStage1Response(query: string): Promise<string> {
  const completion = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1000,
    temperature: 0.7,
    system: "You are a helpful AI that provides startup and entrepreneurship advice based on Heidi Roizen's experiences and insights. First retrieve and combine relevant advice.",
    messages: [{ role: 'user', content: query }],
  });
  
  return completion.content[0].text;
}

export async function generateStage2Response(stage1Response: string): Promise<string> {
  const completion = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1000,
    temperature: 0.7,
    system: "Transform the given response into Heidi's distinctive writing style while maintaining accuracy and attribution.",
    messages: [{ role: 'user', content: stage1Response }],
  });

  return completion.content[0].text;
}
