import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { type GenerateSocialPostRequest, generateSocialPostSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2Icon, Share2Icon, InstagramIcon, FacebookIcon } from "lucide-react";
import { SiPinterest } from "react-icons/si";
import { SEO } from "@/components/ui/seo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const platforms = [
  { id: "instagram", name: "Instagram", icon: InstagramIcon },
  { id: "facebook", name: "Facebook", icon: FacebookIcon },
  { id: "pinterest", name: "Pinterest", icon: SiPinterest },
];

interface SocialPostPreviewProps {
  platform: string;
  title: string;
  description: string;
  tags?: Array<{ text: string; emoji: string }>;
}

function SocialPostPreview({ platform, title, description, tags }: SocialPostPreviewProps) {
  return (
    <div className="border rounded-lg p-4 mt-4 space-y-2">
      <div className="flex items-center gap-2 mb-4">
        {platform === "instagram" && <InstagramIcon className="w-5 h-5" />}
        {platform === "facebook" && <FacebookIcon className="w-5 h-5" />}
        {platform === "pinterest" && <SiPinterest className="w-5 h-5" />}
        <span className="font-medium capitalize">{platform} Preview</span>
      </div>

      <div className="aspect-square bg-accent/10 rounded-lg mb-4 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Product Image</span>
      </div>

      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, index) => (
            <span key={index} className="text-sm text-primary">
              {tag.emoji} #{tag.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SocialPostGenerator() {
  const { toast } = useToast();
  const [preview, setPreview] = useState<GenerateSocialPostRequest | null>(null);

  const form = useForm<GenerateSocialPostRequest>({
    resolver: zodResolver(generateSocialPostSchema),
    defaultValues: {
      platform: "instagram",
      title: "",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: GenerateSocialPostRequest) => {
      try {
        const res = await apiRequest("POST", "/api/social/generate-post", data);
        if (!res.ok) {
          throw new Error("Failed to generate post");
        }
        return res.json();
      } catch (error) {
        throw new Error("Failed to generate post. Please try again.");
      }
    },
    onSuccess: (data) => {
      setPreview(data);
      toast({
        title: "Post Generated!",
        description: "Your social media post has been generated successfully.",
      });
    },
    onError: (error) => {
      setPreview(null);
      toast({
        title: "Error",
        description: error.message || "Failed to generate post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GenerateSocialPostRequest) => {
    mutation.mutate(data);
  };

  return (
    <>
      <SEO
        title="Etsy Social Media Post Generator - Create Engaging Content"
        description="Create optimized social media posts for your Etsy shop. Generate engaging content for Instagram, Facebook, and Pinterest with our AI-powered tool."
        keywords={[
          "etsy social media",
          "etsy instagram posts",
          "etsy facebook content",
          "etsy pinterest pins",
          "social media generator",
          "etsy marketing tool",
          "etsy content creator",
          "social media optimization",
          "etsy hashtags",
          "etsy post templates"
        ]}
      />
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {platforms.map((platform) => (
                            <SelectItem key={platform.id} value={platform.id}>
                              <div className="flex items-center gap-2">
                                <platform.icon className="w-4 h-4" />
                                {platform.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your post title" {...field} />
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
                          placeholder="Enter your post description"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
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
                    <>
                      Generate Post
                      <Share2Icon className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {preview && (
          <SocialPostPreview
            platform={preview.platform}
            title={preview.title}
            description={preview.description}
            tags={preview.tags}
          />
        )}
      </div>
    </>
  );
}