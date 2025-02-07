import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { AdPlacement } from "@/components/ui/AdPlacement";
import { RocketIcon, TagIcon, ImageIcon, PaletteIcon } from "lucide-react";
import { SEO } from "@/components/ui/seo";

export default function Home() {
  return (
    <>
      <SEO 
        title="EtsyBoost - Free Etsy Tools for Sellers"
        description="Boost your Etsy shop with our free seller tools. Generate optimized tags, create watermarks, and design brand color palettes to enhance your listings."
        keywords={[
          "etsy tags",
          "etsy seo",
          "etsy watermark",
          "etsy branding",
          "etsy color palette",
          "etsy seller tools",
          "free etsy tools"
        ]}
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/10">
        <div className="container mx-auto px-4 py-16">
          <header className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              EtsyBoost
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Free Tools for Etsy Sellers
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="relative overflow-hidden group">
              <CardContent className="pt-6">
                <TagIcon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Tag Generator</h3>
                <p className="text-muted-foreground mb-6">
                  Get optimized tags with relevance scores and emoji suggestions for your listings.
                </p>
                <Link href="/tool?tab=tags">
                  <Button className="w-full group-hover:bg-primary/90">
                    Generate Tags
                    <RocketIcon className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
              <CardContent className="pt-6">
                <ImageIcon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Watermark Tool</h3>
                <p className="text-muted-foreground mb-6">
                  Protect your images and videos with custom watermarks. Maintain brand consistency.
                </p>
                <Link href="/tool?tab=watermark">
                  <Button className="w-full group-hover:bg-primary/90">
                    Create Watermark
                    <ImageIcon className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
              <CardContent className="pt-6">
                <PaletteIcon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Brand Colors</h3>
                <p className="text-muted-foreground mb-6">
                  Generate beautiful color palettes for your shop. Create a cohesive brand identity.
                </p>
                <Link href="/tool?tab=branding">
                  <Button className="w-full group-hover:bg-primary/90">
                    Design Colors
                    <PaletteIcon className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <AdPlacement className="mt-8" />
        </div>
      </div>
    </>
  );
}