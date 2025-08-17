#!/bin/bash

# Build script for Railway deployment

echo "🚀 Starting build process..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

# Build client
echo "🔨 Building React app..."
cd client && npm run build && cd ..

# Check if build was successful
if [ -d "client/build" ]; then
    echo "✅ Build successful! React app built in client/build"
else
    echo "❌ Build failed! client/build directory not found"
    exit 1
fi

echo "🎉 Build completed successfully!"
