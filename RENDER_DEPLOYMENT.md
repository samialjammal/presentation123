# 🚀 Deploy AI Presentation Generator on Render

This guide will walk you through deploying your AI Presentation Generator on Render step by step.

## 📋 Prerequisites

1. **GitHub Account**: Your code must be pushed to a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **API Keys** (optional but recommended):
   - OpenAI API key: [Get it here](https://platform.openai.com/api-keys)
   - Cloudmersive API key: [Get it here](https://account.cloudmersive.com/)

## 🎯 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Verify these files exist in your repository**:
   - ✅ `package.json`
   - ✅ `server.js`
   - ✅ `client/package.json`
   - ✅ `render.yaml`
   - ✅ `Procfile`

### Step 2: Deploy on Render

1. **Go to Render Dashboard**:
   - Visit [render.com](https://render.com)
   - Sign in or create an account

2. **Create New Web Service**:
   - Click "New +" button
   - Select "Web Service"

3. **Connect GitHub Repository**:
   - Click "Connect a repository"
   - Select your AI presentation generator repository
   - Click "Connect"

4. **Configure the Service**:
   - **Name**: `ai-presentation-generator` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm run install:all` (auto-filled from render.yaml)
   - **Start Command**: `npm start` (auto-filled from render.yaml)
   - **Plan**: Free

5. **Click "Create Web Service"**

### Step 3: Set Environment Variables

After the service is created, go to the **Environment** tab and add these variables:

#### Required Variables:
```
NODE_ENV=production
PORT=10000
```

#### Optional Variables (for full functionality):
```
OPENAI_API_KEY=sk-your-openai-api-key-here
CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key-here
CANVA_CLIENT_ID=your-canva-client-id
CANVA_CLIENT_SECRET=your-canva-client-secret
```

**How to add environment variables**:
1. Go to your service dashboard
2. Click "Environment" tab
3. Click "Add Environment Variable"
4. Add each variable one by one
5. Click "Save Changes"

### Step 4: Wait for Deployment

1. **Monitor the build process**:
   - Watch the build logs in real-time
   - The build will take 2-5 minutes
   - You'll see progress for installing dependencies and building the React app

2. **Check for success**:
   - Green checkmark means deployment succeeded
   - Your app URL will be displayed (e.g., `https://ai-presentation-generator.onrender.com`)

## 🔧 Troubleshooting Common Issues

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
- Check the logs in Render dashboard

**Issue**: API endpoints return 404
**Solution**:
- Verify the server.js file is in the root directory
- Check that the PORT environment variable is set
- Ensure the health check endpoint `/api/health` works

### Performance Issues

**Issue**: App is slow to start
**Solution**:
- This is normal for free tier (cold starts)
- Consider upgrading to paid plan for better performance

## 🎉 Success!

Once deployed successfully, your app will be available at:
`https://your-app-name.onrender.com`

### What Users Can Do:
- ✅ Generate AI-powered presentations
- ✅ Download PowerPoint files
- ✅ Use demo mode without API keys
- ✅ Access professional templates
- ✅ Choose from multiple AI models
- ✅ Customize presentation styles

## 📊 Monitoring Your App

### Render Dashboard Features:
- **Logs**: View real-time application logs
- **Metrics**: Monitor CPU, memory usage
- **Deployments**: View deployment history
- **Environment**: Manage environment variables

### Health Check:
Your app includes a health check endpoint:
`https://your-app-name.onrender.com/api/health`

This should return: `{"status":"OK","timestamp":"..."}`

## 💰 Cost Management

### Free Tier Limits:
- **750 hours/month** (about 31 days)
- **512 MB RAM**
- **Shared CPU**
- **Sleep after 15 minutes of inactivity**

### Tips to Stay Free:
- Monitor your usage in Render dashboard
- The app will sleep when not in use (normal for free tier)
- First request after sleep may take 30-60 seconds

## 🔄 Updating Your App

To update your deployed app:

1. **Make changes to your code**
2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Update app"
   git push origin main
   ```
3. **Render will automatically redeploy** (if auto-deploy is enabled)
4. **Or manually redeploy** from Render dashboard

## 📞 Need Help?

If you encounter issues:

1. **Check Render Documentation**: [docs.render.com](https://docs.render.com)
2. **Review Build Logs**: Available in your service dashboard
3. **Test Locally First**: Ensure everything works on your machine
4. **Check Environment Variables**: Verify all required variables are set

## 🎯 Next Steps

After successful deployment:

1. **Test all features** on your live app
2. **Share your app URL** with users
3. **Monitor usage** and performance
4. **Consider upgrading** to paid plan if you need more resources

---

**🎉 Congratulations! Your AI Presentation Generator is now live on Render!**
