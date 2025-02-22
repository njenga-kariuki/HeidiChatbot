import { Card, CardContent } from "@/components/ui/card";
import Feedback from "./feedback";
// import RelatedInsights from "./related-insights";
import type { Message } from "@shared/schema";

// Use the same formatting function as chat.tsx for consistency
const formatResponse = (text: string): string => {
  if (!text) return "";
  
  return text
    // Replace double newlines with paragraph breaks
    .replace(/\n\n/g, '</p><p>')
    // Replace single newlines with <br />
    .replace(/\n/g, '<br />')
    // Fix any cases where we might have inserted breaks inside HTML tags
    .replace(/<br \/><a/g, '<a')
    .replace(/<\/a><br \/>/g, '</a>')
    // Ensure proper paragraph wrapping
    .replace(/^(.+?)(?=<\/p>|$)/, '<p>$1')
    // Handle the "For more insights" section and source links
    .replace(
      /<p>For more insights, check out:<br \/>(.*?)(?=<p>|$)/g,
      '<div class="mt-4"><span class="font-medium">For more insights, check out:</span><ul class="pl-5 mt-0">$1</ul></div>'
    )
     // Convert bullets to list items, preserving links and source types
     .replace(/•\s*(<a.*?<\/a>)(\s*\([^)]*\))?/g, '<li>$1$2</li>')
    // Clean up any line breaks between bullet points
    .replace(/(<\/li>)\s*<br \/>\s*(•|<li>)/g, '$1$2');
};

interface ChatMessageProps {
  message: Message;
  displayContent?: string;
  onFeedbackSubmitted: (message: Message) => void;
}

export default function ChatMessage({ message, displayContent, onFeedbackSubmitted }: ChatMessageProps) {
  const content = displayContent || message.finalResponse || '';

  return (
    <Card className="overflow-hidden border-gray-200">
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="font-medium text-threshold-text-primary mb-2">Your Question</h3>
          <p className="text-threshold-text-secondary">{message.query}</p>
        </div>

        <div>
          <h3 className="font-medium text-threshold-text-primary mb-2">Heidi's Response</h3>
          <div 
            className="prose prose-gray max-w-none prose-p:text-threshold-text-secondary prose-headings:text-threshold-text-primary
            prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-a:no-underline prose-p:my-3"
            dangerouslySetInnerHTML={{ __html: formatResponse(content) }}
          />
        </div>

        <Feedback 
          messageId={message.id} 
          onFeedbackSubmitted={onFeedbackSubmitted}
        />

        {/* Temporarily commented out for re-evaluation
        {message.metadata?.displayEntries && (
          <RelatedInsights insights={message.metadata.displayEntries} />
        )}
        */}
      </CardContent>
    </Card>
  );
}