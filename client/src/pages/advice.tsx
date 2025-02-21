import { Card } from "@/components/ui/card";
import Chat from "./chat";
import Search from "@/components/search/search";
import { Search as SearchIcon, MessageSquare } from "lucide-react";
import { useState } from "react";

export default function Advice() {
  const [mode, setMode] = useState<"chat" | "search">("chat");

  return (
    <div className="min-h-screen bg-threshold-bg-secondary p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-center text-4xl font-semibold text-threshold-orange">
          Ask Heidi.
        </h1>
        <p className="mb-8 text-center text-threshold-text-primary text-sm leading-relaxed max-w-2xl mx-auto">
          650+ curated insights on startup success from 40 years as a founder, VC & 40+ boards
        </p>

        <div className="flex justify-center gap-4 mb-6 border-b border-gray-100">
          <button
            onClick={() => setMode("chat")}
            className={`flex items-center gap-2 px-2 py-3 border-b-2 transition-colors ${
              mode === "chat"
                ? "border-threshold-orange text-threshold-orange"
                : "border-transparent text-threshold-text-primary hover:text-threshold-orange"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <div className="self-center w-px h-4 bg-black/[0.08]" />
          <button
            onClick={() => setMode("search")}
            className={`flex items-center gap-2 px-2 py-3 border-b-2 transition-colors ${
              mode === "search"
                ? "border-threshold-orange text-threshold-orange"
                : "border-transparent text-threshold-text-primary hover:text-threshold-orange"
            }`}
          >
            <SearchIcon className="w-4 h-4" />
            Search
          </button>
        </div>

        <Card className="overflow-hidden bg-white">
          <div className="p-6">
            {mode === "chat" ? <Chat /> : <Search />}
          </div>
        </Card>
      </div>
    </div>
  );
}