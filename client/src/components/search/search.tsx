import { useState } from "react";
import { Search as SearchIcon, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAdviceSearch } from "@/hooks/use-advice-search";
import type { AdviceEntry } from "@shared/schema";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState(new Set<number>());
  
  const {
    data,
    isLoading,
    error
  } = useAdviceSearch({
    searchTerm,
    selectedCategory,
    selectedSubCategory,
    page: currentPage
  });

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600">
          Failed to load advice data. Please try again later.
        </div>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-threshold-orange" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-threshold-text-muted w-5 h-5" />
            <Input
              type="text"
              placeholder="Search advice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-gray-200 focus:border-threshold-orange focus:ring focus:ring-threshold-orange/20 normal-case"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <Select 
              value={selectedCategory ?? undefined} 
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[200px] border-gray-200 focus:ring-threshold-orange/20 normal-case">
                {selectedCategory || "All Categories"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="normal-case">All Categories</SelectItem>
                {data?.categories?.map((cat: string) => (
                  <SelectItem key={cat} value={cat} className="normal-case">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedSubCategory ?? undefined}
              onValueChange={(value: string) => {
                setSelectedSubCategory(value);
                setSelectedCategory(null);
              }}
            >
              <SelectTrigger className="w-[200px] border-gray-200 focus:ring-threshold-orange/20 normal-case">
                {selectedSubCategory || "All Subcategories"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="normal-case">All Subcategories</SelectItem>
                {data?.subCategories?.map((subcat: string) => (
                  <SelectItem key={subcat} value={subcat} className="normal-case">
                    {subcat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {data.entries.map((item: AdviceEntry, index: number) => (
          <Card key={index} className="overflow-hidden border-gray-100 transition-shadow hover:shadow-md">
            <div
              onClick={() => toggleExpand(index)}
              className="p-4 cursor-pointer hover:bg-threshold-bg-secondary flex justify-between items-start group"
            >
              <div className="space-y-2">
                <div className="text-sm text-threshold-text-muted">
                  <span className="text-threshold-orange mr-1">•</span>
                  {item.category} → {item.subCategory}
                </div>
                <div className="font-medium text-threshold-text-primary group-hover:text-threshold-orange transition-colors">
                  {item.advice}
                </div>
              </div>
              {expandedItems.has(index) ? (
                <ChevronUp className="w-5 h-5 text-threshold-text-muted group-hover:text-threshold-orange" />
              ) : (
                <ChevronDown className="w-5 h-5 text-threshold-text-muted group-hover:text-threshold-orange" />
              )}
            </div>
            
            {expandedItems.has(index) && (
              <div className="px-4 pb-4 space-y-3 bg-threshold-bg-secondary border-t border-gray-200">
                {item.adviceContext && (
                  <div className="text-gray-600 italic normal-case">
                    {item.adviceContext}
                  </div>
                )}
                {item.sourceLink && (
                  <a
                    href={item.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors normal-case"
                  >
                    {item.sourceTitle} - {item.sourceType}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </Card>
        ))}

        {data.total > 0 && (
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-gray-500">
              Showing {data.from} to {data.to} of {data.total} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="border-gray-200 hover:bg-threshold-bg-secondary hover:text-threshold-orange focus:ring-threshold-orange/20"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === data.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 