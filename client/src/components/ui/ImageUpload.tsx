import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, UploadIcon, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onUpload: (file: File) => Promise<void>;
  isProcessing?: boolean;
}

export function ImageUpload({ onUpload, isProcessing = false }: ImageUploadProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      await onUpload(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    }
  }, [onUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
          `}
        >
          <input {...getInputProps()} />
          
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Preview"
                className="max-h-[300px] mx-auto rounded-lg shadow-sm"
              />
              {!isProcessing && (
                <p className="text-center text-sm text-muted-foreground">
                  Click or drag to upload a different image
                </p>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">
                  {isDragActive ? "Drop your image here" : "Upload your product image"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drop your image here or click to browse
                </p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2Icon className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
