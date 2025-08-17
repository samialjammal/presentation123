const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const FormData = require('form-data');
const axios = require('axios');
require('dotenv').config();

// Canva API Configuration (Demo mode only)
const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID || 'demo-client-id';
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET || 'demo-client-secret';
const CANVA_BASE_URL = 'https://api.canva.com';
const CANVA_AUTH_URL = 'https://www.canva.com/oauth/authorize';
const CANVA_TOKEN_URL = 'https://api.canva.com/oauth/token';

const app = express();
const PORT = process.env.PORT || 3040;

// Trust proxy for rate limiting (fixes X-Forwarded-For header issue)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Serve static files (in production or when client/build exists)
if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'client/build'))) {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// AI Direct PowerPoint Generation Endpoint
app.post('/api/generate-content', async (req, res) => {
  try {
    const { topic, audience, style, slides, additionalInfo, aiModel, presentationType, template } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      // Return demo PowerPoint when no API key is configured
      console.log('No OpenAI API key configured, returning demo PowerPoint');
      return generateDemoPowerPoint(res, topic, audience, style, slides, additionalInfo, presentationType, template);
    }

    // Use GPT-4 for better PowerPoint generation capabilities
    const preferredModel = 'gpt-4';
    const fallbackModels = ['gpt-4o-mini', 'gpt-3.5-turbo'];
    const modelsToTry = [preferredModel, ...fallbackModels];

    const prompt = `You are an expert PowerPoint presentation creator. Create a professional PowerPoint presentation for the topic: "${topic}".

    Requirements:
    - Target audience: ${audience || 'General business audience'}
    - Style: ${style || 'Professional and modern'}
    - Presentation type: ${presentationType || 'business'}
    - Number of slides: ${slides || 10}
    - Additional context: ${additionalInfo || 'None'}
    - Template style: ${template || 'ai-modern'}
    
    Create a complete PowerPoint presentation with:
    1. Professional title slide with compelling title and subtitle
    2. Agenda/overview slide with clear structure
    3. Main content slides with detailed bullet points
    4. Conclusion slide with key takeaways
    5. Professional design elements and visual hierarchy
    6. Appropriate color schemes and typography
    7. Modern layout and spacing

    Return the presentation as a PowerPoint file (.pptx) with professional formatting, colors, and design elements.`;

    let completion;
    let usedModel = '';

    for (const model of modelsToTry) {
      try {
        completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an expert PowerPoint presentation designer and creator. You have deep knowledge of professional presentation design, business communication, and visual storytelling. Create engaging, well-structured presentations that follow industry best practices."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        });
        usedModel = model;
        console.log(`Successfully used AI model: ${model}`);
        break;
      } catch (modelError) {
        console.log(`AI model ${model} failed:`, modelError.message);
        if (model === modelsToTry[modelsToTry.length - 1]) {
          // If all models fail, return demo PowerPoint
          console.log('All AI models failed, returning demo PowerPoint');
          return generateDemoPowerPoint(res, topic, audience, style, slides, additionalInfo, presentationType, template);
        }
        continue;
      }
    }

    // Generate PowerPoint from AI content
    const aiContent = completion.choices[0].message.content;
    return generatePowerPointFromAI(res, aiContent, topic, audience, style, slides, additionalInfo, presentationType, template, usedModel);

  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    
    // Handle specific OpenAI API errors
    if (error.code === 'model_not_found' || error.status === 404) {
      console.log('Model not found, returning demo PowerPoint');
      return generateDemoPowerPoint(res, req.body.topic, req.body.audience, req.body.style, req.body.slides, req.body.additionalInfo, req.body.presentationType, req.body.template);
    } else if (error.status === 401) {
      res.status(401).json({ 
        error: 'Authentication error', 
        details: 'Invalid OpenAI API key. Please check your API key in the .env file.',
        suggestion: 'Verify your OpenAI API key is correct and has sufficient credits.',
        demoMode: true
      });
    } else if (error.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded', 
        details: 'Too many requests to OpenAI API. Please try again later.',
        suggestion: 'Wait a few minutes before trying again.',
        demoMode: true
      });
    } else {
      // For any other error, return demo PowerPoint
      console.log('Unexpected error, returning demo PowerPoint');
      return generateDemoPowerPoint(res, req.body.topic, req.body.audience, req.body.style, req.body.slides, req.body.additionalInfo, req.body.presentationType, req.body.template);
    }
  }
});

// Generate PowerPoint from AI content
async function generatePowerPointFromAI(res, aiContent, topic, audience, style, slides, additionalInfo, presentationType, template, usedModel) {
  try {
    // Parse AI content to extract presentation structure
    const presentationData = parseAIContentToStructure(aiContent, topic, audience, style, slides, additionalInfo, presentationType);
    
    // Generate PowerPoint file
    return await generatePowerPointFile(res, presentationData, template, usedModel);
  } catch (error) {
    console.error('Error generating PowerPoint from AI:', error);
    // Fallback to demo PowerPoint
    return generateDemoPowerPoint(res, topic, audience, style, slides, additionalInfo, presentationType, template);
  }
}

// Parse AI content to presentation structure
function parseAIContentToStructure(aiContent, topic, audience, style, slides, additionalInfo, presentationType) {
  // Extract title and subtitle from AI content
  const title = topic || 'AI Generated Presentation';
  const subtitle = `Professional ${presentationType ? presentationType.charAt(0).toUpperCase() + presentationType.slice(1) : 'Business'} Presentation`;
  
  // Create slides based on AI content analysis
  const slideArray = [];
  
  // Title slide
  slideArray.push({
    title: title,
    content: [subtitle],
    type: 'title',
    icon: 'star',
    visualElements: ['icon']
  });
  
  // Extract agenda from AI content
  const agendaItems = extractAgendaFromAI(aiContent);
  slideArray.push({
    title: 'Agenda',
    content: agendaItems,
    type: 'agenda',
    icon: 'list',
    visualElements: ['icon']
  });
  
  // Extract content slides from AI
  const contentSlides = extractContentFromAI(aiContent, slides || 10);
  slideArray.push(...contentSlides);
  
  // Conclusion slide
  slideArray.push({
    title: 'Next Steps and Recommendations',
    content: [
      'Immediate action items and priorities',
      'Resource allocation and budget planning',
      'Stakeholder engagement and communication',
      'Success metrics and monitoring framework'
    ],
    type: 'conclusion',
    icon: 'check-circle',
    visualElements: ['icon']
  });
  
  return {
    title: title,
    subtitle: subtitle,
    slides: slideArray,
    aiGenerated: true,
    model: usedModel,
    message: `Generated using ${usedModel} AI model`
  };
}

// Extract agenda items from AI content
function extractAgendaFromAI(aiContent) {
  const agendaKeywords = ['agenda', 'overview', 'introduction', 'challenges', 'solutions', 'implementation', 'conclusion', 'next steps'];
  const agendaItems = [];
  
  // Simple extraction logic - can be enhanced
  const lines = aiContent.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const keyword of agendaKeywords) {
      if (lowerLine.includes(keyword) && line.length > 10 && line.length < 100) {
        const cleanLine = line.replace(/^[-*•\d\s]+/, '').trim();
        if (cleanLine && !agendaItems.includes(cleanLine)) {
          agendaItems.push(cleanLine);
        }
      }
    }
  }
  
  // Fallback agenda if extraction fails
  if (agendaItems.length === 0) {
    return [
      'Introduction and Overview',
      'Key Challenges and Opportunities',
      'Strategic Approach and Solutions',
      'Implementation Roadmap',
      'Expected Outcomes and Benefits',
      'Next Steps and Recommendations'
    ];
  }
  
  return agendaItems.slice(0, 6); // Limit to 6 items
}

// Extract content slides from AI content
function extractContentFromAI(aiContent, maxSlides) {
  const contentSlides = [];
  const lines = aiContent.split('\n');
  let currentSlide = null;
  let slideCount = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check if line looks like a slide title
    if (trimmedLine.length > 5 && trimmedLine.length < 80 && 
        (trimmedLine.endsWith(':') || /^[A-Z][^.!?]*$/.test(trimmedLine))) {
      
      if (currentSlide && slideCount < maxSlides - 3) {
        contentSlides.push(currentSlide);
        slideCount++;
      }
      
      currentSlide = {
        title: trimmedLine.replace(':', ''),
        content: [],
        type: 'content',
        icon: getIconForTitle(trimmedLine),
        visualElements: ['icon']
      };
    } else if (currentSlide && trimmedLine.length > 10) {
      // Add as content point
      currentSlide.content.push(trimmedLine);
    }
  }
  
  // Add the last slide
  if (currentSlide && slideCount < maxSlides - 3) {
    contentSlides.push(currentSlide);
  }
  
  // Fallback content if extraction fails
  if (contentSlides.length === 0) {
    return [
      {
        title: 'Introduction and Overview',
        content: [
          'Current market landscape and trends',
          'Key challenges facing the industry',
          'Opportunities for growth and innovation',
          'Strategic importance of this initiative'
        ],
        type: 'content',
        icon: 'lightbulb',
        visualElements: ['icon']
      },
      {
        title: 'Key Challenges and Opportunities',
        content: [
          'Market competition and disruption',
          'Technology adoption barriers',
          'Resource constraints and limitations',
          'Regulatory and compliance requirements'
        ],
        type: 'content',
        icon: 'target',
        visualElements: ['icon']
      }
    ];
  }
  
  return contentSlides.slice(0, maxSlides - 3);
}

// Get appropriate icon for slide title
function getIconForTitle(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('data') || lowerTitle.includes('statistics') || lowerTitle.includes('chart')) {
    return 'bar-chart';
  } else if (lowerTitle.includes('team') || lowerTitle.includes('people') || lowerTitle.includes('users')) {
    return 'users';
  } else if (lowerTitle.includes('goal') || lowerTitle.includes('target') || lowerTitle.includes('objective')) {
    return 'target';
  } else if (lowerTitle.includes('idea') || lowerTitle.includes('innovation') || lowerTitle.includes('creative')) {
    return 'lightbulb';
  } else if (lowerTitle.includes('check') || lowerTitle.includes('complete') || lowerTitle.includes('done')) {
    return 'check-circle';
  } else if (lowerTitle.includes('list') || lowerTitle.includes('agenda') || lowerTitle.includes('overview')) {
    return 'list';
  } else {
    return 'briefcase';
  }
}

// Generate PowerPoint file
async function generatePowerPointFile(res, presentationData, template, usedModel) {
  try {
    // Create new presentation
    const pptx = new PptxGenJS();

    // Set presentation properties
    pptx.author = 'BBSF Dev Team';
    pptx.company = 'Professional AI Tools';
    pptx.title = presentationData.title || 'AI Generated Presentation';
    pptx.subject = presentationData.subtitle || 'Professional Presentation';

    // Define advanced AI-powered color schemes with modern gradients
    const colorSchemes = {
      'ai-modern': {
        primary: '6366F1',
        secondary: '8B5CF6',
        accent: 'EC4899',
        background: 'F8FAFC',
        text: '1E293B',
        lightBg: 'FFFFFF',
        gradient: ['6366F1', '8B5CF6'],
        accentGradient: ['EC4899', 'F59E0B']
      },
      'ai-corporate': {
        primary: '1E293B',
        secondary: '334155',
        accent: '3B82F6',
        background: 'F8FAFC',
        text: '0F172A',
        lightBg: 'FFFFFF',
        gradient: ['1E293B', '334155'],
        accentGradient: ['3B82F6', '1D4ED8']
      },
      'ai-creative': {
        primary: '8B5CF6',
        secondary: 'EC4899',
        accent: 'F59E0B',
        background: 'FDF2F8',
        text: '1E293B',
        lightBg: 'FFFFFF',
        gradient: ['8B5CF6', 'EC4899'],
        accentGradient: ['F59E0B', 'F97316']
      },
      'ai-minimal': {
        primary: '6B7280',
        secondary: '9CA3AF',
        accent: 'D1D5DB',
        background: 'FFFFFF',
        text: '374151',
        lightBg: 'F9FAFB',
        gradient: ['6B7280', '9CA3AF'],
        accentGradient: ['D1D5DB', 'E5E7EB']
      },
      'ai-tech': {
        primary: '059669',
        secondary: '10B981',
        accent: '34D399',
        background: 'F0FDF4',
        text: '064E3B',
        lightBg: 'FFFFFF',
        gradient: ['059669', '10B981'],
        accentGradient: ['34D399', '6EE7B7']
      },
      'ai-data': {
        primary: 'DC2626',
        secondary: 'EF4444',
        accent: 'F87171',
        background: 'FEF2F2',
        text: '7F1D1D',
        lightBg: 'FFFFFF',
        gradient: ['DC2626', 'EF4444'],
        accentGradient: ['F87171', 'FCA5A5']
      }
    };

    // Select color scheme based on template
    const selectedTemplate = template || 'ai-modern';
    const colorScheme = colorSchemes[selectedTemplate] || colorSchemes['ai-modern'];

    // Create title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { 
      color: colorScheme.primary,
      gradient: {
        type: 'linear',
        stops: [
          { color: colorScheme.gradient[0], position: 0 },
          { color: colorScheme.gradient[1], position: 100 }
        ]
      }
    };

    // Add professional header bar
    titleSlide.addShape('rect', {
      x: 0, y: 0, w: 10, h: 0.4,
      fill: { color: colorScheme.accent },
      line: { color: 'transparent' }
    });

    // Add modern geometric elements
    titleSlide.addShape('rect', {
      x: 8.2, y: 0.8, w: 1.6, h: 1.6,
      fill: { color: colorScheme.accent, transparency: 20 },
      line: { color: colorScheme.accent, width: 2 },
      borderRadius: 8
    });

    titleSlide.addShape('circle', {
      x: 0.2, y: 5.8, w: 1.2, h: 1.2,
      fill: { color: colorScheme.secondary, transparency: 30 },
      line: { color: colorScheme.secondary, width: 1 }
    });

    // Main title with professional typography
    titleSlide.addText(presentationData.title || 'AI Generated Presentation', {
      x: 0.5, y: 2.2, w: 9, h: 2,
      fontSize: 48,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
      fontFace: 'Arial',
      shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, angle: 45 }
    });

    // Subtitle with elegant styling
    titleSlide.addText(presentationData.subtitle || 'Professional Presentation', {
      x: 0.5, y: 4.4, w: 9, h: 1,
      fontSize: 28,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
      transparency: 90
    });

    // Add AI model info
    if (presentationData.model) {
      titleSlide.addText(`Generated with ${presentationData.model}`, {
        x: 0.5, y: 6.5, w: 9, h: 0.5,
        fontSize: 14,
        color: 'FFFFFF',
        align: 'center',
        fontFace: 'Arial',
        transparency: 80
      });
    }

    // Add professional footer
    titleSlide.addShape('rect', {
      x: 0, y: 6.8, w: 10, h: 0.2,
      fill: { color: colorScheme.accent },
      line: { color: 'transparent' }
    });

    titleSlide.addText('BBSF Dev Team', {
      x: 0.5, y: 7, w: 9, h: 0.3,
      fontSize: 12,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
      transparency: 80
    });

    // Create content slides
    presentationData.slides.forEach((slideData, index) => {
      if (slideData.type === 'title') return; // Skip title slide as it's already created
      
      const slide = pptx.addSlide();
      
      // Set professional slide background
      slide.background = { color: colorScheme.lightBg };

      // Add professional header with gradient
      slide.addShape('rect', {
        x: 0, y: 0, w: 10, h: 1.4,
        fill: { 
          color: colorScheme.primary,
          gradient: {
            type: 'linear',
            stops: [
              { color: colorScheme.gradient[0], position: 0 },
              { color: colorScheme.gradient[1], position: 100 }
            ]
          }
        },
        line: { color: 'transparent' }
      });

      // Add slide number with professional styling
      slide.addShape('circle', {
        x: 8.5, y: 0.2, w: 1, h: 1,
        fill: { color: colorScheme.accent },
        line: { color: 'transparent' }
      });

      slide.addText(`${index}`, {
        x: 8.5, y: 0.2, w: 1, h: 1,
        fontSize: 14,
        color: 'FFFFFF',
        align: 'center',
        fontFace: 'Arial',
        bold: true
      });

      // Add slide title with professional typography
      const slideTitle = slideData.title || `Slide ${index}`;
      slide.addText(slideTitle, {
        x: 0.5, y: 0.3, w: 8, h: 0.8,
        fontSize: 32,
        color: 'FFFFFF',
        bold: true,
        fontFace: 'Arial',
        shadow: { type: 'outer', color: '000000', blur: 2, offset: 1, angle: 45 }
      });

      // Add content
      if (slideData.content && slideData.content.length > 0) {
        const contentArray = Array.isArray(slideData.content) ? slideData.content : [slideData.content];
        const filteredContent = contentArray.filter(item => item && item.toString().trim() !== '');
        
        if (filteredContent.length > 0) {
          // Add AI-generated icon
          const iconType = slideData.icon || 'briefcase';
          const iconColor = colorScheme.accent;
          
          // Create icon based on type
          createIconForSlide(slide, iconType, iconColor, 0.5, 1.8);

          // Add content with professional styling
          slide.addShape('rect', {
            x: 0.3, y: 1.6, w: 9.4, h: 5.4,
            fill: { color: colorScheme.background },
            line: { color: colorScheme.primary, width: 2 },
            borderRadius: 8
          });

          const bulletText = filteredContent.join('\n');
          slide.addText(bulletText, {
            x: 0.9, y: 1.8, w: 8.5, h: 5,
            fontSize: 18,
            color: colorScheme.text,
            bullet: true,
            bulletType: 'number',
            fontFace: 'Arial'
          });
        }
      }

      // Add professional footer
      slide.addShape('rect', {
        x: 0, y: 7, w: 10, h: 0.2,
        fill: { color: colorScheme.primary },
        line: { color: 'transparent' }
      });

      slide.addText(presentationData.title || 'AI Generated Presentation', {
        x: 0.5, y: 7.1, w: 9, h: 0.3,
        fontSize: 10,
        color: colorScheme.primary,
        align: 'left',
        fontFace: 'Arial'
      });
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-presentation-${timestamp}.pptx`;
    const filepath = path.join(__dirname, 'generated', filename);

    // Ensure generated directory exists
    if (!fs.existsSync(path.join(__dirname, 'generated'))) {
      fs.mkdirSync(path.join(__dirname, 'generated'));
    }

    // Save presentation
    await pptx.writeFile({ fileName: filepath });

    // Send file to client
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Failed to send file' });
      }
      // Clean up file after sending
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('Error generating PowerPoint file:', error);
    throw error;
  }
}

// Create icon for slide
function createIconForSlide(slide, iconType, iconColor, x, y) {
  if (iconType === 'chart' || iconType === 'bar-chart') {
    slide.addShape('rect', {
      x: x, y: y, w: 0.8, h: 0.8,
      fill: { color: iconColor },
      line: { color: 'transparent' },
      borderRadius: 4
    });
    // Add chart bars
    for (let i = 0; i < 3; i++) {
      slide.addShape('rect', {
        x: x + 0.1 + (i * 0.15), y: y + 0.4 - (i * 0.1), w: 0.1, h: 0.2 + (i * 0.1),
        fill: { color: 'FFFFFF' },
        line: { color: 'transparent' }
      });
    }
  } else if (iconType === 'users' || iconType === 'team') {
    slide.addShape('circle', {
      x: x, y: y, w: 0.8, h: 0.8,
      fill: { color: iconColor },
      line: { color: 'transparent' }
    });
    slide.addShape('circle', {
      x: x + 0.1, y: y + 0.2, w: 0.2, h: 0.2,
      fill: { color: 'FFFFFF' },
      line: { color: 'transparent' }
    });
    slide.addShape('rect', {
      x: x + 0.05, y: y + 0.4, w: 0.3, h: 0.3,
      fill: { color: 'FFFFFF' },
      line: { color: 'transparent' },
      borderRadius: 2
    });
  } else {
    // Default briefcase icon
    slide.addShape('rect', {
      x: x, y: y, w: 0.8, h: 0.8,
      fill: { color: iconColor },
      line: { color: 'transparent' },
      borderRadius: 4
    });
    slide.addShape('rect', {
      x: x + 0.1, y: y + 0.1, w: 0.6, h: 0.4,
      fill: { color: 'FFFFFF' },
      line: { color: 'transparent' },
      borderRadius: 2
    });
    slide.addShape('rect', {
      x: x + 0.15, y: y + 0.05, w: 0.5, h: 0.1,
      fill: { color: 'FFFFFF' },
      line: { color: 'transparent' },
      borderRadius: 2
    });
  }
}

// Generate demo PowerPoint
async function generateDemoPowerPoint(res, topic, audience, style, slides, additionalInfo, presentationType, template) {
  const demoData = {
    title: topic || 'Professional Presentation',
    subtitle: `AI-Generated ${presentationType ? presentationType.charAt(0).toUpperCase() + presentationType.slice(1) : 'Business'} Presentation`,
    slides: [
      {
        title: 'Agenda',
        content: [
          'Introduction and Overview',
          'Key Challenges and Opportunities',
          'Strategic Approach and Solutions',
          'Implementation Roadmap',
          'Expected Outcomes and Benefits',
          'Next Steps and Recommendations'
        ],
        type: 'agenda',
        icon: 'list',
        visualElements: ['icon']
      },
      {
        title: 'Introduction and Overview',
        content: [
          'Current market landscape and trends',
          'Key challenges facing the industry',
          'Opportunities for growth and innovation',
          'Strategic importance of this initiative'
        ],
        type: 'content',
        icon: 'lightbulb',
        visualElements: ['icon']
      },
      {
        title: 'Key Challenges and Opportunities',
        content: [
          'Market competition and disruption',
          'Technology adoption barriers',
          'Resource constraints and limitations',
          'Regulatory and compliance requirements'
        ],
        type: 'content',
        icon: 'target',
        visualElements: ['icon']
      },
      {
        title: 'Strategic Approach and Solutions',
        content: [
          'Comprehensive analysis and planning',
          'Innovative technology solutions',
          'Process optimization and automation',
          'Change management and training'
        ],
        type: 'content',
        icon: 'brain',
        visualElements: ['icon']
      },
      {
        title: 'Implementation Roadmap',
        content: [
          'Phase 1: Foundation and Setup (Months 1-3)',
          'Phase 2: Core Development (Months 4-6)',
          'Phase 3: Testing and Refinement (Months 7-9)',
          'Phase 4: Launch and Optimization (Months 10-12)'
        ],
        type: 'content',
        icon: 'rocket',
        visualElements: ['icon']
      },
      {
        title: 'Expected Outcomes and Benefits',
        content: [
          'Increased efficiency and productivity',
          'Cost reduction and resource optimization',
          'Enhanced customer satisfaction',
          'Competitive advantage and market position'
        ],
        type: 'content',
        icon: 'trending-up',
        visualElements: ['icon']
      },
      {
        title: 'Next Steps and Recommendations',
        content: [
          'Immediate action items and priorities',
          'Resource allocation and budget planning',
          'Stakeholder engagement and communication',
          'Success metrics and monitoring framework'
        ],
        type: 'conclusion',
        icon: 'check-circle',
        visualElements: ['icon']
      }
    ],
    demoMode: true,
    message: 'This is demo content generated without AI. Add your OpenAI API key to enable AI-powered content generation.'
  };

  return await generatePowerPointFile(res, demoData, template, 'demo');
}

// Presentation Builder Endpoint - Follows the 4-step workflow
app.post('/api/build-presentation', async (req, res) => {
  try {
    const { topic, audience, style, slides, additionalInfo, presentationType, template } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured', 
        details: 'Please add your OpenAI API key to the .env file to use the presentation builder.',
        suggestion: 'Add OPENAI_API_KEY=your-key-here to your .env file'
      });
    }

    // Check if Cloudmersive API key is configured
    if (!process.env.CLOUDMERSIVE_API_KEY) {
      return res.status(400).json({ 
        error: 'Cloudmersive API key not configured', 
        details: 'Please add your Cloudmersive API key to the .env file.',
        suggestion: 'Add CLOUDMERSIVE_API_KEY=your-key-here to your .env file'
      });
    }

    console.log('Starting presentation builder workflow for topic:', topic);

    // Step 1: Call OpenAI with API key
    const aiContent = await callOpenAI(topic, audience, style, slides, additionalInfo, presentationType);
    
    // Step 2: Load PPTX template with placeholders
    const templatePath = await loadPPTXTemplate(template);
    
    // Step 3: Replace placeholders using Cloudmersive API
    const finalPPTXPath = await replacePlaceholders(templatePath, aiContent, topic, audience, style, slides, additionalInfo, presentationType);
    
    // Step 4: Send final file
    const filename = `presentation-${Date.now()}.pptx`;
    res.download(finalPPTXPath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Failed to send file' });
      }
      // Clean up files after sending
      setTimeout(() => {
        if (fs.existsSync(finalPPTXPath)) {
          fs.unlinkSync(finalPPTXPath);
        }
        if (fs.existsSync(templatePath)) {
          fs.unlinkSync(templatePath);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('Error in presentation builder:', error);
    res.status(500).json({ 
      error: 'Failed to build presentation', 
      details: error.message,
      suggestion: 'Please check your API keys and try again.'
    });
  }
});

// Step 1: Call OpenAI with API key
async function callOpenAI(topic, audience, style, slides, additionalInfo, presentationType) {
  try {
    const prompt = `You are an expert PowerPoint presentation creator. Create content for a professional PowerPoint presentation for the topic: "${topic}".

    Requirements:
    - Target audience: ${audience || 'General business audience'}
    - Style: ${style || 'Professional and modern'}
    - Presentation type: ${presentationType || 'business'}
    - Number of slides: ${slides || 10}
    - Additional context: ${additionalInfo || 'None'}
    
    Please provide the presentation content in the following JSON format:
    {
      "title": "Main presentation title",
      "subtitle": "Subtitle or tagline",
      "slides": [
        {
          "title": "Slide 1 Title",
          "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
        },
        {
          "title": "Slide 2 Title", 
          "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
        }
      ]
    }
    
    Make sure the content is professional, engaging, and appropriate for the target audience.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: "system",
          content: "You are an expert PowerPoint presentation designer and creator. You have deep knowledge of professional presentation design, business communication, and visual storytelling. Create engaging, well-structured presentations that follow industry best practices."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const aiContent = completion.choices[0].message.content;
    console.log('OpenAI content generated successfully');
    return aiContent;

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

// Step 2: Load PPTX template with placeholders
async function loadPPTXTemplate(template) {
  try {
    // Create a basic PPTX template with placeholders using PptxGenJS
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.author = 'BBSF Dev Team';
    pptx.company = 'Professional AI Tools';
    pptx.title = '{{TITLE}}';
    pptx.subject = '{{SUBTITLE}}';

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '6366F1' };
    
    titleSlide.addText('{{TITLE}}', {
      x: 0.5, y: 2, w: 9, h: 2,
      fontSize: 48,
      color: 'FFFFFF',
      bold: true,
      align: 'center',
      fontFace: 'Arial'
    });

    titleSlide.addText('{{SUBTITLE}}', {
      x: 0.5, y: 4.5, w: 9, h: 1,
      fontSize: 28,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial'
    });

    // Content slides with placeholders
    for (let i = 1; i <= 10; i++) {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      
      // Header
      slide.addShape('rect', {
        x: 0, y: 0, w: 10, h: 1.4,
        fill: { color: '6366F1' },
        line: { color: 'transparent' }
      });

      slide.addText(`{{S${i}_TITLE}}`, {
        x: 0.5, y: 0.3, w: 8, h: 0.8,
        fontSize: 32,
        color: 'FFFFFF',
        bold: true,
        fontFace: 'Arial'
      });

      // Content area
      slide.addText(`{{S${i}_BULLETS}}`, {
        x: 0.5, y: 1.8, w: 9, h: 5,
        fontSize: 18,
        color: '1E293B',
        bullet: true,
        fontFace: 'Arial'
      });
    }

    // Generate template file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const templateFilename = `template-${timestamp}.pptx`;
    const templatePath = path.join(__dirname, 'generated', templateFilename);

    // Ensure generated directory exists
    if (!fs.existsSync(path.join(__dirname, 'generated'))) {
      fs.mkdirSync(path.join(__dirname, 'generated'));
    }

    await pptx.writeFile({ fileName: templatePath });
    console.log('PPTX template created successfully');
    return templatePath;

  } catch (error) {
    console.error('Error creating PPTX template:', error);
    throw new Error(`Template creation error: ${error.message}`);
  }
}

// Step 3: Replace placeholders using Cloudmersive API
async function replacePlaceholders(templatePath, aiContent, topic, audience, style, slides, additionalInfo, presentationType) {
  try {
    // Parse AI content to extract structured data
    const presentationData = parseAIContent(aiContent);
    
    // Create a copy of the template for processing
    const workingPath = templatePath.replace('.pptx', '-working.pptx');
    fs.copyFileSync(templatePath, workingPath);

    // Define placeholder mappings
    const placeholders = {
      '{{TITLE}}': presentationData.title || topic,
      '{{SUBTITLE}}': presentationData.subtitle || `Professional ${presentationType || 'Business'} Presentation`
    };

    // Add slide-specific placeholders
    presentationData.slides.forEach((slide, index) => {
      const slideNum = index + 1;
      placeholders[`{{S${slideNum}_TITLE}}`] = slide.title || `Slide ${slideNum}`;
      placeholders[`{{S${slideNum}_BULLETS}}`] = Array.isArray(slide.content) ? slide.content.join('\n') : slide.content || '';
    });

    // Replace each placeholder using Cloudmersive API
    for (const [placeholder, value] of Object.entries(placeholders)) {
      await replacePlaceholderInPPTX(workingPath, placeholder, value);
    }

    // Create final filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalPath = path.join(__dirname, 'generated', `final-${timestamp}.pptx`);
    fs.renameSync(workingPath, finalPath);

    console.log('All placeholders replaced successfully');
    return finalPath;

  } catch (error) {
    console.error('Error replacing placeholders:', error);
    throw new Error(`Placeholder replacement error: ${error.message}`);
  }
}

// Helper function to replace a single placeholder using Cloudmersive API
async function replacePlaceholderInPPTX(filePath, matchString, replaceString) {
  try {
    const formData = new FormData();
    formData.append('inputFile', fs.createReadStream(filePath));
    formData.append('matchString', matchString);
    formData.append('replaceString', replaceString);

    const response = await axios.post(
      'https://api.cloudmersive.com/convert/edit/pptx/replace-all',
      formData,
      {
        headers: {
          'Apikey': process.env.CLOUDMERSIVE_API_KEY,
          ...formData.getHeaders()
        },
        responseType: 'stream'
      }
    );

    // Write the updated file back to the same path
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

  } catch (error) {
    console.error(`Error replacing placeholder "${matchString}":`, error.message);
    throw new Error(`Cloudmersive API error: ${error.message}`);
  }
}

// Helper function to parse AI content into structured format
function parseAIContent(aiContent) {
  try {
    // Try to parse as JSON first
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || 'AI Generated Presentation',
        subtitle: parsed.subtitle || 'Professional Presentation',
        slides: parsed.slides || []
      };
    }

    // Fallback: parse content manually
    const lines = aiContent.split('\n');
    const title = lines.find(line => line.includes('title') || line.includes('Title')) || 'AI Generated Presentation';
    const subtitle = lines.find(line => line.includes('subtitle') || line.includes('Subtitle')) || 'Professional Presentation';
    
    const slides = [];
    let currentSlide = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      if (trimmedLine.includes('Slide') || trimmedLine.includes('slide')) {
        if (currentSlide) {
          slides.push(currentSlide);
        }
        currentSlide = {
          title: trimmedLine,
          content: []
        };
      } else if (currentSlide && trimmedLine.length > 5) {
        currentSlide.content.push(trimmedLine);
      }
    }
    
    if (currentSlide) {
      slides.push(currentSlide);
    }

    return {
      title: title,
      subtitle: subtitle,
      slides: slides.length > 0 ? slides : [
        {
          title: 'Introduction',
          content: ['Key point 1', 'Key point 2', 'Key point 3']
        },
        {
          title: 'Main Content',
          content: ['Important information 1', 'Important information 2', 'Important information 3']
        },
        {
          title: 'Conclusion',
          content: ['Summary point 1', 'Summary point 2', 'Next steps']
        }
      ]
    };

  } catch (error) {
    console.error('Error parsing AI content:', error);
    // Return default structure if parsing fails
    return {
      title: 'AI Generated Presentation',
      subtitle: 'Professional Presentation',
      slides: [
        {
          title: 'Introduction',
          content: ['Key point 1', 'Key point 2', 'Key point 3']
        },
        {
          title: 'Main Content',
          content: ['Important information 1', 'Important information 2', 'Important information 3']
        },
        {
          title: 'Conclusion',
          content: ['Summary point 1', 'Summary point 2', 'Next steps']
        }
      ]
    };
  }
}

app.listen(PORT, () => {
  console.log(`🚀 AI Presentation Generator server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Serve React app for all other routes (in production or when client/build exists)
if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'client/build'))) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
} else {
  // In development, just serve API routes
  app.get('/', (req, res) => {
    res.json({ 
      message: 'AI Presentation Generator API',
      status: 'running',
      endpoints: {
        health: '/api/health',
        generateContent: '/api/generate-content',
        generatePresentation: '/api/generate-presentation'
      }
    });
  });
}
