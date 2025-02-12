import { AdviceEntry, VectorSearchResult } from './types';
import OpenAI from 'openai';

export class VectorSearch {
  private openai: OpenAI;
  private embeddings: { entry: AdviceEntry; vector: number[] }[] = [];
  private categoryEmbeddings: Map<string, number[]> = new Map();

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  private constructSearchText(entry: AdviceEntry): string {
    return `${entry.category} ${entry.subCategory} ${entry.advice} ${entry.adviceContext}`.trim();
  }

  public async initialize(entries: AdviceEntry[]): Promise<void> {
    console.log(`Starting vector initialization with ${entries.length} entries`);
    try {
      // Create embeddings for unique categories
      const uniqueCategories = [...new Set(entries.map(e => e.category))];
      console.log(`Processing ${uniqueCategories.length} unique categories...`);
      for (const category of uniqueCategories) {
        console.log(`Getting embedding for category: ${category}`);
        const vector = await this.getEmbedding(category);
        this.categoryEmbeddings.set(category, vector);
      }

      // Create embeddings for each entry
      console.log(`Processing ${entries.length} entries...`);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        console.log(`Getting embedding for entry ${i + 1}/${entries.length}: ${entry.category} - ${entry.subCategory}`);
        const searchText = this.constructSearchText(entry);
        const vector = await this.getEmbedding(searchText);
        this.embeddings.push({ entry, vector });
        
        // Log progress every 50 entries
        if ((i + 1) % 50 === 0) {
          console.log(`Progress: ${i + 1}/${entries.length} entries processed`);
        }
      }

      console.log(`Vector initialization complete. Total embeddings: ${this.embeddings.length}`);
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
      // Get the main query vector
      const mainQueryVector = await this.getEmbedding(query);

      // Get category similarities
      const categorySimilarities = new Map<string, number>();
      for (const [category, vector] of this.categoryEmbeddings.entries()) {
        categorySimilarities.set(category, this.cosineSimilarity(mainQueryVector, vector));
      }

      // Calculate similarities for all entries
      const allResults = this.embeddings.map(({ entry, vector }) => {
        const directSimilarity = this.cosineSimilarity(mainQueryVector, vector);
        const categorySimilarity = categorySimilarities.get(entry.category) || 0;

        // Combined similarity score
        const combinedSimilarity = (directSimilarity * 0.8) + (categorySimilarity * 0.2);

        return {
          entry,
          similarity: combinedSimilarity
        };
      });

      // Sort by similarity
      const sortedResults = allResults.sort((a, b) => b.similarity - a.similarity);

      // Log top 3 similarities before filtering
      console.log('Top 3 similarities:', 
        sortedResults.slice(0, 3).map(r => ({
          similarity: r.similarity,
          category: r.entry.category,
          subCategory: r.entry.subCategory,
          sourceTitle: r.entry.sourceTitle
        }))
      );

      // Apply threshold and get top results
      const results = sortedResults
        .filter(result => result.similarity >= threshold)
        .slice(0, 5);  // Get top 5 results

      console.log(`Found ${results.length} results above threshold ${threshold}`);

      // Log detailed information about selected results
      console.log('Selected results:', 
        results.map(r => ({
          similarity: r.similarity,
          category: r.entry.category,
          subCategory: r.entry.subCategory,
          sourceTitle: r.entry.sourceTitle
        }))
      );

      return results;
    } catch (error) {
      console.error('Error during search:', error);
      throw error;
    }
  }
}