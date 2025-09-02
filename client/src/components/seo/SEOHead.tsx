import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event';
  locale?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
  children?: React.ReactNode;
}

export function SEOHead({
  title = 'SportPool - Covoiturage Sportif',
  description = 'Plateforme de covoiturage pour événements sportifs. Organisez et participez facilement aux événements sportifs avec du covoiturage intelligent.',
  keywords = 'covoiturage, sport, événements, transport, communauté, organisation',
  image = '/og-image.jpg',
  url = 'https://sportpool.onrender.com',
  type = 'website',
  locale = 'fr_FR',
  siteName = 'SportPool',
  author = 'SportPool Team',
  publishedTime,
  modifiedTime,
  noIndex = false,
  children
}: SEOHeadProps) {
  const fullTitle = title.includes('SportPool') ? title : `${title} - SportPool`;
  const canonicalUrl = url.startsWith('http') ? url : `https://sportpool.onrender.com${url}`;
  const imageUrl = image.startsWith('http') ? image : `https://sportpool.onrender.com${image}`;

  return (
    <Helmet>
      {/* Title */}
      <title>{fullTitle}</title>

      {/* Meta de base */}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:locale" content={locale} />
      <meta property="og:site_name" content={siteName} />

      {/* Dates pour les articles */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:site" content="@SportPool" />
      <meta name="twitter:creator" content="@SportPool" />

      {/* Données structurées JSON-LD pour les événements */}
      {type === 'event' && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            "name": title,
            "description": description,
            "url": canonicalUrl,
            "image": imageUrl,
            "organizer": {
              "@type": "Organization",
              "name": siteName,
              "url": "https://sportpool.onrender.com"
            }
          })}
        </script>
      )}

      {/* Données structurées pour l'organisation */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": siteName,
          "url": "https://sportpool.onrender.com",
          "logo": "https://sportpool.onrender.com/logo.png",
          "description": "Plateforme de covoiturage pour événements sportifs",
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "email": "contact@sportpool.com"
          }
        })}
      </script>

      {/* WebSite structured data pour la recherche */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": siteName,
          "url": "https://sportpool.onrender.com",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://sportpool.onrender.com/recherche?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}
      </script>

      {/* Preconnect vers des domaines externes pour améliorer les performances */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      {/* Meta pour mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta name="theme-color" content="#3B82F6" />

      {/* Meta pour les PWA */}
      <meta name="application-name" content={siteName} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      {/* Favicon et icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />

      {/* Contenu personnalisé */}
      {children}
    </Helmet>
  );
}

// Hook personnalisé pour les métadonnées SEO dynamiques
export function useSEO(pageData: Partial<SEOHeadProps> = {}) {
  return {
    SEOHead: (props: SEOHeadProps) => <SEOHead {...pageData} {...props} />,
    generateEventSEO: (eventName: string, eventDate: string, location: string) => ({
      title: `${eventName} - Événement SportPool`,
      description: `Rejoignez l'événement ${eventName} le ${new Date(eventDate).toLocaleDateString('fr-FR')} à ${location}. Covoiturage organisé par SportPool.`,
      keywords: `${eventName}, événement sportif, covoiturage, ${location}, sport`,
      type: 'event' as const,
      publishedTime: new Date().toISOString()
    }),
    generateProfileSEO: (organizationName: string) => ({
      title: `${organizationName} - Profil Organisateur`,
      description: `Découvrez les événements organisés par ${organizationName} sur SportPool.`,
      keywords: `${organizationName}, organisateur, événements sportifs`,
      noIndex: true // Profils privés non indexés
    })
  };
}

export default SEOHead;