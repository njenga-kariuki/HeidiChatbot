
import { parse } from 'csv-parse/sync';
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
      const csvData = fs.readFileSync(filePath, 'utf-8');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      this.adviceData = records.map((row: any) => ({
        category: row.Category,
        subCategory: row.SubCategory,
        advice: row.Advice,
        adviceContext: row.AdviceContext,
        sourceTitle: row.SourceTitle,
        sourceLink: row.SourceLink,
        sourceType: row.SourceType
      }));
    } catch (error) {
      throw new Error(`Failed to load advice data: ${error.message}`);
    }
  }

  public getData(): AdviceEntry[] {
    return this.adviceData;
  }
}
