import { Card, CardContent } from "@/components/ui/card";
import { CheckCircleIcon } from "lucide-react";

interface SEOTipsProps {
  tips: string[];
}

export function SEOTips({ tips }: SEOTipsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">SEO Tips</h2>
        <ul className="space-y-3">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircleIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
