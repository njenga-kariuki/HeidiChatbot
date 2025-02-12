import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoadingMessage() {
  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">
            Processing your question through Heidi's knowledge base...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
