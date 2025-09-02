import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  siteName?: string;
}

const defaultSEO = {
  title: 'Covoit Sports by LtheBest - Covoiturage Sportif',
  description: 'Plateforme de covoiturage pour les événements sportifs. Organisez facilement le transport de vos équipes et participants.',
  keywords: 'covoiturage, sport, événements sportifs, transport, équipe, organisateur, participants',
  image: '/og-image.jpg',
  url: 'https://sportpool.onrender.com',
  type: 'website',
  author: 'LtheBest',
  siteName: 'Covoit Sports'
};

export default function SEOHead({ 
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  siteName
}: SEOProps) {
  const seoData = {
    title: title || defaultSEO.title,
    description: description || defaultSEO.description,
    keywords: keywords || defaultSEO.keywords,
    image: image || defaultSEO.image,
    url: url || defaultSEO.url,
    type,
    author: author || defaultSEO.author,
    siteName: siteName || defaultSEO.siteName
  };

  useEffect(() => {
    // Mise à jour du titre de la page
    document.title = seoData.title;

    // Fonction pour mettre à jour ou créer une meta tag
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      
      tag.setAttribute('content', content);
    };

    // Meta tags basiques
    updateMetaTag('description', seoData.description);
    updateMetaTag('keywords', seoData.keywords);
    updateMetaTag('author', seoData.author);
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph meta tags
    updateMetaTag('og:title', seoData.title, true);
    updateMetaTag('og:description', seoData.description, true);
    updateMetaTag('og:image', seoData.image, true);
    updateMetaTag('og:url', seoData.url, true);
    updateMetaTag('og:type', seoData.type, true);
    updateMetaTag('og:site_name', seoData.siteName, true);
    updateMetaTag('og:locale', 'fr_FR', true);

    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seoData.title);
    updateMetaTag('twitter:description', seoData.description);
    updateMetaTag('twitter:image', seoData.image);
    updateMetaTag('twitter:creator', '@' + seoData.author);

    // Liens canoniques
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', seoData.url);

    // Favicon et icons
    const updateIcon = (rel: string, href: string, sizes?: string) => {
      let icon = document.querySelector(`link[rel="${rel}"]`);
      if (!icon) {
        icon = document.createElement('link');
        icon.setAttribute('rel', rel);
        document.head.appendChild(icon);
      }
      icon.setAttribute('href', href);
      if (sizes) icon.setAttribute('sizes', sizes);
    };

    updateIcon('icon', '/favicon.ico');
    updateIcon('apple-touch-icon', '/apple-touch-icon.png', '180x180');
    updateIcon('icon', '/favicon-32x32.png', '32x32');
    updateIcon('icon', '/favicon-16x16.png', '16x16');

    // Manifeste pour PWA
    let manifest = document.querySelector('link[rel="manifest"]');
    if (!manifest) {
      manifest = document.createElement('link');
      manifest.setAttribute('rel', 'manifest');
      manifest.setAttribute('href', '/site.webmanifest');
      document.head.appendChild(manifest);
    }

    // Schema.org structured data
    const updateStructuredData = () => {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": seoData.siteName,
        "description": seoData.description,
        "url": seoData.url,
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "author": {
          "@type": "Person",
          "name": seoData.author
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "150"
        }
      };

      script.textContent = JSON.stringify(structuredData);
    };

    updateStructuredData();

  }, [seoData]);

  return null;
}