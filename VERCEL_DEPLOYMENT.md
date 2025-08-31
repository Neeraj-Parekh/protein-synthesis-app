# 🚀 Vercel Deployment Guide

## Quick Deploy to Vercel

### Option 1: One-Click Deploy (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNeeraj-Parekh%2Fprotein-synthesis-app)

### Option 2: Manual GitHub Integration

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Repository**
   - Click "New Project"
   - Import `Neeraj-Parekh/protein-synthesis-app`
   - Vercel will auto-detect the configuration

3. **Configure Environment Variables** (if needed)
   ```
   NODE_ENV=production
   VITE_API_URL=https://your-app.vercel.app/api
   DATABASE_URL=your-database-url
   JWT_SECRET=your-jwt-secret
   ```

4. **Deploy**
   - Click Deploy
   - Vercel will build and deploy automatically

## 🔄 Continuous Deployment from GitHub

### Automatic Deployments
- **Main Branch**: Deploys to production automatically
- **Pull Requests**: Creates preview deployments
- **Feature Branches**: Can be configured for staging

### Manual Control from GitHub
You can control deployments by:

1. **Push to main branch**: Triggers production deployment
2. **Create pull request**: Triggers preview deployment
3. **GitHub Actions**: Automated testing before deployment
4. **Repository settings**: Configure branch protection rules

### GitHub Actions Integration
The repository includes CI/CD workflows that:
- ✅ Run tests on frontend and backend
- 🔍 Check code quality and linting
- 🚀 Deploy to Vercel automatically
- 📧 Send notifications on deployment status

## 🏗️ Project Structure for Vercel

```
protein-synthesis-app/
├── frontend/                 # React + TypeScript app
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # FastAPI Python backend
│   ├── main.py              # Entry point
│   ├── requirements.txt
│   └── routers/
├── vercel.json              # Vercel configuration
├── requirements.txt         # Root Python dependencies
└── .vercelignore           # Files to ignore during deployment
```

## 🛠️ Vercel Configuration

The `vercel.json` file configures:
- **Frontend**: Builds React app with Vite
- **Backend**: Runs FastAPI with Python 3.11
- **Routing**: API routes go to backend, everything else to frontend
- **Environment**: Production optimizations

## 🌐 Live URLs

After deployment, you'll get:
- **Production**: `https://protein-synthesis-app.vercel.app`
- **Preview**: `https://protein-synthesis-app-git-branch.vercel.app`
- **API**: `https://protein-synthesis-app.vercel.app/api`

## 🔧 Post-Deployment Setup

1. **Database**: Configure production database (PostgreSQL recommended)
2. **AI Models**: Set up external AI service endpoints
3. **Authentication**: Configure JWT secrets
4. **Domain**: Optional custom domain setup
5. **Analytics**: Enable Vercel Analytics

## 📊 Monitoring & Control

### From GitHub:
- **Actions tab**: View deployment history
- **Environments**: See deployment status
- **Pull requests**: Preview deployments
- **Issues**: Track and resolve problems

### From Vercel Dashboard:
- **Deployments**: View all deployments
- **Functions**: Monitor serverless functions
- **Analytics**: Usage and performance metrics
- **Logs**: Debug production issues

## 🚨 Troubleshooting

### Common Issues:
1. **Build failures**: Check GitHub Actions logs
2. **API not working**: Verify Vercel function limits
3. **Environment variables**: Set in Vercel dashboard
4. **Large files**: Use external storage for AI models

### Quick Fixes:
- **Redeploy**: Push empty commit to trigger redeploy
- **Rollback**: Use Vercel dashboard to rollback to previous version
- **Debug**: Check Vercel function logs for errors

## 📝 Managing Changes from GitHub

### Workflow for Updates:
1. **Create feature branch**: `git checkout -b feature/new-feature`
2. **Make changes**: Edit code locally or on GitHub
3. **Create pull request**: Review changes with preview deployment
4. **Merge to main**: Automatic production deployment
5. **Monitor**: Check deployment status and logs

### Branch Strategy:
- `main`: Production deployments
- `develop`: Staging deployments (optional)
- `feature/*`: Preview deployments via PR

This setup gives you full control over deployments while maintaining automated CI/CD!
