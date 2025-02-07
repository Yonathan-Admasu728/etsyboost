import { ScoredTag } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TagHeatmapProps {
  tags: ScoredTag[];
  className?: string;
}

export function TagHeatmap({ tags, className }: TagHeatmapProps) {
  // Helper function to get background color intensity based on score
  const getHeatmapColor = (score: number) => {
    // Use primary color with varying opacity based on score
    if (score >= 9) return "bg-primary/90";
    if (score >= 8) return "bg-primary/70";
    if (score >= 7) return "bg-primary/50";
    if (score >= 6) return "bg-primary/30";
    return "bg-primary/20";
  };

  // Helper function to get text color based on background intensity
  const getTextColor = (score: number) => {
    return score >= 8 ? "text-primary-foreground" : "text-primary";
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {tags.map(({ text, score, emoji }, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "p-3 rounded-lg transition-colors duration-200 cursor-help",
                    getHeatmapColor(score),
                    getTextColor(score)
                  )}
                >
                  <div className="text-sm font-medium truncate">
                    {emoji} #{text}
                  </div>
                  <div className="text-xs opacity-90 mt-1">
                    Score: {score.toFixed(1)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Relevance Score: {score.toFixed(1)}/10</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Higher scores indicate more impactful tags
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}