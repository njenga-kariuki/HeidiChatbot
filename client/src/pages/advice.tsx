import { Card } from "@/components/ui/card";
import Chat from "./chat";
import Search from "@/components/search/search";
import { Search as SearchIcon, MessageSquare } from "lucide-react";
import { useState } from "react";

export default function Advice() {
  const [mode, setMode] = useState<"chat" | "search">("chat");

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-center text-3xl font-semibold">
          Ask Heidi
        </h1>
        <p className="mb-8 text-center italic text-gray-600">
          Venture wisdom from Heidi Roizen's archive of podcasts, talks, blogs, and 30+ years of straight-shooting startup advice
        </p>

        {/* Mode Toggle */}
        <Card className="mb-6 p-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode("chat")}
              className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 ${
                mode === "chat" ? "bg-white shadow-sm" : ""
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setMode("search")}
              className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center gap-2 ${
                mode === "search" ? "bg-white shadow-sm" : ""
              }`}
            >
              <SearchIcon className="w-4 h-4" />
              Search
            </button>
          </div>
        </Card>

        {mode === "chat" ? <Chat /> : <Search />}
      </div>
    </div>
  );
} 