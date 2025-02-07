import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { CopyIcon, CheckIcon, RefreshCw } from "lucide-react";

interface ColorPaletteProps {
  baseColor?: string;
}

type ColorScheme = {
  name: string;
  colors: string[];
};

export function ColorPalette({ baseColor = "#0285FF" }: ColorPaletteProps) {
  const { toast } = useToast();
  const [primaryColor, setPrimaryColor] = useState(baseColor);
  const [copied, setCopied] = useState<string | null>(null);

  // Convert hex to HSL
  const hexToHSL = (hex: string): [number, number, number] => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  };

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Generate color schemes
  const generateColorSchemes = useCallback((): ColorScheme[] => {
    const [h, s, l] = hexToHSL(primaryColor);

    // Analogous colors
    const analogous = [
      hslToHex((h - 30 + 360) % 360, s, l),
      primaryColor,
      hslToHex((h + 30) % 360, s, l),
    ];

    // Complementary colors
    const complementary = [
      primaryColor,
      hslToHex((h + 180) % 360, s, l),
    ];

    // Monochromatic colors
    const monochromatic = [
      hslToHex(h, s, Math.max(0, l - 30)),
      primaryColor,
      hslToHex(h, s, Math.min(100, l + 30)),
    ];

    // Triadic colors
    const triadic = [
      primaryColor,
      hslToHex((h + 120) % 360, s, l),
      hslToHex((h + 240) % 360, s, l),
    ];

    return [
      { name: "Primary", colors: [primaryColor] },
      { name: "Analogous", colors: analogous },
      { name: "Complementary", colors: complementary },
      { name: "Monochromatic", colors: monochromatic },
      { name: "Triadic", colors: triadic },
    ];
  }, [primaryColor]);

  const copyColor = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopied(color);
      toast({
        title: "Color Copied!",
        description: `${color} has been copied to your clipboard.`,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy color. Please try again.",
        variant: "destructive",
      });
    }
  };

  const randomizeColor = () => {
    const randomHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    setPrimaryColor(randomHex);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Brand Color Palette</h2>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-8 p-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={randomizeColor}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Random
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {generateColorSchemes().map((scheme) => (
            <div key={scheme.name}>
              <h3 className="text-sm font-medium mb-2">{scheme.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {scheme.colors.map((color, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => copyColor(color)}
                          className="group relative h-20 rounded-lg overflow-hidden border transition-all hover:scale-105"
                          style={{ backgroundColor: color }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            {copied === color ? (
                              <CheckIcon className="w-5 h-5 text-white" />
                            ) : (
                              <CopyIcon className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to copy: {color}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Preview</h3>
          <div className="space-y-2 p-4 rounded-lg border" style={{ backgroundColor: primaryColor + '10' }}>
            <div className="space-y-2">
              <h4 className="text-lg font-semibold" style={{ color: primaryColor }}>
                Sample Heading
              </h4>
              <p className="text-sm">
                This is how your text will look with the selected color scheme.
              </p>
              <Button style={{ backgroundColor: primaryColor }}>
                Sample Button
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
