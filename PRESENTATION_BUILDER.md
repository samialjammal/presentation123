# Presentation Builder - 4-Step Workflow

This document explains the new presentation builder functionality that follows a specific 4-step workflow for creating AI-powered PowerPoint presentations.

## Overview

The presentation builder implements the exact workflow you specified:

1. **Step 1**: Call OpenAI with your API key
2. **Step 2**: Load a PPTX template (with placeholders like `{{TITLE}}`, `{{SUBTITLE}}`, `{{S1_TITLE}}`, `{{S1_BULLETS}}`, etc.)
3. **Step 3**: For each placeholder, call Cloudmersive API to replace it
4. **Step 4**: Save final file as `final.pptx`

## API Endpoint

**POST** `/api/build-presentation`

### Request Body

```json
{
  "topic": "Your presentation topic",
  "audience": "Target audience (optional)",
  "style": "Presentation style (optional)",
  "slides": 10,
  "additionalInfo": "Additional context (optional)",
  "presentationType": "business",
  "template": "ai-modern"
}
```

### Response

The endpoint returns a downloadable PowerPoint file (`final.pptx`).

## Setup Requirements

### 1. Environment Variables

Add these to your `.env` file:

```env
# Required for Step 1: OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# Required for Step 3: Cloudmersive API
CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key-here
```

### 2. API Keys

- **OpenAI API Key**: Get from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Cloudmersive API Key**: Get from [https://account.cloudmersive.com/](https://account.cloudmersive.com/)

### 3. Dependencies

The following dependencies are automatically installed:

```json
{
  "axios": "^1.6.0",
  "form-data": "^4.0.0"
}
```

## How It Works

### Step 1: OpenAI Content Generation

The system calls OpenAI's GPT-4 model with a structured prompt that requests presentation content in JSON format:

```javascript
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
    }
  ]
}`;
```

### Step 2: PPTX Template Creation

The system creates a PowerPoint template with placeholders using PptxGenJS:

- **Title Slide**: Contains `{{TITLE}}` and `{{SUBTITLE}}` placeholders
- **Content Slides**: Contains `{{S1_TITLE}}`, `{{S1_BULLETS}}`, `{{S2_TITLE}}`, `{{S2_BULLETS}}`, etc.

### Step 3: Cloudmersive API Integration

For each placeholder, the system calls the Cloudmersive API:

```javascript
POST https://api.cloudmersive.com/convert/edit/pptx/replace-all
Headers: Apikey: YOUR_CLOUDMERSIVE_KEY
Body: {
  inputFile: deck.pptx,
  matchString: "{{PLACEHOLDER}}",
  replaceString: "value"
}
```

### Step 4: Final File Generation

The system saves the processed file as `final.pptx` and serves it to the client.

## Placeholder System

The template uses the following placeholder format:

- `{{TITLE}}` - Main presentation title
- `{{SUBTITLE}}` - Presentation subtitle
- `{{S1_TITLE}}` - Slide 1 title
- `{{S1_BULLETS}}` - Slide 1 bullet points
- `{{S2_TITLE}}` - Slide 2 title
- `{{S2_BULLETS}}` - Slide 2 bullet points
- ... and so on for up to 10 slides

## Error Handling

The system includes comprehensive error handling:

- **Missing API Keys**: Returns specific error messages with setup instructions
- **OpenAI API Errors**: Handles rate limits, authentication, and content generation failures
- **Cloudmersive API Errors**: Handles file processing and placeholder replacement failures
- **File System Errors**: Manages temporary file creation and cleanup

## Usage Example

### Using cURL

```bash
curl -X POST http://localhost:3001/api/build-presentation \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Artificial Intelligence in Business",
    "audience": "Business executives",
    "style": "Professional and modern",
    "slides": 8,
    "presentationType": "business"
  }' \
  --output presentation.pptx
```

### Using JavaScript/Fetch

```javascript
const response = await fetch('/api/build-presentation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: 'Artificial Intelligence in Business',
    audience: 'Business executives',
    style: 'Professional and modern',
    slides: 8,
    presentationType: 'business'
  })
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'presentation.pptx';
  a.click();
}
```

## File Management

The system automatically manages temporary files:

1. Creates template files in the `generated/` directory
2. Processes files through Cloudmersive API
3. Serves the final file to the client
4. Cleans up temporary files after 5 seconds

## Security Considerations

- API keys are stored in environment variables
- Rate limiting is applied to prevent abuse
- File size limits are enforced
- Temporary files are automatically cleaned up
- Input validation is performed on all parameters

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Add your OpenAI API key to the `.env` file
   - Ensure the key is valid and has sufficient credits

2. **"Cloudmersive API key not configured"**
   - Add your Cloudmersive API key to the `.env` file
   - Sign up at [https://account.cloudmersive.com/](https://account.cloudmersive.com/)

3. **"Failed to build presentation"**
   - Check your API keys are correct
   - Ensure you have sufficient API credits
   - Check the server logs for detailed error messages

4. **File download issues**
   - Ensure the `generated/` directory exists and is writable
   - Check file permissions on the server

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your `.env` file. This will provide detailed console output for troubleshooting.

## Performance Notes

- The process typically takes 10-30 seconds depending on content complexity
- OpenAI API calls may have rate limits depending on your plan
- Cloudmersive API has usage limits based on your subscription
- Large presentations may require more processing time

## Future Enhancements

Potential improvements for the presentation builder:

1. **Custom Templates**: Allow users to upload their own PPTX templates
2. **Batch Processing**: Process multiple presentations simultaneously
3. **Advanced Styling**: More sophisticated design options
4. **Image Integration**: Add AI-generated images to slides
5. **Collaboration**: Real-time collaborative editing
6. **Version Control**: Track changes and revisions
