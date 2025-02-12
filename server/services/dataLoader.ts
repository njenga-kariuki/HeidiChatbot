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

  public async loadData(filePath: string): Promise<void> {
    try {
      console.log('Loading data from:', filePath);
      const csvData = fs.readFileSync(filePath, 'utf-8');
      console.log('CSV data loaded, first 100 chars:', csvData.substring(0, 100));

      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim()
      });

      console.log('Parse result:', {
        rowCount: parseResult.data.length,
        fields: parseResult.meta.fields,
        errors: parseResult.errors
      });

      this.adviceData = parseResult.data.map((row: any) => ({
        category: row.Category,
        subCategory: row.SubCategory,
        advice: row.Advice,  
        adviceContext: row.AdviceContext,
        sourceTitle: row.SourceTitle,
        sourceLink: row.SourceLink,
        sourceType: row.SourceType
      }));

      console.log('Processed entries:', {
        totalEntries: this.adviceData.length,
        sampleEntry: this.adviceData[0]
      });

    } catch (error) {
      console.error('Error details:', error);
      throw new Error(`Failed to load advice data: ${error.message}`);
    }
  }

  public getData(): AdviceEntry[] {
    console.log('getData called, returning', this.adviceData.length, 'entries');
    return this.adviceData;
  }
}