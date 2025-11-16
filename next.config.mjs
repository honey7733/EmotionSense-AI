/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for faster loading and smaller bundle sizes
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: false, // Enable Next.js image optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
    ],
  },

  // Preload critical fonts
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Link',
            value: '</fonts/inter-var.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
          },
        ],
      },
    ];
  },

  // Bundle analysis for optimization insights
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor code into its own chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Separate React and Supabase into dedicated chunks
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-vendors',
              priority: 20,
              reuseExistingChunk: true,
            },
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase-vendors',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Common shared modules between chunks
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
