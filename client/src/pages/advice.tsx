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
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-extrabold text-threshold-orange tracking-tight">
            Ask Heidi<span className="text-6xl">.</span>
          </h1>
          <p className="text-threshold-text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Venture wisdom from Heidi Roizen's archive of podcasts, talks, blogs, and 30+ years of straight-shooting startup advice
          </p>
        </div>

        <Card className="mb-8 bg-threshold-bg-primary border-0 shadow-md hover:shadow-lg transition-shadow">
          <div className="border-b border-gray-200">
            <div className="flex p-1">
              <button
                onClick={() => setMode("chat")}
                className={`flex-1 py-4 px-6 flex items-center justify-center gap-3 border-b-2 transition-all ${
                  mode === "chat" 
                    ? "border-threshold-orange text-threshold-orange font-medium" 
                    : "border-transparent text-threshold-text-muted hover:text-threshold-text-secondary hover:bg-gray-50"
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Chat
              </button>
              <button
                onClick={() => setMode("search")}
                className={`flex-1 py-4 px-6 flex items-center justify-center gap-3 border-b-2 transition-all ${
                  mode === "search" 
                    ? "border-threshold-orange text-threshold-orange font-medium" 
                    : "border-transparent text-threshold-text-muted hover:text-threshold-text-secondary hover:bg-gray-50"
                }`}
              >
                <SearchIcon className="w-5 h-5" />
                Search
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-8">
          {mode === "chat" ? <Chat /> : <Search />}
        </div>
      </div>
    </div>
  );
}