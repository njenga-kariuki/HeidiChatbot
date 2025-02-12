import Papa from 'papaparse';
import fs from 'fs';
import { AdviceEntry } from './types';

export class DataLoader {
  private static instance: DataLoader;
  private adviceData: AdviceEntry[] = [];

  private constructor() {}

  public static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  private preprocessText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:'"]/g, ' ')
      .replace(/\(|\)/g, ' ')
      .trim();
  }

  private validateEntry(entry: AdviceEntry): boolean {
    return !!(
      entry?.advice?.trim() &&
      entry?.category?.trim() &&
      entry?.subCategory?.trim()
    );
  }

  private preprocessAdviceEntry(row: any): AdviceEntry {
    return {
      category: this.preprocessText(row.Category || row.category),
      subCategory: this.preprocessText(row.SubCategory || row.subCategory),
      advice: this.preprocessText(row.Advice || row.advice),
      adviceContext: this.preprocessText(row.AdviceContext || row.adviceContext),
      sourceTitle: (row.SourceTitle || row.sourceTitle || '').trim(),
      sourceLink: (row.SourceLink || row.sourceLink || '').trim(),
      sourceType: (row.SourceType || row.sourceType || '').trim()
    };
  }

  public async loadData(filePath: string): Promise<void> {
    try {
      console.log('Loading data from:', filePath);

      // Read file with proper encoding
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

      // Remove BOM and any other potential encoding artifacts
      const cleanedContent = fileContent
        .replace(/^\uFEFF/, '') // Remove BOM
        .replace(/\r\n/g, '\n') // Normalize line endings
        .trim();

      console.log(`File loaded. Content length: ${cleanedContent.length} characters`);
      console.log('First 200 characters:', cleanedContent.substring(0, 200));

      // Parse CSV with complete configuration
      const parseResult = Papa.parse(cleanedContent, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',', // Explicitly set delimiter
        newline: '\n',  // Explicitly set newline
        transform: (value) => value?.trim() || '',
        complete: (results, file) => {
          console.log(`Papa Parse complete. Found ${results.data.length} rows`);
        },
        error: (error, file) => {
          console.error('Papa Parse error:', error);
        }
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      if (!parseResult.data || parseResult.data.length === 0) {
        throw new Error('No data parsed from CSV');
      }

      console.log('CSV Parse Results:', {
        totalRows: parseResult.data.length,
        headers: parseResult.meta.fields,
        sampleRow: parseResult.data[0]
      });

      // Process entries
      const processedEntries = parseResult.data
        .map(row => this.preprocessAdviceEntry(row))
        .filter(entry => this.validateEntry(entry));

      console.log('Processing Summary:', {
        totalRows: parseResult.data.length,
        validEntries: processedEntries.length,
        skippedEntries: parseResult.data.length - processedEntries.length
      });

      if (processedEntries.length === 0) {
        throw new Error('No valid entries found after processing');
      }

      // Store the processed entries
      this.adviceData = processedEntries;

      // Log sample of processed entries
      console.log('Sample of processed entries:', 
        processedEntries.slice(0, 3).map(entry => ({
          category: entry.category,
          subCategory: entry.subCategory,
          adviceLength: entry.advice?.length,
          hasContext: !!entry.adviceContext
        }))
      );

    } catch (error) {
      console.error('Error details:', error);
      throw new Error(`Failed to load advice data: ${error.message}`);
    }
  }

  public getData(): AdviceEntry[] {
    return this.adviceData;
  }
}