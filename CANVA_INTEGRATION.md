# Canva API Integration

This document explains how to use the Canva API integration for PowerPoint generation in the AI Presentation Generator.

## Overview

The Canva integration allows you to generate professional PowerPoint presentations using Canva's design templates and export them as PowerPoint files (.pptx). The integration uses OAuth2 authentication for secure API access.

## Features

- **Professional Canva Templates**: Access to high-quality Canva presentation templates
- **AI Content Generation**: Optional AI-powered content generation (requires OpenAI API key)
- **PowerPoint Export**: Direct export to PowerPoint format
- **Template Categories**: Business, Creative, Minimal, and Technology templates

## Setup

### 1. Environment Configuration

Add your Canva OAuth2 credentials to the `.env` file:

```env
# Canva API Configuration (OAuth2)
```

### 2. OAuth2 Credentials Format

The Canva OAuth2 credentials should be in the format:
```

```

## Usage

### Web Interface

1. **Select Generation Method**: Choose "Canva Integration" from the generation method options
2. **Choose Template**: Select from available Canva templates (Business, Creative, Minimal, Technology)
3. **Enter Details**: Fill in your presentation topic, audience, style, and other details
4. **Generate**: Click "Generate with Canva" to create your presentation
5. **Download**: The PowerPoint file will be automatically downloaded

### API Endpoints

#### Generate Canva Presentation

```http
POST /api/canva/generate-presentation
Content-Type: application/json

{
  "topic": "Your presentation topic",
  "audience": "Target audience",
  "style": "Presentation style",
  "slides": 10,
  "additionalInfo": "Additional context",
  "presentationType": "business",
  "template": "business"
}
```

#### Get Canva Templates

```http
GET /api/canva/templates
```

## Template Categories

### Business Professional
- Professional corporate design
- Suitable for business presentations
- Clean and formal layout

### Creative Modern
- Modern and creative design
- Suitable for marketing and creative presentations
- Colorful and engaging layout

### Minimal Clean
- Minimalist design approach
- Suitable for clean and simple presentations
- Focus on content over design

### Technology
- Tech-focused design elements
- Suitable for technical presentations
- Modern and futuristic layout

## Integration with AI

The Canva integration can work with or without AI content generation:

### With AI (Recommended)
- Requires OpenAI API key
- AI generates professional content based on your topic
- Content is then applied to Canva templates
- Best results for professional presentations

### Without AI (Demo Mode)
- Uses predefined demo content
- Still creates professional presentations
- Good for testing and demonstration

## Error Handling

The system includes comprehensive error handling:

- **Invalid API Key**: Clear error message with setup instructions
- **Network Issues**: Graceful fallback to demo mode
- **Template Issues**: Automatic fallback to default templates
- **Export Issues**: Detailed error messages with suggestions

## Demo Mode

If the Canva API is not available or fails, the system automatically falls back to demo mode:

- Creates a basic PowerPoint file using PptxGenJS
- Includes demo content and design
- Maintains the same user experience
- Provides clear feedback about the fallback

## File Output

Generated presentations are:
- Saved as `.pptx` files
- Automatically downloaded to the user's device
- Temporarily stored on the server (cleaned up after 5 seconds)
- Named with timestamps for uniqueness

## Security

- OAuth2 credentials are stored securely in environment variables
- No sensitive data is logged or exposed
- Temporary files are automatically cleaned up
- Rate limiting is applied to prevent abuse
- OAuth2 tokens are obtained securely and not stored permanently

## Troubleshooting

### Common Issues

1. **"Invalid Canva credentials"**
   - Check your Client ID and Client Secret format
   - Ensure the credentials are correctly added to `.env`
   - Verify the credentials have the necessary permissions

2. **"Failed to generate Canva presentation"**
   - Check your internet connection
   - Verify Canva API service status
   - Try again in a few minutes

3. **"Template not found"**
   - The system will automatically fall back to default templates
   - Check the available templates endpoint
   - Contact support if issues persist

### Support

For technical support or questions about the Canva integration:
- Check the server logs for detailed error messages
- Verify your OAuth2 credentials configuration
- Test with the demo mode first
- Contact the development team for assistance

## Future Enhancements

Planned improvements for the Canva integration:

- **More Templates**: Additional template categories and designs
- **Custom Branding**: Support for custom colors and branding
- **Advanced Editing**: More customization options
- **Real-time Preview**: Live preview of generated presentations
- **Collaboration**: Multi-user editing capabilities
