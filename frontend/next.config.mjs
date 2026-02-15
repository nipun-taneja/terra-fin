/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid intermittent ENOENT rename warnings on Windows .next cache packs.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
