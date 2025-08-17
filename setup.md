# AI Presentation Pro - Setup Guide 🚀

This guide will help you set up AI Presentation Pro and resolve the "Model access error" you're encountering.

## 🔑 OpenAI API Key Setup

### Step 1: Get an OpenAI API Key

1. **Visit OpenAI**: Go to [https://platform.openai.com/](https://platform.openai.com/)
2. **Sign Up/Login**: Create an account or log in to your existing account
3. **Navigate to API Keys**: Click on your profile → "API Keys"
4. **Create New Key**: Click "Create new secret key"
5. **Copy the Key**: Save the API key somewhere safe (you won't see it again)

### Step 2: Configure the API Key

1. **Open the .env file** in your project root:
   ```bash
   # If the file doesn't exist, create it
   cp env.example .env
   ```

2. **Add your API key**:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   PORT=3001
   NODE_ENV=development
   ```

3. **Save the file** and restart your server

### Step 3: Verify Setup

1. **Restart the server**:
   ```bash
   npm run dev
   ```

2. **Test the application** - you should now see "AI content generated successfully!" instead of the model access error

## 🆓 Free Tier Information

### OpenAI Free Tier
- **$5 credit** when you sign up
- **GPT-3.5 Turbo**: ~$0.002 per 1K tokens (very cheap!)
- **GPT-4o Mini**: ~$0.015 per 1K tokens
- **Typical presentation**: ~500-1000 tokens = $0.001-$0.015

### Cost Estimation
- **10-slide presentation**: ~$0.01-$0.02
- **$5 credit** = ~250-500 presentations
- **Very affordable** for most users

## 🎯 Demo Mode (No API Key Required)

If you don't want to set up an API key right now, the application will work in **Demo Mode**:

### Demo Mode Features
- ✅ **Professional presentations** generated instantly
- ✅ **All templates** available
- ✅ **PowerPoint download** works
- ✅ **No API key required**
- ⚠️ **Pre-generated content** (not AI-customized)

### Demo Mode Limitations
- Content is not specifically tailored to your topic
- Uses generic professional templates
- No AI-powered customization

## 🔧 Troubleshooting

### "Model access error" Solutions

1. **Check API Key Format**:
   ```env
   # Correct format
   OPENAI_API_KEY=sk-1234567890abcdef...
   
   # Wrong format
   OPENAI_API_KEY=your-openai-api-key-here
   ```

2. **Verify API Key**:
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Check if your key is active
   - Ensure you have sufficient credits

3. **Check Account Status**:
   - Verify your OpenAI account is active
   - Check if you have any billing issues
   - Ensure you're not rate-limited

4. **Environment Variables**:
   ```bash
   # Make sure the .env file is in the root directory
   ls -la .env
   
   # Check if the variable is loaded
   echo $OPENAI_API_KEY
   ```

### Common Issues

#### Issue: "Invalid API key"
**Solution**: 
- Double-check the API key format (should start with `sk-`)
- Make sure there are no extra spaces or characters
- Regenerate the API key if needed

#### Issue: "Insufficient credits"
**Solution**:
- Add payment method to your OpenAI account
- The free $5 credit should be sufficient for testing

#### Issue: "Rate limit exceeded"
**Solution**:
- Wait a few minutes before trying again
- Check your usage in the OpenAI dashboard

## 🚀 Quick Start (Demo Mode)

If you want to try the application immediately without setting up an API key:

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Open the application** in your browser:
   ```
   http://localhost:3000
   ```
   
   **Note:** The React app runs on port 3000 and proxies API requests to the backend on port 3001.

3. **Create a presentation** - it will work in demo mode with professional content

4. **Download the PowerPoint** - fully functional

## 💡 Pro Tips

### For Development
- Use demo mode for testing the UI
- Set up API key only when you need AI-generated content
- Monitor your OpenAI usage in the dashboard

### For Production
- Use environment variables for API keys
- Set up proper rate limiting
- Monitor costs and usage

### Cost Optimization
- Use GPT-3.5 Turbo for most presentations (cheaper)
- Use GPT-4 only for complex topics
- Set reasonable token limits

## 🆘 Still Having Issues?

1. **Check the console** for detailed error messages
2. **Verify your OpenAI account** has sufficient credits
3. **Try demo mode** to ensure the application works
4. **Contact support** if the issue persists

## 📞 Support

- **Documentation**: Check this README and SETUP.md
- **Issues**: Report bugs on GitHub
- **Discussions**: Ask questions in GitHub Discussions

---

**Happy presenting! 🎉**

Your AI Presentation Pro should now work perfectly with or without an API key!
