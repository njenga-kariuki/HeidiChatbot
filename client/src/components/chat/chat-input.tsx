import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [query, setQuery] = useState("");

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
        placeholder="What question or topic do you want Heidi's advice on?"
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
        className="min-h-[100px] resize-none rounded-xl border-gray-100 focus:border-threshold-orange focus:ring focus:ring-threshold-orange/20 placeholder:text-threshold-text-primary"
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
