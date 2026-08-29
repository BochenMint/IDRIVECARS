/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Galerie to statyczne WEBP — długie cache'owanie zoptymalizowanych wariantów.
    minimumCacheTTL: 2678400
  },
  async redirects() {
    return [
      {
        source: "/testy/citroen-c3",
        destination: "/testy/citroen-c3-16-vti-exclusive-2",
        permanent: true
      }
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()"
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload"
      }
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      // Niezmienne zasoby galerii — agresywny cache.
      {
        source: "/galleries/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      }
    ];
  }
};

export default nextConfig;
