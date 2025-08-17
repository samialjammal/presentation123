// API Configuration for different environments
const config = {
  // Development environment
  development: {
    apiUrl: 'http://localhost:3001'
  },
  // Production environment
  production: {
    apiUrl: process.env.REACT_APP_API_URL || 'https://your-railway-backend-url.up.railway.app'
  }
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';

// Export the appropriate configuration
export const apiConfig = config[environment];

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${apiConfig.apiUrl}${endpoint}`;
};

export default config;
