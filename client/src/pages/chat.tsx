import { Card } from "@/components/ui/card";
import ChatInput from "@/components/chat/chat-input";
import ChatMessage from "@/components/chat/chat-message";
import LoadingMessage from "@/components/chat/loading-message";
import { Message } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [message, setMessage] = useState<Message | null>(null);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/chat", { query });
      return res.json() as Promise<Message>;
    },
    onSuccess: (data) => {
      setMessage(data);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-center text-3xl font-semibold">
          Heidi's Advice
        </h1>
        <p className="mb-8 text-center italic text-gray-600">
          AI venture wisdom powered by Heidi Roizen's archive of podcasts, talks, blogs, and 30+ years of straight-shooting startup advice
        </p>

        <Card className="mb-6 p-6">
          <ChatInput
            onSubmit={(query) => mutation.mutate(query)}
            isLoading={mutation.isPending}
          />
        </Card>

        {mutation.isPending && <LoadingMessage />}

        {message && (
          <ChatMessage
            message={message}
            onFeedbackSubmitted={setMessage}
          />
        )}
      </div>
    </div>
  );
}