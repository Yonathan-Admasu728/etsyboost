import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AdPlacementProps {
  className?: string;
  position?: "top" | "bottom" | "inline";
  size?: "small" | "medium" | "large";
}

export function AdPlacement({ 
  className,
  position = "inline",
  size = "medium" 
}: AdPlacementProps) {
  const [impressionLogged, setImpressionLogged] = useState(false);

  // Reduced height for each size
  const sizeClasses = {
    small: "h-[60px]", // Reduced from 90px
    medium: "h-[90px]", // Reduced from 120px
    large: "h-[180px]", // Reduced from 250px
  };

  // Adjusted padding and margin
  const positionClasses = {
    top: "mt-2 mb-6", // Reduced top margin
    bottom: "mt-6 mb-2",
    inline: "my-6",
  };

  // Log impression mutation
  const logImpression = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/analytics/impression", {
        type: "ad",
        position,
        size,
      });
    },
  });

  // Use Intersection Observer to track when ad becomes visible
  useEffect(() => {
    if (impressionLogged) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            logImpression.mutate();
            setImpressionLogged(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`ad-${position}-${size}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [position, size, impressionLogged]);

  return (
    <div 
      id={`ad-${position}-${size}`}
      className={cn(
        "w-full bg-accent/10 rounded-lg flex items-center justify-center relative overflow-hidden border border-accent/20 backdrop-blur-sm",
        sizeClasses[size],
        positionClasses[position],
        className
      )}
    >
      <span className="text-sm text-muted-foreground/70">Advertisement</span>
      {/* Future: Add actual ad code here */}
    </div>
  );
}