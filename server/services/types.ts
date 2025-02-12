
import { z } from "zod";

export interface AdviceEntry {
  category: string;
  subCategory: string;
  advice: string;
  adviceContext: string;
  sourceTitle: string;
  sourceLink: string;
  sourceType: string;
}

export interface VectorSearchResult {
  entry: AdviceEntry;
  similarity: number;
}
