import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { watermarkValidationSchema, type WatermarkRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthForm } from "@/components/ui/AuthForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadIcon, ImageIcon, VideoIcon, CrownIcon } from "lucide-react";

export function WatermarkTool() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<WatermarkRequest>({
    resolver: zodResolver(watermarkValidationSchema),
    defaultValues: {
      watermarkText: "",
      position: "bottom-right",
      opacity: 0.5,
    },
  });

  const onSubmit = async (data: WatermarkRequest) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("watermarkText", data.watermarkText);
      formData.append("position", data.position);
      formData.append("opacity", data.opacity.toString());

      const response = await fetch("/api/watermark", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.type === "credits_exceeded") {
          toast({
            title: "Insufficient Credits",
            description: user?.isPremium 
              ? "An error occurred while processing your request." 
              : "You've reached your daily limit. Upgrade to premium for unlimited watermarks!",
            variant: "destructive",
          });
          return;
        }
        throw new Error(error.error || "Failed to process watermark");
      }

      const result = await response.blob();
      const url = URL.createObjectURL(result);
      setPreview(url);

      toast({
        title: "Success!",
        description: "Your watermarked file is ready to download.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create watermark. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // If user is not authenticated, show the auth form
  if (!user) {
    return <AuthForm />;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold">Watermark Tool</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add professional watermarks to your images and videos
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              {user.isPremium && (
                <div className="flex items-center text-primary">
                  <CrownIcon className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Premium</span>
                </div>
              )}
            </div>
            {!user.isPremium && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Credits Remaining:</p>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">{user.credits.image}</span>
                  <VideoIcon className="w-4 h-4 ml-2" />
                  <span className="text-sm">{user.credits.video}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {/* TODO: Implement upgrade flow */}}
                >
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Upload File</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="dropzone-file"
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadIcon className="w-8 h-8 mb-4 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Images (PNG, JPG) or Videos (MP4)
                          </p>
                        </div>
                        <input
                          id="dropzone-file"
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,video/mp4"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          }}
                          {...field}
                        />
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="watermarkText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Watermark Text</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your watermark text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="opacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opacity</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isUploading}>
              {isUploading ? (
                <>
                  <UploadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Add Watermark"
              )}
            </Button>
          </form>
        </Form>

        {preview && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Preview</h3>
            {preview.includes("video") ? (
              <video
                src={preview}
                controls
                className="w-full rounded-lg"
              />
            ) : (
              <img
                src={preview}
                alt="Watermarked preview"
                className="w-full rounded-lg"
              />
            )}
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => {
                const a = document.createElement("a");
                a.href = preview;
                a.download = "watermarked-file";
                a.click();
              }}
            >
              Download
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}