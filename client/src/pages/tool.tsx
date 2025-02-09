import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { generateTagsSchema, type GenerateTagsRequest, type ScoredTag } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AdPlacement } from "@/components/ui/AdPlacement";
import { SEOTips } from "@/components/ui/SEOTips";
import { TagHeatmap } from "@/components/ui/TagHeatmap";
import { SocialPreview } from "@/components/ui/SocialPreview";
import { ColorPalette } from "@/components/ui/ColorPalette";
import { WatermarkTool } from "@/components/ui/WatermarkTool";
import { apiRequest } from "@/lib/queryClient";
import { Loader2Icon, CopyIcon, CheckIcon, ListIcon, GridIcon } from "lucide-react";
import { SEO } from "@/components/ui/seo";
import { SocialPostGenerator } from "@/components/ui/SocialPostGenerator";

const categories = [
  "Jewelry",
  "Art",
  "Clothing",
  "Home Decor",
  "Toys",
  "Craft Supplies",
  "Vintage",
];

type ViewMode = "list" | "heatmap";

export default function Tool() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || 'tags';

  return (
    <>
      <SEO
        title="Etsy Seller Tools - Tags, Watermarks & Brand Colors"
        description="Free tools for Etsy sellers: Generate optimized tags, create watermarks, and design brand color palettes. Boost your shop's visibility and brand consistency."
        keywords={[
          "etsy tag generator",
          "etsy watermark tool",
          "etsy branding",
          "etsy color palette",
          "etsy seller tools",
          "etsy shop optimization",
          "free etsy tools",
          "social media generator"
        ]}
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tags">Tag Generator</TabsTrigger>
              <TabsTrigger value="watermark">Watermark Tool</TabsTrigger>
              <TabsTrigger value="social">Social Posts</TabsTrigger>
              <TabsTrigger value="branding">Brand Colors</TabsTrigger>
            </TabsList>

            <TabsContent value="tags">
              <TagGenerator />
            </TabsContent>

            <TabsContent value="watermark">
              <div className="space-y-8">
                <WatermarkTool />
                <AdPlacement />
              </div>
            </TabsContent>

            <TabsContent value="social">
              <div className="space-y-8">
                <SocialPostGenerator />
                <AdPlacement />
              </div>
            </TabsContent>

            <TabsContent value="branding">
              <div className="space-y-8">
                <ColorPalette />
                <AdPlacement />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

function TagGenerator() {
  const { toast } = useToast();
  const [results, setResults] = useState<{ tags: ScoredTag[], seoTips: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "heatmap">("list");

  const form = useForm<GenerateTagsRequest>({
    resolver: zodResolver(generateTagsSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: GenerateTagsRequest) => {
      const res = await apiRequest("POST", "/api/generate-tags", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      toast({
        title: "Tags Generated!",
        description: "Your tags and SEO tips have been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate tags. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GenerateTagsRequest) => {
    mutation.mutate(data);
  };

  const getTagColor = (score: number) => {
    if (score >= 9) return "bg-primary/20 text-primary border-primary";
    if (score >= 7) return "bg-accent/20 text-accent-foreground border-accent";
    return "bg-muted/50 text-muted-foreground border-muted";
  };

  const copyAllTags = async (includeEmojis: boolean) => {
    if (!results?.tags) return;

    const tagText = results.tags
      .map(({ text, emoji }) => includeEmojis ? `${emoji} #${text}` : `#${text}`)
      .join(' ');

    try {
      await navigator.clipboard.writeText(tagText);
      setCopied(true);
      toast({
        title: "Tags Copied!",
        description: `Tags ${includeEmojis ? 'with emojis ' : ''}have been copied to your clipboard.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy tags. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your listing title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your listing description"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Tags"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {results && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Generated Tags</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tags are sorted by relevance score (1-10). Higher scores indicate more impactful tags.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === "list" ? "heatmap" : "list")}
                    className="flex items-center gap-2"
                  >
                    {viewMode === "list" ? (
                      <>
                        <GridIcon className="h-4 w-4" />
                        Show Heatmap
                      </>
                    ) : (
                      <>
                        <ListIcon className="h-4 w-4" />
                        Show List
                      </>
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                        Copy Tags
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => copyAllTags(false)}>
                        Copy Tags Only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyAllTags(true)}>
                        Copy Tags with Emojis
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {viewMode === "list" ? (
                <div className="flex flex-wrap gap-2">
                  {results.tags.map(({ text, score, emoji }, index) => (
                    <div
                      key={index}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getTagColor(score)} transition-colors duration-200`}
                      title={`Relevance Score: ${score.toFixed(1)}/10`}
                    >
                      {emoji} #{text}
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-background/50 text-xs">
                        {score.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <TagHeatmap tags={results.tags} className="mt-4" />
              )}
            </CardContent>
          </Card>
          <SEOTips tips={results.seoTips} />
          <SocialPreview
            title={form.getValues("title")}
            description={form.getValues("description")}
            tags={results.tags}
          />
        </>
      )}
      <AdPlacement />
    </div>
  );
}