
import { Message } from '@shared/schema';
import Anthropic from '@anthropic-ai/sdk';
import { DataLoader } from './dataLoader';
import { VectorSearch } from './vectorSearch';

if (!process.env.CLAUDE_API_KEY || !process.env.OPENAI_API_KEY) {
  throw new Error('CLAUDE_API_KEY and OPENAI_API_KEY are required');
}

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const vectorSearch = new VectorSearch(process.env.OPENAI_API_KEY);

export async function initializeSystem(csvPath: string): Promise<void> {
  const dataLoader = DataLoader.getInstance();
  await dataLoader.loadData(csvPath);
  await vectorSearch.initialize(dataLoader.getData());
}

const STAGE1_SYSTEM_PROMPT = `You are a specialized chatbot that provides startup and entrepreneurship advice based on Heidi Roizen's experiences and insights. Your responses should be drawn exclusively from the provided advice entries.

Response Generation Rules:
1. Data Search Parameters:
   - Use the provided relevant advice points (max 5)
   - Only include highly relevant advice points
   
2. Response Construction:
   - Combine selected advice points into a coherent narrative
   - For each relevant advice point, incorporate ALL associated context
   - When using direct quotes, format as: "As I mentioned in [Source Content Title], '[quote]'"
   - For paraphrased content, integrate naturally while maintaining accuracy
   - If multiple perspectives exist on a topic, frame them as different valid approaches
   - If no relevant advice exists, respond with: "This area hasn't been covered in my existing advice yet."

3. Source Attribution:
   - End each response with: "For more insights, see: [Source Links]"
   - Include all unique source links from utilized advice points
   - Format multiple sources as a bullet list`;

export async function generateStage1Response(query: string): Promise<string> {
  try {
    const searchResults = await vectorSearch.search(query);
    
    if (searchResults.length === 0) {
      return "This area hasn't been covered in my existing advice yet.";
    }

    const contextPrompt = `Based on the following relevant advice entries, provide a comprehensive response:

${searchResults.map((result, index) => `
Entry ${index + 1}:
Category: ${result.entry.category}
SubCategory: ${result.entry.subCategory}
Advice: ${result.entry.advice}
Context: ${result.entry.adviceContext}
Source: ${result.entry.sourceTitle}
Link: ${result.entry.sourceLink}
`).join('\n')}

Query: ${query}`;

    const completion = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      system: STAGE1_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contextPrompt }],
    });
    
    return completion.content[0].text;
  } catch (error) {
    throw new Error(`Stage 1 generation failed: ${error.message}`);
  }
}

export async function generateStage2Response(stage1Response: string): Promise<string> {
  try {
    if (!stage1Response || stage1Response.trim() === '') {
      throw new Error('Stage 1 response is empty or invalid');
    }

    const completion = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      system: "Transform the given response into Heidi's distinctive writing style while maintaining accuracy and attribution.",
      messages: [{ role: 'user', content: stage1Response }],
    });
    
    return completion.content[0].text;
  } catch (error) {
    throw new Error(`Stage 2 generation failed: ${error.message}`);
  }
}
