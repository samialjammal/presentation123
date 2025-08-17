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

// Canva API Configuration
const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID ;
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET ;
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

// Serve static files (only in production)
if (process.env.NODE_ENV === 'production') {
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

// Demo content generator function (legacy support)
function generateDemoContent(topic, audience, style, slides, additionalInfo, presentationType) {
  const slideCount = Math.min(slides || 10, 15); // Limit to 15 slides for demo
  
  // Generate professional title
  const title = topic || 'Professional Presentation';
  const subtitle = `AI-Generated ${presentationType ? presentationType.charAt(0).toUpperCase() + presentationType.slice(1) : 'Business'} Presentation`;
  
  // Create slides based on topic and type
  const slideArray = [];
  
  // Title slide
  slideArray.push({
    title: title,
    content: [subtitle],
    type: 'title',
    icon: 'star',
    visualElements: ['icon']
  });
  
  // Agenda slide
  slideArray.push({
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
  });
  
  // Content slides
  const contentSlides = [
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
    }
  ];
  
  // Add content slides based on requested count
  for (let i = 0; i < Math.min(contentSlides.length, slideCount - 3); i++) {
    slideArray.push(contentSlides[i]);
  }
  
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
    demoMode: true,
    message: 'This is demo content generated without AI. Add your OpenAI API key to enable AI-powered content generation.'
  };
}

// PowerPoint Generation Endpoint
app.post('/api/generate-presentation', async (req, res) => {
  try {
    const { presentationData, template } = req.body;

    if (!presentationData) {
      return res.status(400).json({ error: 'Presentation data is required' });
    }

    // Ensure slides array exists
    if (!presentationData.slides || !Array.isArray(presentationData.slides)) {
      return res.status(400).json({ error: 'Presentation slides array is required' });
    }

    // Debug: Log the presentation data structure
    console.log('Presentation data structure:', JSON.stringify(presentationData, null, 2));

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
      },
      // Legacy support
      modern: {
        primary: '1E40AF',
        secondary: '7C3AED',
        accent: 'F59E0B',
        background: 'F8FAFC',
        text: '1E293B',
        lightBg: 'FFFFFF',
        gradient: ['1E40AF', '7C3AED'],
        accentGradient: ['F59E0B', 'F97316']
      },
      corporate: {
        primary: '0F172A',
        secondary: '334155',
        accent: '3B82F6',
        background: 'F8FAFC',
        text: '0F172A',
        lightBg: 'FFFFFF',
        gradient: ['0F172A', '334155'],
        accentGradient: ['3B82F6', '1D4ED8']
      },
      creative: {
        primary: '7C3AED',
        secondary: 'EC4899',
        accent: 'F59E0B',
        background: 'FDF2F8',
        text: '1E293B',
        lightBg: 'FFFFFF',
        gradient: ['7C3AED', 'EC4899'],
        accentGradient: ['F59E0B', 'F97316']
      },
      minimal: {
        primary: '6B7280',
        secondary: '9CA3AF',
        accent: 'D1D5DB',
        background: 'FFFFFF',
        text: '374151',
        lightBg: 'F9FAFB',
        gradient: ['6B7280', '9CA3AF'],
        accentGradient: ['D1D5DB', 'E5E7EB']
      }
    };

    // Select color scheme based on template or style
    const selectedTemplate = template || 'ai-modern';
    const style = presentationData.style || 'Professional and modern';
    let colorScheme;
    
    // First try to use the specified template
    if (colorSchemes[selectedTemplate]) {
      colorScheme = colorSchemes[selectedTemplate];
    } else if (style.includes('Creative')) {
      colorScheme = colorSchemes.creative;
    } else if (style.includes('Corporate')) {
      colorScheme = colorSchemes.corporate;
    } else if (style.includes('Minimal')) {
      colorScheme = colorSchemes.minimal;
    } else {
      colorScheme = colorSchemes['ai-modern']; // Default to AI modern
    }

    // Professional title slide with AI-generated visual elements
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

    // Add subtle decorative lines
    titleSlide.addShape('line', {
      x: 0, y: 1.2, w: 10, h: 0,
      line: { color: colorScheme.accent, width: 1, transparency: 40 }
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

    // Content slides with professional layouts and AI-generated visual elements
    presentationData.slides.forEach((slideData, index) => {
      const slide = pptx.addSlide();
      
      // Validate slide data
      if (!slideData || typeof slideData !== 'object') {
        console.warn(`Invalid slide data at index ${index}:`, slideData);
        return; // Skip this slide
      }

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

      slide.addText(`${index + 1}`, {
        x: 8.5, y: 0.2, w: 1, h: 1,
        fontSize: 14,
        color: 'FFFFFF',
        align: 'center',
        fontFace: 'Arial',
        bold: true
      });

      // Add slide title with professional typography
      const slideTitle = slideData.title || `Slide ${index + 1}`;
      slide.addText(slideTitle, {
        x: 0.5, y: 0.3, w: 8, h: 0.8,
        fontSize: 32,
        color: 'FFFFFF',
        bold: true,
        fontFace: 'Arial',
        shadow: { type: 'outer', color: '000000', blur: 2, offset: 1, angle: 45 }
      });

      // Add content based on slide type with professional layouts
      if (slideData.content) {
        // Ensure content is always an array
        let contentArray;
        if (Array.isArray(slideData.content)) {
          contentArray = slideData.content;
        } else if (typeof slideData.content === 'string') {
          contentArray = [slideData.content];
        } else {
          contentArray = [String(slideData.content)];
        }
        
        // Filter out empty or null items
        contentArray = contentArray.filter(item => item && item.toString().trim() !== '');
        
        if (contentArray.length > 0) {
          // Add AI-generated icon based on slide data
          const iconType = slideData.icon || 'briefcase';
          const iconColor = colorScheme.accent;
          
          // Create icon based on type
          if (iconType === 'chart' || iconType === 'bar-chart') {
            // Bar chart icon
            slide.addShape('rect', {
              x: 0.5, y: 1.8, w: 0.8, h: 0.8,
              fill: { color: iconColor },
              line: { color: 'transparent' },
              borderRadius: 4
            });
            // Add chart bars
            for (let i = 0; i < 3; i++) {
              slide.addShape('rect', {
                x: 0.6 + (i * 0.15), y: 2.2 - (i * 0.1), w: 0.1, h: 0.2 + (i * 0.1),
                fill: { color: 'FFFFFF' },
                line: { color: 'transparent' }
              });
            }
          } else if (iconType === 'users' || iconType === 'team') {
            // Users icon
            slide.addShape('circle', {
              x: 0.5, y: 1.8, w: 0.8, h: 0.8,
              fill: { color: iconColor },
              line: { color: 'transparent' }
            });
            // Add user silhouettes
            slide.addShape('circle', {
              x: 0.6, y: 2, w: 0.2, h: 0.2,
              fill: { color: 'FFFFFF' },
              line: { color: 'transparent' }
            });
            slide.addShape('rect', {
              x: 0.55, y: 2.2, w: 0.3, h: 0.3,
              fill: { color: 'FFFFFF' },
              line: { color: 'transparent' },
              borderRadius: 2
            });
          } else if (iconType === 'lightbulb' || iconType === 'idea') {
            // Lightbulb icon
            slide.addShape('circle', {
              x: 0.5, y: 1.8, w: 0.8, h: 0.8,
              fill: { color: iconColor },
              line: { color: 'transparent' }
            });
            slide.addShape('rect', {
              x: 0.7, y: 2.4, w: 0.2, h: 0.1,
              fill: { color: 'FFFFFF' },
              line: { color: 'transparent' },
              borderRadius: 2
            });
          } else if (iconType === 'target' || iconType === 'goal') {
            // Target icon
            slide.addShape('circle', {
              x: 0.5, y: 1.8, w: 0.8, h: 0.8,
              fill: { color: iconColor },
              line: { color: 'transparent' }
            });
            slide.addShape('circle', {
              x: 0.6, y: 1.9, w: 0.6, h: 0.6,
              fill: { color: 'FFFFFF' },
              line: { color: 'transparent' }
            });
            slide.addShape('circle', {
              x: 0.7, y: 2, w: 0.4, h: 0.4,
              fill: { color: iconColor },
              line: { color: 'transparent' }
            });
          } else if (iconType === 'check' || iconType === 'check-circle') {
            // Check icon
            slide.addShape('circle', {
              x: 0.5, y: 1.8, w: 0.8, h: 0.8,
              fill: { color: iconColor },
              line: { color: 'transparent' }
            });
            slide.addShape('line', {
              x: 0.65, y: 2.1, w: 0.2, h: 0.1,
              line: { color: 'FFFFFF', width: 3 }
            });
            slide.addShape('line', {
              x: 0.75, y: 2.2, w: 0.1, h: 0.2,
              line: { color: 'FFFFFF', width: 3 }
            });
          } else if (iconType === 'list' || iconType === 'agenda') {
            // List icon
            slide.addShape('rect', {
              x: 0.5, y: 1.8, w: 0.8, h: 0.8,
              fill: { color: iconColor },
              line: { color: 'transparent' },
              borderRadius: 4
            });
            // Add list lines
            for (let i = 0; i < 3; i++) {
              slide.addShape('rect', {
                x: 0.6, y: 1.9 + (i * 0.15), w: 0.6, h: 0.05,
                fill: { color: 'FFFFFF' },
                line: { color: 'transparent' },
                borderRadius: 2
              });
            }
          } else {
            // Default briefcase icon
            slide.addShape('rect', {
              x: 0.5, y: 1.8, w: 0.8, h: 0.8,
              fill: { color: iconColor },
              line: { color: 'transparent' },
              borderRadius: 4
            });
            slide.addShape('rect', {
              x: 0.6, y: 1.9, w: 0.6, h: 0.4,
              fill: { color: 'FFFFFF' },
              line: { color: 'transparent' },
              borderRadius: 2
            });
            slide.addShape('rect', {
              x: 0.65, y: 1.85, w: 0.5, h: 0.1,
              fill: { color: 'FFFFFF' },
              line: { color: 'transparent' },
              borderRadius: 2
            });
          }

          if (slideData.type === 'agenda') {
            // Professional agenda slide with modern design
            slide.addShape('rect', {
              x: 0.3, y: 1.6, w: 9.4, h: 5.4,
              fill: { color: colorScheme.background },
              line: { color: colorScheme.primary, width: 2 },
              borderRadius: 8
            });

            contentArray.forEach((item, i) => {
              const text = typeof item === 'string' ? `${i + 1}. ${item}` : `${i + 1}. ${String(item)}`;
              
              // Add modern bullet points
              slide.addShape('circle', {
                x: 0.8, y: 2.2 + (i * 0.8), w: 0.3, h: 0.3,
                fill: { color: colorScheme.accent },
                line: { color: 'transparent' }
              });

              slide.addText(text, {
                x: 1.3, y: 2.1 + (i * 0.8), w: 8, h: 0.6,
                fontSize: 18,
                color: colorScheme.text,
                bullet: false,
                fontFace: 'Arial'
              });
            });
          } else if (slideData.type === 'conclusion') {
            // Professional conclusion slide
            slide.addShape('rect', {
              x: 0.3, y: 1.6, w: 9.4, h: 5.4,
              fill: { color: colorScheme.background },
              line: { color: colorScheme.accent, width: 3 },
              borderRadius: 8
            });

            const bulletPoints = contentArray.map(item => typeof item === 'string' ? item : String(item));
            const bulletText = bulletPoints.join('\n');
            slide.addText(bulletText, {
              x: 1.5, y: 1.8, w: 8, h: 5,
              fontSize: 18,
              color: colorScheme.text,
              bullet: true,
              bulletType: 'number',
              fontFace: 'Arial'
            });
          } else {
            // Professional content slide with modern layouts
            if (contentArray.length > 4) {
              // Two-column professional layout
              const midPoint = Math.ceil(contentArray.length / 2);
              const leftColumn = contentArray.slice(0, midPoint);
              const rightColumn = contentArray.slice(midPoint);

              // Left column with modern styling
              slide.addShape('rect', {
                x: 0.3, y: 1.6, w: 4.5, h: 5.4,
                fill: { color: colorScheme.background },
                line: { color: colorScheme.primary, width: 1 },
                borderRadius: 8
              });

              const leftText = leftColumn.map(item => typeof item === 'string' ? item : String(item)).join('\n');
              slide.addText(leftText, {
                x: 0.6, y: 1.8, w: 4, h: 5,
                fontSize: 16,
                color: colorScheme.text,
                bullet: true,
                bulletType: 'number',
                fontFace: 'Arial'
              });

              // Right column with modern styling
              slide.addShape('rect', {
                x: 5.2, y: 1.6, w: 4.5, h: 5.4,
                fill: { color: colorScheme.background },
                line: { color: colorScheme.primary, width: 1 },
                borderRadius: 8
              });

              const rightText = rightColumn.map(item => typeof item === 'string' ? item : String(item)).join('\n');
              slide.addText(rightText, {
                x: 5.5, y: 1.8, w: 4, h: 5,
                fontSize: 16,
                color: colorScheme.text,
                bullet: true,
                bulletType: 'number',
                fontFace: 'Arial'
              });
            } else {
              // Single column with professional styling
              slide.addShape('rect', {
                x: 0.3, y: 1.6, w: 9.4, h: 5.4,
                fill: { color: colorScheme.background },
                line: { color: colorScheme.primary, width: 2 },
                borderRadius: 8
              });

              // Add modern accent bar
              slide.addShape('rect', {
                x: 0.3, y: 1.6, w: 0.4, h: 5.4,
                fill: { color: colorScheme.accent },
                line: { color: 'transparent' },
                borderRadius: 4
              });

              const bulletPoints = contentArray.map(item => typeof item === 'string' ? item : String(item));
              const bulletText = bulletPoints.join('\n');
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
    const filename = `presentation-${timestamp}.pptx`;
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
    console.error('Error generating presentation:', error);
    
    // Provide more specific error messages
    if (error.message.includes('Cannot create property')) {
      res.status(500).json({ 
        error: 'Invalid presentation data format', 
        details: 'The presentation data structure is invalid. Please regenerate the content.',
        suggestion: 'Try generating the presentation content again.'
      });
    } else if (error.message.includes('ENOENT')) {
      res.status(500).json({ 
        error: 'File system error', 
        details: 'Unable to create or access files.',
        suggestion: 'Check file permissions and try again.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate presentation', 
        details: error.message,
        suggestion: 'Please try again or contact support if the issue persists.'
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Canva API Integration Endpoints

// Generate PowerPoint using Canva API
app.post('/api/canva/generate-presentation', async (req, res) => {
  try {
    const { topic, audience, style, slides, additionalInfo, presentationType, template } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    console.log('Starting Canva presentation generation for topic:', topic);

    // Step 1: Generate content using AI (if OpenAI is available)
    let presentationContent;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      try {
        presentationContent = await generateAIContentForCanva(topic, audience, style, slides, additionalInfo, presentationType);
      } catch (aiError) {
        console.log('AI content generation failed, using demo content:', aiError.message);
        presentationContent = generateDemoContentForCanva(topic, audience, style, slides, additionalInfo, presentationType);
      }
    } else {
      presentationContent = generateDemoContentForCanva(topic, audience, style, slides, additionalInfo, presentationType);
    }

    // Step 2: Create Canva presentation
    const canvaPresentation = await createCanvaPresentation(presentationContent, template);

    // Step 3: Export as PowerPoint
    const powerpointFile = await exportCanvaToPowerPoint(canvaPresentation.id);

    // Step 4: Send file to client
    const filename = `canva-presentation-${Date.now()}.pptx`;
    res.download(powerpointFile, filename, (err) => {
      if (err) {
        console.error('Error sending Canva file:', err);
        res.status(500).json({ error: 'Failed to send file' });
      }
      // Clean up file after sending
      setTimeout(() => {
        if (fs.existsSync(powerpointFile)) {
          fs.unlinkSync(powerpointFile);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('Error in Canva presentation generation:', error);
    res.status(500).json({ 
      error: 'Failed to generate Canva presentation', 
      details: error.message,
      suggestion: 'Please check your Canva API key and try again.'
    });
  }
});

// Get Canva templates
app.get('/api/canva/templates', async (req, res) => {
  try {
    const templates = await getCanvaTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching Canva templates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Canva templates', 
      details: error.message 
    });
  }
});

// Canva API Helper Functions

// Generate AI content for Canva
async function generateAIContentForCanva(topic, audience, style, slides, additionalInfo, presentationType) {
  try {
    const prompt = `Create a professional PowerPoint presentation outline for: "${topic}"

    Requirements:
    - Target audience: ${audience || 'General business audience'}
    - Style: ${style || 'Professional and modern'}
    - Presentation type: ${presentationType || 'business'}
    - Number of slides: ${slides || 10}
    - Additional context: ${additionalInfo || 'None'}
    
    Please provide the content in this exact JSON format:
    {
      "title": "Main presentation title",
      "subtitle": "Subtitle or tagline",
      "slides": [
        {
          "title": "Slide Title",
          "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
          "type": "content"
        }
      ]
    }
    
    Make the content professional, engaging, and suitable for the target audience.`;

    // Use the same model selection logic as the main generation function
    const preferredModel = 'gpt-4';
    const fallbackModels = ['gpt-4o-mini', 'gpt-3.5-turbo'];
    const modelsToTry = [preferredModel, ...fallbackModels];

    let completion;
    let lastError;

    for (const model of modelsToTry) {
      try {
        completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an expert PowerPoint presentation designer. Create engaging, professional content that follows best practices."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 3000
        });
        break; // If successful, break out of the loop
      } catch (error) {
        console.log(`Failed to use model ${model}:`, error.message);
        lastError = error;
        continue; // Try the next model
      }
    }

    if (!completion) {
      throw lastError || new Error('All AI models failed');
    }

    const aiContent = completion.choices[0].message.content;
    
    // Parse JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Invalid AI response format');

  } catch (error) {
    console.error('Error generating AI content for Canva:', error);
    throw error;
  }
}

// Generate demo content for Canva
function generateDemoContentForCanva(topic, audience, style, slides, additionalInfo, presentationType) {
  const slideCount = Math.min(slides || 10, 8);
  
  const demoSlides = [
    {
      title: 'Introduction',
      content: [
        'Welcome and overview',
        'Key objectives for today',
        'What we will cover',
        'Expected outcomes'
      ],
      type: 'content'
    },
    {
      title: 'Current Situation',
      content: [
        'Market analysis and trends',
        'Current challenges and opportunities',
        'Competitive landscape',
        'Industry insights'
      ],
      type: 'content'
    },
    {
      title: 'Strategic Approach',
      content: [
        'Our methodology and framework',
        'Key strategies and initiatives',
        'Innovation and technology focus',
        'Risk management approach'
      ],
      type: 'content'
    },
    {
      title: 'Implementation Plan',
      content: [
        'Phase 1: Foundation (Months 1-3)',
        'Phase 2: Development (Months 4-6)',
        'Phase 3: Testing (Months 7-9)',
        'Phase 4: Launch (Months 10-12)'
      ],
      type: 'content'
    },
    {
      title: 'Expected Results',
      content: [
        'Quantifiable benefits and metrics',
        'Efficiency improvements',
        'Cost savings and ROI',
        'Competitive advantages'
      ],
      type: 'content'
    },
    {
      title: 'Next Steps',
      content: [
        'Immediate action items',
        'Resource requirements',
        'Timeline and milestones',
        'Success criteria'
      ],
      type: 'content'
    }
  ];

  return {
    title: topic || 'Professional Presentation',
    subtitle: `AI-Generated ${presentationType ? presentationType.charAt(0).toUpperCase() + presentationType.slice(1) : 'Business'} Presentation`,
    slides: demoSlides.slice(0, slideCount)
  };
}

// Get Canva OAuth2 access token
async function getCanvaAccessToken() {
  try {
    // For now, we'll use client credentials flow
    // In a real implementation, you'd need user authorization
    const response = await axios.post(CANVA_TOKEN_URL, {
      grant_type: 'client_credentials',
      client_id: CANVA_CLIENT_ID,
      client_secret: CANVA_CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Canva access token:', error);
    throw new Error('Failed to authenticate with Canva API');
  }
}

// Create Canva presentation
async function createCanvaPresentation(content, template = 'business') {
  try {
    // Get access token
    const accessToken = await getCanvaAccessToken();
    
    const response = await axios.post(`${CANVA_BASE_URL}/v1/presentations`, {
      title: content.title,
      template: template,
      slides: content.slides.map((slide, index) => ({
        title: slide.title,
        content: slide.content,
        slideNumber: index + 1
      }))
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Canva presentation created successfully');
    return response.data;

  } catch (error) {
    console.error('Error creating Canva presentation:', error);
    
    // If Canva API fails, create a mock response for demo purposes
    if (error.response && error.response.status === 401) {
      throw new Error('Invalid Canva credentials. Please check your Client ID and Client Secret.');
    }
    
    // For demo purposes, return a mock presentation
    return {
      id: `demo-${Date.now()}`,
      title: content.title,
      status: 'created',
      url: 'https://www.canva.com/demo'
    };
  }
}

// Export Canva presentation to PowerPoint
async function exportCanvaToPowerPoint(presentationId) {
  try {
    // Get access token
    const accessToken = await getCanvaAccessToken();
    
    const response = await axios.post(`${CANVA_BASE_URL}/v1/presentations/${presentationId}/export`, {
      format: 'pptx',
      quality: 'high'
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    // Save the PowerPoint file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `canva-export-${timestamp}.pptx`;
    const filepath = path.join(__dirname, 'generated', filename);

    // Ensure generated directory exists
    if (!fs.existsSync(path.join(__dirname, 'generated'))) {
      fs.mkdirSync(path.join(__dirname, 'generated'));
    }

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filepath));
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('Error exporting Canva presentation:', error);
    
    // For demo purposes, create a basic PowerPoint file
    if (error.response && error.response.status === 401) {
      throw new Error('Invalid Canva API key. Please check your API key configuration.');
    }
    
    // Create a demo PowerPoint file using PptxGenJS
    const pptx = new PptxGenJS();
    pptx.title = 'Canva Demo Presentation';
    
    const slide = pptx.addSlide();
    slide.addText('Canva Integration Demo', {
      x: 1, y: 1, w: 8, h: 2,
      fontSize: 36,
      color: '363636',
      bold: true,
      align: 'center'
    });
    
    slide.addText('This is a demo presentation created with Canva integration.', {
      x: 1, y: 3, w: 8, h: 1,
      fontSize: 18, 
      color: '666666',
      align: 'center'
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `canva-demo-${timestamp}.pptx`;
    const filepath = path.join(__dirname, 'generated', filename);

    // Ensure generated directory exists
    if (!fs.existsSync(path.join(__dirname, 'generated'))) {
      fs.mkdirSync(path.join(__dirname, 'generated'));
    }

    await pptx.writeFile({ fileName: filepath });
    return filepath;
  }
}

// Get Canva templates
async function getCanvaTemplates() {
  try {
    // Get access token
    const accessToken = await getCanvaAccessToken();
    
    const response = await axios.get(`${CANVA_BASE_URL}/v1/templates?type=presentation`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.templates || [];

  } catch (error) {
    console.error('Error fetching Canva templates:', error);
    
    // Return demo templates if API fails
    return [
      {
        id: 'business',
        name: 'Business Professional',
        thumbnail: 'https://via.placeholder.com/300x200/6366F1/FFFFFF?text=Business',
        category: 'Business'
      },
      {
        id: 'creative',
        name: 'Creative Modern',
        thumbnail: 'https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=Creative',
        category: 'Creative'
      },
      {
        id: 'minimal',
        name: 'Minimal Clean',
        thumbnail: 'https://via.placeholder.com/300x200/6B7280/FFFFFF?text=Minimal',
        category: 'Minimal'
      },
      {
        id: 'tech',
        name: 'Technology',
        thumbnail: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Tech',
        category: 'Technology'
      }
    ];
  }
}

// Serve React app for all other routes (only in production)
if (process.env.NODE_ENV === 'production') {
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
