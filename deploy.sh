#!/bin/bash

set -e

# Keep credentials out of shell tracing and Git configuration.
set +x
deploy_token="${GH_TOKEN:-}"
if [[ -z "$deploy_token" && -f .env ]]; then
  while IFS= read -r env_line || [[ -n "$env_line" ]]; do
    env_line="${env_line%$'\r'}"
    if [[ "$env_line" =~ ^[[:space:]]*(export[[:space:]]+)?GH_TOKEN[[:space:]]*=(.*)$ ]]; then
      deploy_token="${BASH_REMATCH[2]}"
      deploy_token="${deploy_token#"${deploy_token%%[![:space:]]*}"}"
      deploy_token="${deploy_token%"${deploy_token##*[![:space:]]}"}"
      if [[ "$deploy_token" == \"*\" || "$deploy_token" == \'*\' ]]; then
        deploy_token="${deploy_token:1:${#deploy_token}-2}"
      fi
    fi
  done < .env
fi

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
if [[ -n "$deploy_token" && "$(git remote get-url --push origin)" == https://github.com/* ]]; then
  GH_TOKEN="$deploy_token" GIT_TERMINAL_PROMPT=0 git \
    -c credential.helper= \
    -c 'credential.helper=!f() { if [ "$1" = get ]; then printf "%s\n" "username=x-access-token" "password=$GH_TOKEN"; fi; }; f' \
    push origin gh-pages -f
else
  git push origin gh-pages -f
fi
unset deploy_token
git checkout main
echo "✅ Deployment completed!"
