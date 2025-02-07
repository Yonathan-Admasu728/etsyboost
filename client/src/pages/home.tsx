import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { AdPlacement } from "@/components/ui/AdPlacement";
import { RocketIcon, TagIcon, SearchIcon } from "lucide-react";
import { SEO } from "@/components/ui/seo";

export default function Home() {
  return (
    <>
      <SEO 
        title="EtsyBoost - Free Etsy Tag & SEO Generator"
        description="Generate optimized tags for your Etsy listings with our free tool. Boost your shop's visibility with smart tag suggestions and SEO optimization tips."
        keywords={[
          "etsy tags",
          "etsy seo",
          "etsy tag generator",
          "etsy optimization",
          "free etsy tools",
          "etsy seller tools",
          "etsy listing optimization"
        ]}
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/10">
        <div className="container mx-auto px-4 py-16">
          <header className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              EtsyBoost
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Free Etsy Tag & SEO Generator
            </p>
            <Link href="/tool">
              <Button size="lg" className="animate-pulse">
                Generate My Etsy Tags Now
                <RocketIcon className="ml-2" />
              </Button>
            </Link>
          </header>

          <AdPlacement className="my-8" />

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardContent className="pt-6">
                <TagIcon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Smart Tag Generation</h3>
                <p className="text-muted-foreground">
                  Get relevant tags based on your listing details using our intelligent algorithm.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <SearchIcon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">SEO Optimization</h3>
                <p className="text-muted-foreground">
                  Receive personalized SEO tips to improve your listing visibility.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <RocketIcon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Boost Sales</h3>
                <p className="text-muted-foreground">
                  Increase your chances of being discovered by potential buyers.
                </p>
              </CardContent>
            </Card>
          </div>

          <AdPlacement className="mt-8" />
        </div>
      </div>
    </>
  );
}