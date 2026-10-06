#!/bin/bash

set -e

echo "🔁 Switching to main branch..."
git checkout main

echo "🔧 Deleting old 'gh-pages' branch if it exists..."
git branch -D gh-pages 2>/dev/null || echo "No existing gh-pages branch to delete"

echo "🌱 Creating fresh 'gh-pages' branch..."
git checkout -b gh-pages

echo "🛠 Building project..."
npm run build

echo "📁 Copying build files to root..."
cp -r ./build/* .

echo "📦 Committing deployment..."
git add .
git commit -am "deploy"

echo "🚀 Pushing to gh-pages..."
git push origin gh-pages -f
git checkout main
echo "✅ Deployment completed!"
