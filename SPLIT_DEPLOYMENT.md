# 🚀 Split Deployment Guide (No Credit Card Required!)

Deploy your AI Presentation Generator with frontend and backend on separate free platforms - no credit card needed!

## 🎯 Deployment Strategy

- **Backend**: Railway (Node.js API)
- **Frontend**: Vercel or Netlify (React App)

## 📋 Prerequisites

1. **GitHub Account**: Your code must be pushed to a GitHub repository
2. **Railway Account**: [railway.app](https://railway.app) (no credit card needed!)
3. **Vercel Account**: [vercel.com](https://vercel.com) (no credit card needed!)
4. **API Keys** (optional): OpenAI, Cloudmersive, Canva

## 🚀 Step 1: Deploy Backend on Railway

### 1.1 Prepare Backend Repository

Create a separate repository for the backend or use your current one:

```bash
# If using current repository, create a backend branch
git checkout -b backend-only
git push origin backend-only
```

### 1.2 Deploy on Railway

1. **Go to Railway**: [railway.app](https://railway.app)
2. **Sign up** with GitHub (no credit card!)
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your repository** (or backend branch)
5. **Railway will auto-detect** Node.js app
6. **Click "Deploy"**

### 1.3 Configure Backend Environment Variables

In Railway dashboard → Variables tab:

```
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=sk-your-openai-api-key-here
CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key-here
CANVA_CLIENT_ID=your-canva-client-id
CANVA_CLIENT_SECRET=your-canva-client-secret
```

### 1.4 Get Your Backend URL

After deployment, note your Railway URL:
`https://your-app-name-production.up.railway.app`

## 🎨 Step 2: Deploy Frontend on Vercel

### 2.1 Prepare Frontend Configuration

Update your frontend to use the Railway backend URL:

1. **Set environment variable** in Vercel:
   ```
   REACT_APP_API_URL=https://your-app-name-production.up.railway.app
   ```

2. **Or update the config file** (`client/src/config.js`):
   ```javascript
   production: {
     apiUrl: 'https://your-app-name-production.up.railway.app'
   }
   ```

### 2.2 Deploy on Vercel

1. **Go to Vercel**: [vercel.com](https://vercel.com)
2. **Sign up** with GitHub (no credit card!)
3. **Import Project** → Select your repository
4. **Configure build settings**:
   - **Framework Preset**: Other
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

5. **Set Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-app-name-production.up.railway.app
   ```

6. **Click "Deploy"**

## 🌐 Alternative: Deploy Frontend on Netlify

### 2.1 Deploy on Netlify

1. **Go to Netlify**: [netlify.com](https://netlify.com)
2. **Sign up** with GitHub (no credit card!)
3. **New site from Git** → Select your repository
4. **Configure build settings**:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `build`

5. **Set Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-app-name-production.up.railway.app
   ```

6. **Click "Deploy site"**

## 🔧 Step 3: Configure CORS (if needed)

If you get CORS errors, update your backend `server.js`:

```javascript
// Update CORS configuration
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'https://your-netlify-app.netlify.app',
    'http://localhost:3000' // for local development
  ],
  credentials: true
}));
```

## 🎉 Success!

Your app is now deployed with:
- **Backend**: `https://your-app-name-production.up.railway.app`
- **Frontend**: `https://your-vercel-app.vercel.app` or `https://your-netlify-app.netlify.app`

## 📊 Benefits of Split Deployment

### Railway (Backend)
- ✅ $5 free credit monthly
- ✅ No credit card required
- ✅ Automatic HTTPS
- ✅ Real-time logs
- ✅ Easy environment variables

### Vercel/Netlify (Frontend)
- ✅ Completely free
- ✅ No credit card required
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments

## 🔄 Updating Your App

### Backend Updates:
1. Push changes to GitHub
2. Railway auto-deploys

### Frontend Updates:
1. Push changes to GitHub
2. Vercel/Netlify auto-deploys

## 💰 Cost Breakdown

- **Railway Backend**: $5/month credit (usually enough for small apps)
- **Vercel Frontend**: Completely free
- **Netlify Frontend**: Completely free
- **Total**: $5/month maximum (often less!)

## 🆘 Troubleshooting

### CORS Issues
- Check that your backend CORS settings include your frontend URL
- Verify environment variables are set correctly

### API Connection Issues
- Ensure `REACT_APP_API_URL` is set correctly
- Check that your Railway backend is running
- Verify the backend URL is accessible

### Build Issues
- Check that all dependencies are installed
- Verify build commands work locally
- Check platform-specific logs

## 🎯 Quick Commands

```bash
# Test backend locally
npm start

# Test frontend locally
cd client && npm start

# Check backend health
curl https://your-app-name-production.up.railway.app/api/health

# Push updates
git add .
git commit -m "Update app"
git push origin main
```

## 📞 Need Help?

1. **Railway Docs**: [docs.railway.app](https://docs.railway.app)
2. **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
3. **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)

---

**🎉 Congratulations! Your AI Presentation Generator is now live with split deployment - no credit card required!**
