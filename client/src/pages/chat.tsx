import { Card } from "@/components/ui/card";
import ChatInput from "@/components/chat/chat-input";
import ChatMessage from "@/components/chat/chat-message";
import LoadingMessage from "@/components/chat/loading-message";
import { Message } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Shared formatting function for consistent styling
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
    // Convert bullets to list items, preserving links
    .replace(/•\s*(<a.*?<\/a>)/g, '<li>$1</li>');
};

export default function Chat() {
  const [message, setMessage] = useState<Message | null>(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (query: string) => {
      setIsStreamComplete(false); // Reset at start of new query
      return new Promise<Message>((resolve, reject) => {
        // First create the message via POST
        fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        }).then(() => {
          // Then establish SSE connection
          const eventSource = new EventSource('/api/chat/stream');
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              switch (data.type) {
                case 'init':
                  // Message created, waiting for content
                  setMessage({
                    id: data.messageId,
                    query,
                    stage1Response: null,
                    finalResponse: null,
                    metadata: null,
                    thumbsUp: null,
                    feedback: null,
                    createdAt: null
                  });
                  break;
                  
                case 'content':
                  setStreamedContent(prev => formatResponse(prev + data.content));
                  break;
                  
                case 'complete':
                  eventSource.close();
                  setStreamedContent(''); // Clear streamed content
                  setMessage(data.message);
                  setIsStreamComplete(true); // Set true only when stream is complete
                  resolve(data.message);
                  break;
                  
                case 'error':
                  eventSource.close();
                  setStreamedContent(''); // Clear streamed content
                  setIsStreamComplete(false);
                  reject(new Error(data.error));
                  break;
              }
            } catch (err) {
              console.error('Error processing SSE message:', err);
              eventSource.close();
              reject(new Error('Failed to process server message'));
            }
          };

          eventSource.onerror = (err) => {
            console.error('EventSource error:', err);
            eventSource.close();
            setStreamedContent(''); // Clear streamed content
            reject(new Error('EventSource connection failed'));
          };
        }).catch(err => {
          console.error('Failed to create message:', err);
          reject(new Error('Failed to create message'));
        });
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="mx-auto max-w-3xl relative pb-12">
        <Card className="mb-6 p-6">
          <ChatInput
            onSubmit={(query) => mutation.mutate(query)}
            isLoading={mutation.isPending}
            isSuccess={isStreamComplete}
          />
        </Card>

        {mutation.isPending && streamedContent && (
          <Card className="mb-4 p-6">
            <div 
              className="prose prose-gray max-w-none prose-p:text-threshold-text-secondary prose-headings:text-threshold-text-primary prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-a:no-underline prose-p:my-3"
              dangerouslySetInnerHTML={{ __html: streamedContent }} 
            />
          </Card>
        )}

        {message && !mutation.isPending && (
          <ChatMessage
            message={message}
            onFeedbackSubmitted={setMessage}
          />
        )}

        {isStreamComplete && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/90 backdrop-blur-sm border-t text-center">
            <p className="text-xs text-gray-400 max-w-3xl mx-auto">
              May cite past market data and adapt advice. See sources for full context.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}