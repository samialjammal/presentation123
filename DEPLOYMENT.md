# AI Presentation Generator - Deployment Guide

This guide will help you deploy your AI Presentation Generator on various free hosting platforms.

## 🚀 Quick Deploy Options

### Option 1: Render (Recommended - Easiest)

**Step 1: Prepare Your Repository**
1. Push your code to GitHub
2. Make sure you have all the deployment files (Procfile, render.yaml, etc.)

**Step 2: Deploy on Render**
1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `ai-presentation-generator`
   - **Environment**: `Node`
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

**Step 3: Set Environment Variables**
In Render dashboard, go to Environment → Environment Variables:
```
NODE_ENV=production
PORT=10000
OPENAI_API_KEY=your-openai-api-key
CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key
CANVA_CLIENT_ID=your-canva-client-id
CANVA_CLIENT_SECRET=your-canva-client-secret
```

**Step 4: Deploy**
Click "Create Web Service" and wait for deployment.

### Option 2: Railway

**Step 1: Deploy on Railway**
1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect it's a Node.js app

**Step 2: Set Environment Variables**
In Railway dashboard, go to Variables tab:
```
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=your-openai-api-key
CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key
CANVA_CLIENT_ID=your-canva-client-id
CANVA_CLIENT_SECRET=your-canva-client-secret
```

**Step 3: Deploy**
Railway will automatically deploy your app.

### Option 3: Vercel (Frontend) + Railway (Backend)

**Backend Deployment (Railway)**
1. Follow Option 2 above for backend
2. Note your Railway app URL (e.g., `https://your-app.railway.app`)

**Frontend Deployment (Vercel)**
1. Go to [vercel.com](https://vercel.com) and sign up
2. Import your GitHub repository
3. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/build`
   - **Install Command**: `npm run install:all`

4. Set environment variables:
```
REACT_APP_API_URL=https://your-app.railway.app
```

5. Deploy

### Option 4: Netlify (Frontend) + Railway (Backend)

**Backend Deployment (Railway)**
1. Follow Option 2 above for backend
2. Note your Railway app URL

**Frontend Deployment (Netlify)**
1. Go to [netlify.com](https://netlify.com) and sign up
2. Click "New site from Git"
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `build`

5. Set environment variables:
```
REACT_APP_API_URL=https://your-app.railway.app
```

6. Deploy

## 🔧 Environment Variables

You'll need to set these environment variables on your hosting platform:

### Required Variables
```
NODE_ENV=production
PORT=3001 (or platform default)
```

### Optional Variables (for full functionality)
```
OPENAI_API_KEY=sk-your-openai-api-key
CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key
CANVA_CLIENT_ID=your-canva-client-id
CANVA_CLIENT_SECRET=your-canva-client-secret
```

## 📋 Pre-deployment Checklist

- [ ] All code is pushed to GitHub
- [ ] Environment variables are configured
- [ ] API keys are obtained and valid
- [ ] Build files are generated (`npm run build` works locally)
- [ ] Health check endpoint works (`/api/health`)

## 🐛 Troubleshooting

### Common Issues

**1. Build Failures**
- Check if all dependencies are in package.json
- Ensure Node.js version is compatible (18+ recommended)
- Verify build commands work locally

**2. Environment Variables**
- Make sure all required variables are set
- Check variable names match exactly (case-sensitive)
- Restart the service after adding variables

**3. Port Issues**
- Most platforms set PORT automatically
- Check platform documentation for port configuration

**4. API Endpoints Not Working**
- Verify CORS settings in server.js
- Check if frontend is pointing to correct backend URL
- Test API endpoints directly

### Debug Commands

```bash
# Test build locally
npm run install:all
npm run build

# Test server locally
npm start

# Check health endpoint
curl http://localhost:3001/api/health
```

## 🔗 Platform-Specific Notes

### Render
- Free tier: 750 hours/month
- Automatic HTTPS
- Custom domains supported
- Good for full-stack apps

### Railway
- Free tier: $5 credit/month
- Very fast deployments
- Good for Node.js apps
- Automatic HTTPS

### Vercel
- Free tier: Unlimited
- Great for frontend
- Automatic HTTPS
- Edge functions support

### Netlify
- Free tier: Unlimited
- Great for static sites
- Automatic HTTPS
- Form handling

## 📞 Support

If you encounter issues:
1. Check the platform's documentation
2. Review build logs in the platform dashboard
3. Test locally first
4. Check environment variables are set correctly

## 🎉 Success!

Once deployed, your AI Presentation Generator will be available at your platform's URL. Users can:
- Generate AI-powered presentations
- Download PowerPoint files
- Use demo mode without API keys
- Access professional templates

Remember to monitor your usage and API costs!
