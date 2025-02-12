import { AdviceEntry, VectorSearchResult } from './types';
import OpenAI from 'openai';

export class VectorSearch {
  private openai: OpenAI;
  private embeddings: { entry: AdviceEntry; vector: number[] }[] = [];

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  public async initialize(entries: AdviceEntry[]): Promise<void> {
    console.log(`Starting vector initialization with ${entries.length} entries`);

    try {
      for (const entry of entries) {
        const searchText = `${entry.category} ${entry.subCategory} ${entry.content}`;
        console.log('Processing entry:', {
          category: entry.category,
          subCategory: entry.subCategory,
          contentLength: entry.content?.length || 0
        });

        const vector = await this.getEmbedding(searchText);
        this.embeddings.push({ entry, vector });
      }

      console.log(`Vector initialization complete. Total embeddings: ${this.embeddings.length}`);
      // Log a sample embedding to verify structure
      if (this.embeddings.length > 0) {
        console.log('Sample embedding vector length:', this.embeddings[0].vector.length);
      }
    } catch (error) {
      console.error('Error during vector initialization:', error);
      throw error;
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error getting embedding:', error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  public async search(query: string, threshold: number = 0.5): Promise<VectorSearchResult[]> {
    console.log(`Searching for query: "${query}" with threshold ${threshold}`);
    console.log(`Current number of embeddings: ${this.embeddings.length}`);

     try {
        const queryVector = await this.getEmbedding(query);

        // Get all results and their similarities before filtering
        const allResults = this.embeddings
          .map(({ entry, vector }) => ({
            entry,
            similarity: this.cosineSimilarity(queryVector, vector)
          }))
          .sort((a, b) => b.similarity - a.similarity);

        // Log the top 3 similarities regardless of threshold
        console.log('Top 3 similarities:', 
          allResults.slice(0, 3).map(r => ({
            similarity: r.similarity,
            category: r.entry.category,
            subCategory: r.entry.subCategory
          }))
        );

        // Now filter and return results
        const results = allResults
          .filter(result => result.similarity >= threshold)
          .slice(0, 5);

        console.log(`Found ${results.length} results above threshold ${threshold}`);
        return results;
      } catch (error) {
        console.error('Error during search:', error);
        throw error;
      }
    }
}