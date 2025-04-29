# Vercel Deployment Guide

This guide will help you deploy the Evalis-GT application to Vercel.

## Prerequisites

1. A Vercel account (https://vercel.com)
2. Git repository with your project

## Deployment Steps

### 1. Configure Environment Variables

Before deploying, you need to set up environment variables in Vercel:

1. Log in to your Vercel account
2. Create a new project or select your existing project
3. Go to "Settings" > "Environment Variables"
4. Add the following environment variables:

```
VITE_API_BASE_URL=https://your-app-name.vercel.app/api
VITE_AI_ANALYZER_API_KEY=your_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
```

Replace `your-app-name` with the name of your Vercel project, and provide the actual API keys.

### 2. Deploy to Vercel

#### Option 1: Deploy from Git

1. Connect your Git repository to Vercel
2. Configure your project settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Click "Deploy"

#### Option 2: Deploy using Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts to configure your project

### 3. Verify Deployment

After deployment completes:

1. Visit your Vercel URL (e.g., https://your-app-name.vercel.app)
2. Test the application functionality
3. Check that API calls are working correctly

## Troubleshooting

If you encounter issues with your deployment:

1. **API calls failing**: Verify your environment variables are set correctly
2. **Build errors**: Check the build logs in Vercel dashboard
3. **Routing issues**: Ensure vercel.json is properly configured

## Important Notes

- The backend API has been configured to work with serverless functions
- Static frontend assets are served from the `dist` directory
- API routes are handled by the `/api` directory 