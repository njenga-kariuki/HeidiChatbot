
import { AdviceEntry, VectorSearchResult } from './types';
import { Configuration, OpenAIApi } from 'openai';

export class VectorSearch {
  private openai: OpenAIApi;
  private embeddings: { entry: AdviceEntry; vector: number[] }[] = [];

  constructor(apiKey: string) {
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }

  public async initialize(entries: AdviceEntry[]): Promise<void> {
    for (const entry of entries) {
      const searchText = `${entry.category} ${entry.subCategory} ${entry.content}`;
      const vector = await this.getEmbedding(searchText);
      this.embeddings.push({ entry, vector });
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text
    });
    return response.data.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  public async search(query: string, threshold: number = 0.7): Promise<VectorSearchResult[]> {
    const queryVector = await this.getEmbedding(query);
    
    return this.embeddings
      .map(({ entry, vector }) => ({
        entry,
        similarity: this.cosineSimilarity(queryVector, vector)
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }
}
