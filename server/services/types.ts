
import { z } from "zod";

export interface AdviceEntry {
  category: string;
  subCategory: string;
  advice: string;
  adviceContext: string;
  sourceTitle: string;
  sourceType: string;
  sourceLink: string;
}

export interface VectorSearchResult {
  entry: AdviceEntry;
  similarity: number;
}
