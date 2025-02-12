import { AdviceEntry, VectorSearchResult } from './types';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VectorSearch {
  private openai: OpenAI;
  private embeddings: { entry: AdviceEntry; vector: number[] }[] = [];
  private categoryEmbeddings: Map<string, number[]> = new Map();
  private cacheFilePath: string = path.join(__dirname, 'vectorCache.json');

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  private constructSearchText(entry: AdviceEntry): string {
    return `${entry.category} ${entry.subCategory} ${entry.advice} ${entry.adviceContext}`.trim();
  }

  // --- Caching Methods ---
  private loadCache(): boolean {
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const rawData = fs.readFileSync(this.cacheFilePath, 'utf8');
        const cache = JSON.parse(rawData);
        this.categoryEmbeddings = new Map(cache.categoryEmbeddings);
        this.embeddings = cache.embeddings;
        console.log('Loaded embeddings from cache.');
        return true;
      } catch (error) {
        console.error('Error loading cache:', error);
        return false;
      }
    }
    return false;
  }

  private saveCache(): void {
    const cache = {
      categoryEmbeddings: Array.from(this.categoryEmbeddings.entries()),
      embeddings: this.embeddings,
    };
    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cache), 'utf8');
      console.log('Saved embeddings to cache.');
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }
  // ---------------------

  public async initialize(entries: AdviceEntry[]): Promise<void> {
    console.log(`Starting vector initialization with ${entries.length} entries`);

    // Use cache if available to avoid recomputation
    if (this.loadCache()) {
      console.log('Using cached embeddings. Skipping re-initialization.');
      return;
    }

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
      // Save the computed embeddings for future use
      this.saveCache();
    } catch (error) {
      console.error('Error during vector initialization:', error);
      throw error;
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-large",
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

      // Get category similarities and log each
      const categorySimilarities = new Map<string, number>();
      for (const [category, vector] of this.categoryEmbeddings.entries()) {
        const sim = this.cosineSimilarity(mainQueryVector, vector);
        categorySimilarities.set(category, sim);
        console.log(`Category: ${category}, Similarity: ${sim}`);
      }

      // Calculate similarities for all entries
      const allResults = this.embeddings.map(({ entry, vector }, index) => {
        const directSimilarity = this.cosineSimilarity(mainQueryVector, vector);
        const categorySimilarity = categorySimilarities.get(entry.category) || 0;

        // Combined similarity score
        const combinedSimilarity = (directSimilarity * 0.8) + (categorySimilarity * 0.2);

        // Detailed logging for the first 3 entries
        if (index < 3) {
          console.log(`Entry ${index + 1}:`);
          console.log(`   Direct Similarity: ${directSimilarity}`);
          console.log(`   Category Similarity: ${categorySimilarity}`);
          console.log(`   Combined Similarity: ${combinedSimilarity}`);
        }

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
