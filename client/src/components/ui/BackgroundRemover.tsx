import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import { DownloadIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function BackgroundRemover() {
  const { toast } = useToast();
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process image");
      }

      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
    onSuccess: (imageUrl) => {
      setProcessedImage(imageUrl);
      toast({
        title: "Success!",
        description: "Background removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove background. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async () => {
    if (!processedImage) return;

    const link = document.createElement("a");
    link.href = processedImage;
    link.download = "processed-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Background Removal</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload your product photo and we'll automatically remove the background.
            Perfect for creating professional product listings!
          </p>
          
          <ImageUpload
            onUpload={(file) => mutation.mutate(file)}
            isProcessing={mutation.isPending}
          />

          {processedImage && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={processedImage}
                  alt="Processed"
                  className="max-h-[300px] w-full object-contain bg-[url('/checkered-pattern.svg')]"
                />
              </div>
              
              <Button
                onClick={handleDownload}
                className="w-full"
                variant="outline"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download Processed Image
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
