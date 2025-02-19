import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

interface FeedbackProps {
  messageId: number;
  onFeedbackSubmitted: (message: Message) => void;
}

export default function Feedback({ messageId, onFeedbackSubmitted }: FeedbackProps) {
  const [showTextArea, setShowTextArea] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ thumbsUp }: { thumbsUp: boolean }) => {
      const res = await apiRequest("POST", `/api/chat/${messageId}/feedback`, {
        thumbsUp,
        feedback: feedback.trim() || undefined,
      });
      return res.json() as Promise<Message>;
    },
    onSuccess: (data) => {
      onFeedbackSubmitted(data);
      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-threshold-text-muted">Was this response helpful?</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutation.mutate({ thumbsUp: true })}
          disabled={mutation.isPending}
          className="hover:text-threshold-orange hover:border-threshold-orange"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowTextArea(true);
            mutation.mutate({ thumbsUp: false });
          }}
          disabled={mutation.isPending}
          className="hover:text-threshold-orange hover:border-threshold-orange"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>

      {showTextArea && (
        <div className="space-y-2">
          <Textarea
            placeholder="What could be improved? (Optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="h-24 border-gray-200 focus:border-threshold-orange focus:ring focus:ring-threshold-orange/20"
          />
          <Button
            onClick={() => mutation.mutate({ thumbsUp: false })}
            disabled={mutation.isPending}
            variant="outline"
          >
            Submit Feedback
          </Button>
        </div>
      )}
    </div>
  );
}
