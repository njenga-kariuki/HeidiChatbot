import { Card, CardContent } from "@/components/ui/card";
import Feedback from "./feedback";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  onFeedbackSubmitted: (message: Message) => void;
}

export default function ChatMessage({ message, onFeedbackSubmitted }: ChatMessageProps) {
  return (
    <Card className="overflow-hidden border-gray-200">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="font-medium text-gray-900">Your Question</h3>
          <p className="mt-1 text-gray-600">{message.query}</p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900">Heidi's Response</h3>
          <div 
            className="mt-1 prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: message.finalResponse || "" }}
          />
        </div>

        <Feedback 
          messageId={message.id} 
          onFeedbackSubmitted={onFeedbackSubmitted}
        />
      </CardContent>
    </Card>
  );
}