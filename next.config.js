const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude the 'fs' module when bundling the client-side code
      config.node = {
        fs: 'empty'
      }
    }
    return config
  }
}

module.exports = nextConfig
