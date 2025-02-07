import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
}

export function SEO({ 
  title = "EtsyBoost - Free Etsy Tag & SEO Generator",
  description = "Boost your Etsy listings with our free tag generator and SEO optimization tool. Get smart tag suggestions and SEO tips to increase your shop's visibility.",
  keywords = ["etsy tags", "etsy seo", "etsy tag generator", "etsy optimization", "etsy seller tools"],
  canonicalUrl = "https://etsyboost.com",
  ogImage = "/og-image.png"
}: SEOProps) {
  const fullTitle = title === "EtsyBoost - Free Etsy Tag & SEO Generator" 
    ? title 
    : `${title} | EtsyBoost`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "EtsyBoost",
          "description": description,
          "url": canonicalUrl,
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Any",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        })}
      </script>
    </Helmet>
  );
}
