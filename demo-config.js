// AI Presentation Pro - Demo Configuration
// This file shows how to configure the application for free/demo usage

module.exports = {
  // Free AI Models Configuration
  freeModels: {
    'gpt-3.5-turbo': {
      name: 'GPT-3.5 Turbo',
      description: 'Fast and efficient for most presentations',
      isFree: true,
      maxTokens: 2000,
      temperature: 0.7,
      costPerToken: 0.000002, // $0.002 per 1K tokens
      dailyLimit: 1000, // requests per day
      features: ['Fast Generation', 'Good Quality', 'Reliable']
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      description: 'Enhanced creativity and structure',
      isFree: true,
      maxTokens: 2500,
      temperature: 0.7,
      costPerToken: 0.000015, // $0.015 per 1K tokens
      dailyLimit: 500, // requests per day
      features: ['Better Quality', 'Enhanced Creativity', 'Structured Output']
    },
    'claude-3-haiku': {
      name: 'Claude 3 Haiku',
      description: 'Fast and creative alternative',
      isFree: true,
      maxTokens: 2000,
      temperature: 0.7,
      costPerToken: 0.00025, // $0.25 per 1M tokens
      dailyLimit: 1000, // requests per day
      features: ['Fast Generation', 'Creative Content', 'Cost Effective']
    }
  },

  // Demo Mode Settings
  demoMode: {
    enabled: true,
    maxSlides: 10,
    maxTopics: 5,
    watermark: 'AI Presentation Pro - Demo',
    features: {
      contentGeneration: true,
      templateSelection: true,
      download: true,
      advancedOptions: false
    },
    limitations: {
      noPremiumModels: true,
      noCustomBranding: true,
      noAdvancedAnalytics: true
    }
  },

  // Free Templates (Always Available)
  freeTemplates: [
    'ai-modern',
    'ai-corporate', 
    'ai-minimal',
    'ai-tech'
  ],

  // Premium Templates (Require Subscription)
  premiumTemplates: [
    'ai-creative',
    'ai-data'
  ],

  // Usage Limits for Free Tier
  freeTierLimits: {
    presentationsPerDay: 10,
    slidesPerPresentation: 15,
    maxTopicLength: 200,
    storageLimit: '100MB',
    retentionDays: 7
  },

  // Demo Content Examples
  demoTopics: [
    'Digital Transformation Strategy',
    'AI in Healthcare',
    'Sustainable Business Practices',
    'Remote Work Best Practices',
    'Customer Experience Optimization'
  ],

  // Demo Audiences
  demoAudiences: [
    'General business audience',
    'Executives and C-level',
    'Technical team',
    'Sales and marketing',
    'Students and educators'
  ],

  // Demo Styles
  demoStyles: [
    'Professional and modern',
    'Creative and engaging',
    'Minimalist and clean',
    'Corporate and formal'
  ],

  // Error Messages for Demo Mode
  demoMessages: {
    limitReached: 'You have reached your daily limit. Upgrade to Pro for unlimited presentations.',
    premiumFeature: 'This feature requires a Pro subscription.',
    modelUnavailable: 'This AI model is not available in demo mode.',
    templateLocked: 'This template requires a Pro subscription.'
  },

  // Upgrade Prompts
  upgradePrompts: {
    title: 'Upgrade to AI Presentation Pro',
    subtitle: 'Unlock unlimited presentations and premium features',
    features: [
      'Unlimited presentations per day',
      'Access to all AI models including GPT-4',
      'Premium templates and designs',
      'Advanced customization options',
      'Priority support and faster generation'
    ],
    pricing: {
      monthly: '$19.99/month',
      yearly: '$199.99/year (Save 17%)',
      lifetime: '$499.99 (One-time payment)'
    }
  },

  // API Configuration for Demo
  apiConfig: {
    timeout: 30000, // 30 seconds
    retries: 3,
    fallbackModel: 'gpt-3.5-turbo',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    }
  },

  // Feature Flags
  features: {
    aiModelSelection: true,
    templateCustomization: true,
    advancedOptions: false,
    analytics: false,
    teamCollaboration: false,
    customBranding: false,
    prioritySupport: false
  }
};

// Usage Examples:

// 1. Check if a model is free
function isModelFree(modelId) {
  return module.exports.freeModels[modelId]?.isFree || false;
}

// 2. Get model information
function getModelInfo(modelId) {
  return module.exports.freeModels[modelId] || null;
}

// 3. Check demo mode limitations
function checkDemoLimits(userId, action) {
  // Implementation would check user's daily usage
  return {
    allowed: true,
    remaining: 5,
    limit: 10
  };
}

// 4. Get available templates for user tier
function getAvailableTemplates(isProUser) {
  if (isProUser) {
    return [...module.exports.freeTemplates, ...module.exports.premiumTemplates];
  }
  return module.exports.freeTemplates;
}

// 5. Validate demo topic
function validateDemoTopic(topic) {
  return module.exports.demoTopics.includes(topic) || topic.length <= 200;
}

module.exports.utils = {
  isModelFree,
  getModelInfo,
  checkDemoLimits,
  getAvailableTemplates,
  validateDemoTopic
};
