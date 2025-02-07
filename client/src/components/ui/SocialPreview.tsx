import { useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiFacebook, SiLinkedin, SiInstagram, SiYoutube } from "react-icons/si";
import { CloudIcon } from "lucide-react";
import { DownloadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SocialPreviewProps {
  title: string;
  description: string;
  tags: Array<{ text: string; emoji: string }>;
}

export function SocialPreview({ title, description, tags }: SocialPreviewProps) {
  const { toast } = useToast();
  const previewRefs = {
    bluesky: useRef<HTMLDivElement>(null),
    facebook: useRef<HTMLDivElement>(null),
    linkedin: useRef<HTMLDivElement>(null),
    instagram: useRef<HTMLDivElement>(null),
    youtube: useRef<HTMLDivElement>(null),
  };

  const generateImage = useCallback(async (platform: keyof typeof previewRefs) => {
    const element = previewRefs[platform].current;
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        quality: 0.95,
        backgroundColor: "#ffffff",
      });

      saveAs(dataUrl, `etsy-listing-${platform}.png`);

      toast({
        title: "Success!",
        description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} preview image downloaded.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate preview image.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">Social Media Previews</h2>
        <Tabs defaultValue="bluesky" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="bluesky" className="flex items-center gap-2">
              <CloudIcon className="w-4 h-4 text-[#0285FF]" />
              BlueSky
            </TabsTrigger>
            <TabsTrigger value="facebook" className="flex items-center gap-2">
              <SiFacebook className="w-4 h-4 text-[#1877F2]" />
              Facebook
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex items-center gap-2">
              <SiLinkedin className="w-4 h-4 text-[#0A66C2]" />
              LinkedIn
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-2">
              <SiInstagram className="w-4 h-4 text-[#E4405F]" />
              Instagram
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <SiYoutube className="w-4 h-4 text-[#FF0000]" />
              YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bluesky">
            <div className="space-y-4">
              <div
                ref={previewRefs.bluesky}
                className="bg-white p-6 rounded-lg border shadow-sm"
              >
                <h3 className="font-bold text-xl mb-2 text-[#0285FF]">{truncateText(title, 70)}</h3>
                <p className="text-gray-600 mb-4">{truncateText(description, 200)}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 5).map(({ text, emoji }, index) => (
                    <span key={index} className="text-[#0285FF]">
                      {emoji} #{text}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => generateImage("bluesky")}
                className="w-full"
                variant="outline"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download BlueSky Image
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="facebook">
            <div className="space-y-4">
              <div
                ref={previewRefs.facebook}
                className="bg-white p-6 rounded-lg border shadow-sm"
              >
                <h3 className="font-bold text-2xl mb-3 text-[#1877F2]">{truncateText(title, 100)}</h3>
                <p className="text-gray-600 mb-4">{truncateText(description, 250)}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 7).map(({ text, emoji }, index) => (
                    <span key={index} className="text-[#1877F2]">
                      {emoji} #{text}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => generateImage("facebook")}
                className="w-full"
                variant="outline"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download Facebook Image
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="linkedin">
            <div className="space-y-4">
              <div
                ref={previewRefs.linkedin}
                className="bg-white p-6 rounded-lg border shadow-sm"
              >
                <h3 className="font-bold text-2xl mb-3 text-[#0A66C2]">{truncateText(title, 120)}</h3>
                <p className="text-gray-600 mb-4 text-lg">{truncateText(description, 300)}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 6).map(({ text, emoji }, index) => (
                    <span key={index} className="text-[#0A66C2] text-lg">
                      {emoji} #{text}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => generateImage("linkedin")}
                className="w-full"
                variant="outline"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download LinkedIn Image
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="instagram">
            <div className="space-y-4">
              <div
                ref={previewRefs.instagram}
                className="bg-white p-6 rounded-lg border shadow-sm"
                style={{ aspectRatio: '1/1' }}
              >
                <h3 className="font-bold text-xl mb-3 text-[#E4405F]">{truncateText(title, 80)}</h3>
                <p className="text-gray-600 mb-4">{truncateText(description, 200)}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 8).map(({ text, emoji }, index) => (
                    <span key={index} className="text-[#E4405F]">
                      {emoji} #{text}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => generateImage("instagram")}
                className="w-full"
                variant="outline"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download Instagram Image
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="youtube">
            <div className="space-y-4">
              <div
                ref={previewRefs.youtube}
                className="bg-white p-6 rounded-lg border shadow-sm"
                style={{ aspectRatio: '16/9' }}
              >
                <h3 className="font-bold text-2xl mb-3 text-[#FF0000]">{truncateText(title, 100)}</h3>
                <p className="text-gray-600 mb-4">{truncateText(description, 250)}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 5).map(({ text, emoji }, index) => (
                    <span key={index} className="text-[#FF0000]">
                      {emoji} #{text}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => generateImage("youtube")}
                className="w-full"
                variant="outline"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download YouTube Thumbnail
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}