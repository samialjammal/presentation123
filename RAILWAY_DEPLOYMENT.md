# 🚀 Deploy AI Presentation Generator on Railway (No Credit Card Required!)

Railway is perfect for your AI Presentation Generator - it offers a free tier with $5 monthly credit and doesn't require a credit card!

## 📋 Prerequisites

1. **GitHub Account**: Your code must be pushed to a GitHub repository
2. **Railway Account**: Sign up at [railway.app](https://railway.app) (no credit card needed!)
3. **API Keys** (optional but recommended):
   - OpenAI API key: [Get it here](https://platform.openai.com/api-keys)
   - Cloudmersive API key: [Get it here](https://account.cloudmersive.com/)

## 🎯 Step-by-Step Railway Deployment

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Verify these files exist in your repository**:
   - ✅ `package.json`
   - ✅ `server.js`
   - ✅ `client/package.json`
   - ✅ `railway.json`
   - ✅ `Procfile`

### Step 2: Deploy on Railway

1. **Go to Railway Dashboard**:
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub (no credit card required!)

2. **Create New Project**:
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"

3. **Connect Your Repository**:
   - Select your AI presentation generator repository
   - Railway will automatically detect it's a Node.js app

4. **Configure the Service**:
   - **Name**: `ai-presentation-generator` (auto-generated)
   - **Environment**: Railway will auto-detect Node.js
   - **Plan**: Free (no credit card needed!)

5. **Click "Deploy"**

### Step 3: Set Environment Variables

After deployment starts, go to the **Variables** tab and add:

#### Required Variables:
```
NODE_ENV=production
PORT=3001
```

#### Optional Variables (for full functionality):
```
OPENAI_API_KEY=sk-your-openai-api-key-here
CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key-here
CANVA_CLIENT_ID=your-canva-client-id
CANVA_CLIENT_SECRET=your-canva-client-secret
```

**How to add environment variables**:
1. Go to your project dashboard
2. Click "Variables" tab
3. Click "New Variable"
4. Add each variable one by one
5. Click "Add"

### Step 4: Wait for Deployment

1. **Monitor the build process**:
   - Watch the build logs in real-time
   - Build takes 1-3 minutes
   - You'll see progress for installing dependencies and building React

2. **Check for success**:
   - Green status means deployment succeeded
   - Your app URL will be displayed (e.g., `https://ai-presentation-generator-production.up.railway.app`)

## 🔧 Railway-Specific Configuration

Railway automatically detects your Node.js app, but you can customize:

### Custom Domain (Optional)
1. Go to your project dashboard
2. Click "Settings" tab
3. Click "Custom Domains"
4. Add your domain

### Environment Variables
Railway makes it easy to manage environment variables:
- **Development**: Variables for development environment
- **Production**: Variables for production environment
- **Preview**: Variables for preview deployments

## 💰 Railway Free Tier Benefits

- **$5 credit monthly** (no credit card required!)
- **Automatic HTTPS**
- **Custom domains**
- **Automatic deployments** from GitHub
- **Preview deployments** for pull requests
- **Real-time logs**
- **Metrics and monitoring**

## 🔧 Troubleshooting Railway Issues

### Build Failures

**Issue**: Build fails during npm install
**Solution**: 
- Check that all dependencies are in package.json
- Ensure Node.js version is compatible (18+)

**Issue**: Build fails during React build
**Solution**:
- Check client/package.json has all required dependencies
- Verify build script works locally: `cd client && npm run build`

### Runtime Issues

**Issue**: App starts but shows errors
**Solution**:
- Check environment variables are set correctly
- Verify API keys are valid
- Check the logs in Railway dashboard

**Issue**: API endpoints return 404
**Solution**:
- Verify the server.js file is in the root directory
- Check that the PORT environment variable is set
- Ensure the health check endpoint `/api/health` works

## 🎉 Success!

Once deployed successfully, your app will be available at:
`https://your-app-name-production.up.railway.app`

### What Users Can Do:
- ✅ Generate AI-powered presentations
- ✅ Download PowerPoint files
- ✅ Use demo mode without API keys
- ✅ Access professional templates
- ✅ Choose from multiple AI models
- ✅ Customize presentation styles

## 📊 Monitoring Your App

### Railway Dashboard Features:
- **Logs**: View real-time application logs
- **Metrics**: Monitor CPU, memory usage
- **Deployments**: View deployment history
- **Variables**: Manage environment variables
- **Settings**: Configure custom domains, etc.

### Health Check:
Your app includes a health check endpoint:
`https://your-app-name-production.up.railway.app/api/health`

This should return: `{"status":"OK","timestamp":"..."}`

## 🔄 Updating Your App

To update your deployed app:

1. **Make changes to your code**
2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Update app"
   git push origin main
   ```
3. **Railway will automatically redeploy**
4. **Or manually redeploy** from Railway dashboard

## 💡 Railway Tips

### Cost Management:
- Monitor your usage in Railway dashboard
- $5 credit is usually enough for small apps
- Railway will pause your app if you run out of credit
- You can add more credit later if needed

### Performance:
- Railway provides good performance for free tier
- No cold starts like some other platforms
- Automatic scaling based on traffic

## 📞 Need Help?

If you encounter issues:

1. **Check Railway Documentation**: [docs.railway.app](https://docs.railway.app)
2. **Review Build Logs**: Available in your project dashboard
3. **Test Locally First**: Ensure everything works on your machine
4. **Check Environment Variables**: Verify all required variables are set

## 🎯 Next Steps

After successful deployment:

1. **Test all features** on your live app
2. **Share your app URL** with users
3. **Monitor usage** and performance
4. **Consider upgrading** to paid plan if you need more resources

---

**🎉 Congratulations! Your AI Presentation Generator is now live on Railway without needing a credit card!**
