import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

// Define the loading stages with optimized wording
const LOADING_STAGES = [
  { message: "Reading question...", duration: 1000 },
  { message: "Searching advice library...", duration: 3000 },
  { message: "Analyzing relevant insights...", duration: 3000 },
  { message: "Formulating response...", duration: 3000 },
  { message: "Finalizing advice...", duration: 2000 } // This stage continues until response is available
];

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  isSuccess?: boolean;
}

export default function ChatInput({ onSubmit, isLoading, isSuccess }: ChatInputProps) {
  const [query, setQuery] = useState("");
  const [currentStage, setCurrentStage] = useState(0);
  const stageTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Calculate progress percentage for the progress bar
  const calculateProgress = () => {
    if (!isLoading) return 0;
    
    const totalDuration = LOADING_STAGES.reduce((sum, stage) => sum + stage.duration, 0);
    const completedDuration = LOADING_STAGES
      .slice(0, currentStage)
      .reduce((sum, stage) => sum + stage.duration, 0);
    
    // Add partial progress from current stage
    const elapsedInCurrentStage = LOADING_STAGES[currentStage]?.duration || 0;
    
    // If on last stage, cap at 98% until actually complete
    if (currentStage === LOADING_STAGES.length - 1) {
      return 98;
    }
    
    const progress = ((completedDuration + elapsedInCurrentStage) / totalDuration) * 100;
    return Math.min(progress, 98); // Cap at 98% until actually complete
  };

  // Clear input when success state changes to true
  useEffect(() => {
    if (isSuccess) {
      setQuery("");
    }
  }, [isSuccess]);

  // Set up the staged loading sequence when loading starts
  useEffect(() => {
    if (isLoading) {
      setCurrentStage(0);
      stageTimersRef.current = [];
      
      // Schedule each stage transition (except the last one)
      let cumulativeTime = 0;
      
      LOADING_STAGES.forEach((stage, index) => {
        // Skip first stage (we start there) and don't set timer for last stage
        if (index === 0 || index === LOADING_STAGES.length - 1) return; 
        
        cumulativeTime += LOADING_STAGES[index - 1].duration;
        
        const timer = setTimeout(() => {
          setCurrentStage(index);
        }, cumulativeTime);
        
        stageTimersRef.current.push(timer);
      });

      // Set the last stage after all other stages complete
      const lastStageTimer = setTimeout(() => {
        setCurrentStage(LOADING_STAGES.length - 1);
        // This stage will continue until isLoading becomes false
      }, cumulativeTime + LOADING_STAGES[LOADING_STAGES.length - 2].duration);
      
      stageTimersRef.current.push(lastStageTimer);
      
      return () => {
        // Clean up all timers when component unmounts or loading stops
        stageTimersRef.current.forEach(timer => clearTimeout(timer));
      };
    } else {
      // Reset when loading stops
      setCurrentStage(0);
    }
  }, [isLoading]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim() && !isLoading) {
          onSubmit(query);
        }
      }}
      className="space-y-4"
    >
      <Textarea
        placeholder="Ask a specific startup question (e.g., 'When should I raise funding?', 'How do I know when to pivot?')"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (query.trim() && !isLoading) {
              onSubmit(query);
            }
          }
        }}
        className="min-h-[100px] resize-none rounded-xl border-gray-100 focus:border-threshold-orange focus:ring focus:ring-threshold-orange/20 placeholder:text-threshold-text-muted placeholder:text-center focus:placeholder-transparent"
      />
      <Button
        type="submit"
        className="w-full relative overflow-hidden"
        disabled={!query.trim() || isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="mr-2 relative">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div className="absolute inset-0 bg-threshold-orange/10 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="animate-fadeIn">
              {LOADING_STAGES[currentStage].message}
            </span>
          </div>
        ) : (
          "Ask Heidi"
        )}
      </Button>
      
      {isLoading && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
          <div 
            className="h-full bg-threshold-orange rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${calculateProgress()}%`,
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
      )}
    </form>
  );
}
