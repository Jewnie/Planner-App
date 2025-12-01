# Worker Deployment Guide

The Temporal worker must run as a **separate long-running service** (it cannot run on Vercel serverless).

## Quick Start: Railway (Recommended)

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub

### 2. Create New Service
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect it's a monorepo - **don't deploy yet**

### 3. Configure the Service
1. Click on the service
2. Go to **Settings** → **Service Name**: Change to "temporal-worker" or "planner-worker"
3. Go to **Settings** → **Root Directory**: Set to `core`
4. Go to **Settings** → **Build Command**: `npm install && npm run build`
5. Go to **Settings** → **Start Command**: `npm run worker:prod`

### 4. Set Environment Variables
Go to **Variables** tab and add:

```
TEMPORAL_ADDRESS=your-temporal-cloud-address:7233
TEMPORAL_API_KEY=your-temporal-api-key
TEMPORAL_NAMESPACE=your-temporal-namespace
DATABASE_URL=your-production-database-url
NODE_ENV=production
TEMPORAL_TASK_QUEUE=calendar-sync-queue
```

### 5. Deploy
1. Click "Deploy"
2. Check the **Logs** tab - you should see:
   ```
   Worker starting...
   ✅ Connected to Temporal Cloud
   🚀 Worker started, listening for tasks...
   ```

## Alternative: Render

### 1. Create Background Worker
1. Go to [render.com](https://render.com)
2. Click "New" → "Background Worker"
3. Connect your GitHub repository

### 2. Configure
- **Name**: `planner-worker`
- **Root Directory**: `core`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run worker:prod`
- **Environment**: `Docker` or `Nixpacks`

### 3. Set Environment Variables
Same as Railway above.

### 4. Deploy
Click "Create Background Worker" and monitor logs.

## Verify Worker is Running

### Check Temporal UI
1. Go to your Temporal Cloud UI
2. Navigate to **Workers** tab
3. You should see your worker listed, polling the `calendar-sync-queue`

### Check Worker Logs
- Railway: Go to service → **Logs** tab
- Render: Go to service → **Logs** tab

You should see:
```
Worker starting...
Environment check:
  NODE_ENV: production
  TEMPORAL_ADDRESS: set
  ...
✅ Connected to Temporal Cloud
🚀 Worker started, listening for tasks on queue: calendar-sync-queue
```

## Troubleshooting

### Worker not appearing in Temporal UI
- Check environment variables are set correctly
- Verify `TEMPORAL_NAMESPACE` matches exactly
- Check worker logs for connection errors

### Worker crashes on startup
- Check logs for error messages
- Verify `DATABASE_URL` is set (worker needs DB access for activities)
- Make sure code is compiled (`npm run build`)

### Workflows still stuck
- Wait 30 seconds after worker starts (it needs to connect)
- Check worker is polling the correct queue name
- Verify workflow is using the same queue: `calendar-sync-queue`

## Cost Estimate

- **Railway**: ~$5-10/month for a basic worker
- **Render**: Free tier available, then ~$7/month
- Both are very affordable for a single worker

## Next Steps

After deploying:
1. ✅ Worker should appear in Temporal UI
2. ✅ Stuck workflows should start processing
3. ✅ New workflows should execute immediately
4. ✅ Google Calendar webhooks should trigger workflows that get processed

