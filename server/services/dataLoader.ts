
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
      const csvData = fs.readFileSync(filePath, 'utf-8');
      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transform: (value) => value.trim()
      });

      this.adviceData = parseResult.data.map((row: any) => ({
        category: row.Category,
        subCategory: row.SubCategory,
        content: row.Content,
        context: row.Context,
        sourceTitle: row.SourceTitle,
        sourceLink: row.SourceLink
      }));
    } catch (error) {
      throw new Error(`Failed to load advice data: ${error.message}`);
    }
  }

  public getData(): AdviceEntry[] {
    return this.adviceData;
  }
}
