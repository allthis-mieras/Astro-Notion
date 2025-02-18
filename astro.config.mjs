import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  experimental: {
    contentLayer: true
  },
  site: 'https://your-domain.com',
  server: {
    port: 4321,
    host: true
  },
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
    ],
  },
});