#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

VERCEL="./node_modules/.bin/vercel"

echo "=== SitePilot Vercel Deployment Automation ==="
echo "This script will link the project, set up environment variables, and deploy it to Vercel."
echo ""

# 1. Check if Vercel CLI is authenticated
echo "Checking Vercel CLI authentication status..."
if ! $VERCEL whoami >/dev/null 2>&1; then
  echo "You are not logged in to Vercel. Redirecting to login..."
  $VERCEL login
else
  echo "Logged in as: $($VERCEL whoami)"
fi

# 2. Link the project to Vercel
echo ""
echo "Linking the project to Vercel..."
$VERCEL link --yes

# 3. Upload environment variables from .env.local to Vercel
echo ""
echo "Reading environment variables from .env.local and adding them to Vercel..."
ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
  # Remove old environment variables to prevent conflicts and ensure clean state
  echo "Clearing existing production environment variables to ensure clean setup..."
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^# ]] || [ -z "$line" ]; then
      continue
    fi
    
    key=$(echo "$line" | cut -d'=' -f1)
    $VERCEL env rm "$key" production -y >/dev/null 2>&1 || true
  done < "$ENV_FILE"

  # Add environment variables
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^# ]] || [ -z "$line" ]; then
      continue
    fi
    
    key=$(echo "$line" | cut -d'=' -f1)
    value=$(echo "$line" | cut -d'=' -f2-)
    
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    echo "Adding variable: $key"
    echo -n "$value" | $VERCEL env add "$key" production >/dev/null 2>&1 || {
      echo "Failed to add $key. It may already be defined."
    }
  done < "$ENV_FILE"
  echo "Environment variables synchronized successfully!"
else
  echo "WARNING: .env.local file not found. Skipping environment variable synchronization."
fi

# 4. Trigger production deployment
echo ""
echo "Building and deploying to Vercel..."
$VERCEL deploy --prod --yes

echo ""
echo "=== Deployment Complete! ==="
