# Railway Deployment Guide

This guide will help you deploy your Planner App to Railway, replacing Vercel.

## Architecture

Railway will run:
1. **API Server** - Express server serving both API and static frontend files
2. **Worker** (optional separate service) - Temporal worker for processing workflows

## Setup Steps

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your repository

### 2. Configure Main Service (API + Frontend)

Railway will auto-detect the `railway.json` configuration. The service will:

- **Root Directory**: Root of repo (or set to root if needed)
- **Build Command**: `cd core && npm install && npm run build` (builds both server and dashboard)
- **Start Command**: `cd core && npm start` (starts the Express server)

#### Manual Configuration (if needed):

1. Click on the service
2. Go to **Settings** tab
3. Set:
   - **Build Command**: `cd core && npm install && npm run build`
   - **Start Command**: `cd core && npm start`

### 3. Set Environment Variables

Go to **Variables** tab and add all required variables:

#### Required Variables:
```
DATABASE_URL=your-production-database-url
NODE_ENV=production
PORT=3000
```

#### Application URLs:
```
APP_URL=https://your-app.railway.app
API_URL=https://your-app.railway.app
```

#### Temporal (if using):
```
TEMPORAL_ADDRESS=your-temporal-cloud-address:7233
TEMPORAL_API_KEY=your-temporal-api-key
TEMPORAL_NAMESPACE=your-temporal-namespace
```

#### Google Calendar (if using):
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
WEBHOOK_URL=https://your-app.railway.app
```

#### Better Auth (if using):
```
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://your-app.railway.app
```

### 4. Add Worker Service (Optional but Recommended)

For Temporal workflows, create a separate worker service:

1. In Railway project, click **+ New** → **Service**
2. Select "GitHub Repo" → your same repository
3. Go to **Settings**:
   - **Root Directory**: `core`
   - **Build Command**: `npm install && npm run build:server`
   - **Start Command**: `npm run worker:prod`
4. Set same environment variables (except PORT not needed)
5. Name it "worker" or "temporal-worker"

### 5. Deploy

1. Railway will auto-deploy on git push
2. Or click **Deploy** button
3. Check **Logs** tab to see:
   ```
   🚀 Server running on port 3000
   ```

### 6. Get Your URL

1. Go to service → **Settings** → **Networking**
2. Generate a public domain or use Railway's default
3. Update `APP_URL` and `API_URL` environment variables with your Railway URL

## Differences from Vercel

### ✅ Advantages:
- Can run long-running processes (worker)
- Single service for API + frontend
- Better for background jobs
- More control over deployment

### ⚠️ Changes:
- Server must listen on `PORT` environment variable (Railway sets this)
- Static files served from Express (not separate CDN)
- Need to build dashboard before server starts

## Troubleshooting

### Build Fails
- Check logs for errors
- Ensure `dashboard` directory exists and has `package.json`
- Verify Node.js version (Railway uses Node 20 by default)

### Server Won't Start
- Check `PORT` environment variable is set
- Verify `npm start` command works locally
- Check logs for error messages

### Static Files Not Loading
- Ensure dashboard is built: `cd dashboard && npm run build`
- Check `dashboard/dist` directory exists after build
- Verify server is serving from correct path

### Worker Not Running
- Create separate worker service
- Check worker logs for connection errors
- Verify Temporal environment variables are set

## Migration Checklist

- [ ] Deploy to Railway
- [ ] Set all environment variables
- [ ] Update `APP_URL` and `API_URL` to Railway domain
- [ ] Test API endpoints
- [ ] Test frontend loads correctly
- [ ] Deploy worker service (if using Temporal)
- [ ] Update Google Calendar webhook URLs (if using)
- [ ] Update any external service URLs pointing to your app
- [ ] Test end-to-end functionality
- [ ] Update DNS/domain if using custom domain

## Cost Estimate

- **Railway**: ~$5-20/month depending on usage
- Free tier available for testing
- Pay-as-you-go pricing

## Next Steps

After deployment:
1. ✅ Your app should be accessible at Railway URL
2. ✅ API endpoints should work at `/api/*` and `/trpc/*`
3. ✅ Frontend should load at root URL
4. ✅ Worker should process Temporal workflows (if deployed)

