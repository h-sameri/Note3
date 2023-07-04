/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    fs: false,
    path: false
}

module.exports = {
    reactStrictMode: true,
    webpack5: true,
    webpack: (config) => {
        config.resolve.fallback = {fs: false, net: false, tls:false};

        return config;
    },
};