import Papa from 'papaparse';
import fs from 'fs';
import { AdviceEntry } from './types';
import path from 'path';

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

  private readAndCleanFile(filePath: string): string {
    // Read file with UTF-8 encoding and BOM
    const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
    console.log(`Raw file size: ${content.length} bytes`);
    
    // Remove BOM if present and normalize line endings
    const cleaned = content
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    console.log(`Cleaned file size: ${cleaned.length} bytes`);
    console.log(`Number of lines: ${cleaned.split('\n').length}`);
    return cleaned;
  }

  public async loadData(filePath: string): Promise<void> {
    try {
      console.log('[DEBUG] DataLoader.loadData:', {
        attemptedPath: filePath,
        absolutePath: path.resolve(filePath),
        exists: fs.existsSync(filePath),
        workingDir: process.cwd()
      });

      console.log('Loading data from:', filePath);
      console.log('Current working directory:', process.cwd());
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read and clean the file content
      const cleanedContent = this.readAndCleanFile(filePath);

      console.log('[DEBUG] File read complete:', {
        contentLength: cleanedContent.length,
        firstLine: cleanedContent.split('\n')[0],
        encoding: 'utf-8'
      });

      console.log(`File loaded. Content length: ${cleanedContent.length} characters`);
      console.log('First 200 characters:', cleanedContent.substring(0, 200));

      // Parse CSV with complete configuration
      console.log('Starting CSV parse...');
      const parseResult = Papa.parse(cleanedContent, {
        header: true,
        skipEmptyLines: 'greedy',
        delimiter: ',',
        newline: '\n',
        quoteChar: '"',
        escapeChar: '"',
        comments: false,
        transformHeader: (header) => header.trim(),
        transform: (value) => value?.trim() || '',
        error: (error) => {
          console.error('Papa Parse error:', error);
        },
        encoding: "UTF-8",
        complete: (results) => {
          console.log('Parse complete. Row count:', results.data.length);
        }
      });

      // Log any parsing errors or warnings
      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', 
          parseResult.errors.map(err => ({
            type: err.type,
            code: err.code,
            message: err.message,
            row: err.row
          }))
        );
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
        .filter(row => {
          // Check if row has all required fields
          const hasAllFields = row.Category && row.SubCategory && row.Advice;
          if (!hasAllFields) {
            console.warn('Skipping invalid row:', row);
          }
          return hasAllFields;
        })
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

  public getCategories(): string[] {
    return [...new Set(this.adviceData.map(entry => entry.category))].sort();
  }

  public getSubCategories(): string[] {
    return [...new Set(this.adviceData.map(entry => entry.subCategory))].sort();
  }

  public searchAdvice(params: {
    query?: string;
    category?: string;
    subCategory?: string;
    page: number;
    pageSize: number;
  }): {
    entries: AdviceEntry[];
    total: number;
    from: number;
    to: number;
    totalPages: number;
  } {
    const { query, category, subCategory, page, pageSize } = params;
    
    let filtered = [...this.adviceData];

    // Apply filters
    if (query) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.advice.toLowerCase().includes(searchTerm) ||
        entry.adviceContext.toLowerCase().includes(searchTerm) ||
        entry.sourceTitle.toLowerCase().includes(searchTerm)
      );
    }

    if (category) {
      filtered = filtered.filter(entry => entry.category === category);
    }

    if (subCategory) {
      filtered = filtered.filter(entry => entry.subCategory === subCategory);
    }

    // Calculate pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const from = (page - 1) * pageSize;
    const to = Math.min(from + pageSize, total);

    return {
      entries: filtered.slice(from, to),
      total,
      from: from + 1,
      to,
      totalPages,
    };
  }
}