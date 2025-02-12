
import { z } from "zod";

export interface AdviceEntry {
  category: string;
  subCategory: string;
  content: string;
  context: string;
  sourceTitle: string;
  sourceLink: string;
}

export interface VectorSearchResult {
  entry: AdviceEntry;
  similarity: number;
}
