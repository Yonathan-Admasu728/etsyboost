import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { generateTagsSchema, type GenerateTagsRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdPlacement } from "@/components/ui/AdPlacement";
import { SEOTips } from "@/components/ui/SEOTips";
import { apiRequest } from "@/lib/queryClient";
import { Loader2Icon } from "lucide-react";

const categories = [
  "Jewelry",
  "Art",
  "Clothing",
  "Home Decor",
  "Toys",
  "Craft Supplies",
  "Vintage",
];

export default function Tool() {
  const { toast } = useToast();
  const [results, setResults] = useState<{ tags: string[], seoTips: string[] } | null>(null);

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
        description: "Scroll down to see your optimized tags and SEO tips.",
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Generate Etsy Tags</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
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
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Generated Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {results.tags.map((tag, index) => (
                    <div
                      key={index}
                      className="bg-accent px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <SEOTips tips={results.seoTips} />
          </div>
        )}
      </div>

      <AdPlacement className="mt-8" />
    </div>
  );
}
