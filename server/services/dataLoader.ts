import Papa from 'papaparse';
import fs from 'fs';
import { AdviceEntry, SearchAdviceEntry } from '@shared/schema';
import path from 'path';

// Type guard for raw CSV data
interface RawCSVRow {
  Category: string;
  SubCategory: string;
  Advice: string;
  AdviceContext: string;
  SourceTitle: string;
  SourceType: string;
  SourceLink: string;
  MsgSourceTitle?: string;
}

function isValidRawRow(row: unknown): row is RawCSVRow {
  const r = row as RawCSVRow;
  return (
    typeof r?.Category === 'string' &&
    typeof r?.SubCategory === 'string' &&
    typeof r?.Advice === 'string' &&
    typeof r?.AdviceContext === 'string' &&
    typeof r?.SourceTitle === 'string' &&
    typeof r?.SourceType === 'string' &&
    typeof r?.SourceLink === 'string' &&
    (r?.MsgSourceTitle === undefined || typeof r?.MsgSourceTitle === 'string')
  );
}

export class DataLoader {
  private static instance: DataLoader;
  private adviceData: SearchAdviceEntry[] = [];

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

  private validateSearchEntry(entry: SearchAdviceEntry): boolean {
    const isValid = !!(
      entry?.advice?.trim() &&
      entry?.category?.trim() &&
      entry?.subCategory?.trim() &&
      entry?.rawAdvice &&
      entry?.rawAdviceContext !== undefined
    );

    if (!isValid) {
      console.warn('Invalid search entry:', {
        hasAdvice: !!entry?.advice,
        hasCategory: !!entry?.category,
        hasSubCategory: !!entry?.subCategory,
        hasRawAdvice: !!entry?.rawAdvice,
        hasRawContext: entry?.rawAdviceContext !== undefined
      });
    }

    return isValid;
  }

  private readAndCleanFile(filePath: string): string {
    const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
    return content
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  public async loadData(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const cleanedContent = this.readAndCleanFile(filePath);
      
      const parseResult = Papa.parse(cleanedContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      if (!parseResult.data || parseResult.data.length === 0) {
        throw new Error('No data parsed from CSV');
      }

      const processedEntries: SearchAdviceEntry[] = [];
      let skippedRows = 0;
      let invalidRows = 0;

      for (const row of parseResult.data) {
        if (!isValidRawRow(row)) {
          invalidRows++;
          continue;
        }

        try {
          const entry: SearchAdviceEntry = {
            category: row.Category.trim(),
            subCategory: row.SubCategory.trim(),
            advice: this.preprocessText(row.Advice),
            adviceContext: this.preprocessText(row.AdviceContext),
            sourceTitle: row.SourceTitle.trim(),
            sourceType: row.SourceType.trim(),
            sourceLink: row.SourceLink.trim(),
            msgSourceTitle: row.MsgSourceTitle?.trim(),
            rawAdvice: row.Advice,
            rawAdviceContext: row.AdviceContext
          };

          if (this.validateSearchEntry(entry)) {
            processedEntries.push(entry);
          } else {
            skippedRows++;
          }
        } catch (err) {
          console.error('Error processing row:', { row, error: err });
          skippedRows++;
        }
      }

      console.log('Data Processing Summary:', {
        totalRows: parseResult.data.length,
        validEntries: processedEntries.length,
        invalidRows,
        skippedRows,
        processingRate: `${((processedEntries.length / parseResult.data.length) * 100).toFixed(1)}%`
      });

      if (processedEntries.length === 0) {
        throw new Error('No valid entries found after processing');
      }

      this.adviceData = processedEntries;

      const processed = this.getData();
      if (processed.length > 0) {
        const sampleProcessed = processed[0];
        console.log('Format Validation:', {
          hasRequiredFields: Object.keys(sampleProcessed).sort().join(','),
          maintainsFormat: Object.keys(sampleProcessed).length === 7 && 
            'advice' in sampleProcessed &&
            'category' in sampleProcessed &&
            'subCategory' in sampleProcessed
        });
      }

    } catch (error) {
      const err = error as Error;
      console.error('Data loading error:', {
        message: err.message,
        stack: err.stack,
        type: err.name
      });
      throw new Error(`Failed to load advice data: ${err.message}`);
    }
  }

  public getData(): AdviceEntry[] {
    // Return processed version for vector search and chat
    const processed = this.adviceData.map(entry => ({
      category: entry.category,
      subCategory: entry.subCategory,
      advice: entry.advice,
      adviceContext: entry.adviceContext,
      sourceTitle: entry.sourceTitle,
      sourceType: entry.sourceType,
      sourceLink: entry.sourceLink,
      msgSourceTitle: entry.msgSourceTitle,
    }));

    // Validate processed data
    console.log('getData Validation:', {
      totalEntries: processed.length,
      sampleEntry: processed[0] ? Object.keys(processed[0]).sort().join(',') : 'no entries',
      maintainsFormat: processed.every(entry => 
        Object.keys(entry).length >= 7 && // Allow for optional msgSourceTitle
        'advice' in entry &&
        'category' in entry &&
        'subCategory' in entry
      )
    });

    return processed;
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
    entries: SearchAdviceEntry[];
    total: number;
    from: number;
    to: number;
    totalPages: number;
  } {
    const { query, category, subCategory, page, pageSize } = params;
    
    let filtered = [...this.adviceData];

    // Apply filters using processed text for search
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