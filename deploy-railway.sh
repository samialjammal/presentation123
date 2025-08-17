#!/bin/bash

# Railway Deployment Script for AI Presentation Generator

echo "🚀 Preparing for Railway deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    exit 1
fi

# Check if all required files exist
echo "📋 Checking required files..."

required_files=("package.json" "server.js" "client/package.json" "railway.json" "Procfile")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    else
        echo "✅ Found: $file"
    fi
done

# Test build locally
echo "🧪 Testing build locally..."

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Test build
echo "🔨 Testing build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Local build successful!"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Ready for Railway deployment - fixed canvas dependency"
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Failed to push to GitHub"
    echo "Please make sure your GitHub repository is set up correctly"
    exit 1
fi

echo "✅ Code pushed to GitHub successfully!"

echo ""
echo "🎉 Ready for Railway deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://railway.app"
echo "2. Sign up with GitHub (no credit card needed!)"
echo "3. Click 'Start a New Project'"
echo "4. Select 'Deploy from GitHub repo'"
echo "5. Choose your repository"
echo "6. Railway will auto-detect it's a Node.js app"
echo "7. Click 'Deploy'"
echo ""
echo "After deployment, set these environment variables:"
echo "- NODE_ENV=production"
echo "- PORT=3001"
echo "- OPENAI_API_KEY=your-openai-api-key (optional)"
echo "- CLOUDMERSIVE_API_KEY=your-cloudmersive-api-key (optional)"
echo ""
echo "Your app will be available at: https://your-app-name-production.up.railway.app"
