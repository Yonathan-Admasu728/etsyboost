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

  // Get size classes based on the size prop
  const sizeClasses = {
    small: "h-[90px]",
    medium: "h-[120px]",
    large: "h-[250px]",
  };

  // Get position classes
  const positionClasses = {
    top: "mt-0 mb-8",
    bottom: "mt-8 mb-0",
    inline: "my-8",
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
        "w-full bg-accent/20 rounded-lg flex items-center justify-center relative overflow-hidden",
        sizeClasses[size],
        positionClasses[position],
        className
      )}
    >
      <span className="text-muted-foreground">Advertisement</span>
      {/* Future: Add actual ad code here */}
    </div>
  );
}