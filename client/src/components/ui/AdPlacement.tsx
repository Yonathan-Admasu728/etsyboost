import { cn } from "@/lib/utils";

interface AdPlacementProps {
  className?: string;
}

export function AdPlacement({ className }: AdPlacementProps) {
  return (
    <div 
      className={cn(
        "w-full h-[120px] bg-accent/20 rounded-lg flex items-center justify-center",
        className
      )}
    >
      <span className="text-muted-foreground">Advertisement</span>
    </div>
  );
}
