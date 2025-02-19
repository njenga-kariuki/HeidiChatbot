import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AdviceEntry } from "@shared/schema";

interface UseAdviceSearchProps {
  searchTerm: string;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  page: number;
}

interface SearchResponse {
  entries: AdviceEntry[];
  categories: string[];
  subCategories: string[];
  total: number;
  from: number;
  to: number;
  totalPages: number;
}

export function useAdviceSearch({
  searchTerm,
  selectedCategory,
  selectedSubCategory,
  page
}: UseAdviceSearchProps) {
  console.log('Search Props:', {
    searchTerm,
    selectedCategory,
    selectedSubCategory,
    page,
    categoryType: typeof selectedCategory,
    subCategoryType: typeof selectedSubCategory
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["advice-search", searchTerm, selectedCategory, selectedSubCategory, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: searchTerm,
        category: selectedCategory === "all" ? "" : (selectedCategory ?? ""),
        subCategory: selectedSubCategory === "all" ? "" : (selectedSubCategory ?? ""),
        page: page.toString()
      });

      console.log('API Request Params:', params.toString());

      const res = await apiRequest(
        "GET", 
        `/api/advice/search?${params.toString()}`
      );
      const data = await res.json() as SearchResponse;
      if (data.entries?.[0]) {
        console.log('Sample entry case:', {
          category: data.entries[0].category,
          categoryCharCodes: [...data.entries[0].category].map(c => c.charCodeAt(0)),
          subCategory: data.entries[0].subCategory,
          advice: data.entries[0].advice.substring(0, 50)
        });
      }
      return data;
    }
  });

  return {
    data: data ?? { entries: [], categories: [], subCategories: [], total: 0, from: 0, to: 0, totalPages: 0 },
    isLoading,
    error
  };
}