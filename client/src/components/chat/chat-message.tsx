import { Card, CardContent } from "@/components/ui/card";

interface ChatMessageProps {
  query: string;
  response: string;
}

export default function ChatMessage({ query, response }: ChatMessageProps) {
  return (
    <Card className="overflow-hidden border-gray-200">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="font-medium text-gray-900">Your Question</h3>
          <p className="mt-1 text-gray-600">{query}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-900">Heidi's Response</h3>
          <div 
            className="mt-1 prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: response }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
