# 🔧 Build Troubleshooting Guide

## Issue: "Could not find a required file. Name: index.html"

This error occurs when the React build process can't find the `index.html` file in the `client/public` directory.

## ✅ Solutions

### Solution 1: Check File Structure
Make sure your project has this structure:
```
your-project/
├── package.json
├── server.js
├── client/
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── index.js
│       ├── App.js
│       └── index.css
```

### Solution 2: Verify index.html Exists
The `client/public/index.html` file should contain:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#2E86AB" />
    <meta
      name="description"
      content="AI-powered professional PowerPoint presentation generator"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>AI Presentation Generator</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

### Solution 3: Test Build Locally
Before deploying, test the build locally:
```bash
# Install dependencies
npm run install:all

# Test build
npm run build

# Check if build directory was created
ls -la client/build/
```

### Solution 4: Platform-Specific Fixes

#### For Railway:
1. Make sure your `railway.json` is configured correctly
2. Use the build command: `npm run install:all && npm run build`
3. Check that all files are committed to Git

#### For Render:
1. Use the build command: `npm run install:all && npm run build`
2. Make sure `render.yaml` is configured correctly

#### For Heroku:
1. Add `heroku-postbuild` script to package.json
2. Use the build command: `npm run build`

### Solution 5: Alternative Build Commands

If the standard build fails, try these alternatives:

#### Option A: Explicit Build
```bash
cd client && npm install && npm run build
```

#### Option B: Separate Steps
```bash
# Step 1: Install root dependencies
npm install

# Step 2: Install client dependencies
cd client && npm install

# Step 3: Build client
npm run build
```

#### Option C: Use Build Script
```bash
chmod +x build.sh && ./build.sh
```

## 🔍 Debugging Steps

### 1. Check Working Directory
Make sure the build process is running from the correct directory:
```bash
pwd  # Should show your project root
ls -la  # Should show package.json, server.js, client/
```

### 2. Check Client Directory
```bash
ls -la client/
ls -la client/public/
ls -la client/src/
```

### 3. Check npm Scripts
Verify your package.json has the correct scripts:
```json
{
  "scripts": {
    "build": "npm run install:all && npm run build:client",
    "build:client": "cd client && npm run build",
    "install:all": "npm install && cd client && npm install"
  }
}
```

### 4. Check React Scripts
Verify client/package.json has:
```json
{
  "scripts": {
    "build": "react-scripts build"
  }
}
```

## 🚨 Common Issues

### Issue 1: Missing Dependencies
**Error**: `Module not found`
**Solution**: Run `npm install` in both root and client directories

### Issue 2: Wrong Working Directory
**Error**: `Could not find a required file`
**Solution**: Make sure build runs from project root, not client directory

### Issue 3: Git Issues
**Error**: Files missing in deployment
**Solution**: Make sure all files are committed and pushed to Git

### Issue 4: Platform Limitations
**Error**: Build timeout or memory issues
**Solution**: Use simpler build process or upgrade platform plan

## 📞 Need Help?

If you're still having issues:

1. **Check the logs** in your deployment platform
2. **Test locally first** - if it works locally, it should work on the platform
3. **Verify all files** are committed to Git
4. **Check platform documentation** for specific requirements

## 🎯 Quick Fix

If you're in a hurry, try this simple approach:

1. **Delete node_modules** (both root and client)
2. **Clear npm cache**: `npm cache clean --force`
3. **Reinstall everything**: `npm run install:all`
4. **Test build**: `npm run build`
5. **Commit and deploy**

---

**Most build issues are resolved by ensuring the correct file structure and working directory!** 🚀
