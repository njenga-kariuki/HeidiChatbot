import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  isSuccess?: boolean;
}

export default function ChatInput({ onSubmit, isLoading, isSuccess }: ChatInputProps) {
  const [query, setQuery] = useState("");

  // Clear input when success state changes to true
  useEffect(() => {
    if (isSuccess) {
      setQuery("");
    }
  }, [isSuccess]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim() && !isLoading) {
          onSubmit(query);
        }
      }}
      className="space-y-4"
    >
      <Textarea
        placeholder="Ask a specific startup question (e.g., 'When should I raise funding?', 'How do I know when to pivot?')"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (query.trim() && !isLoading) {
              onSubmit(query);
            }
          }
        }}
        className="min-h-[100px] resize-none rounded-xl border-gray-100 focus:border-threshold-orange focus:ring focus:ring-threshold-orange/20 placeholder:text-threshold-text-secondary placeholder:text-center focus:placeholder-transparent"
      />
      <Button
        type="submit"
        className="w-full"
        disabled={!query.trim() || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Working on it...
          </>
        ) : (
          "Ask Heidi"
        )}
      </Button>
    </form>
  );
}
