# Railway Worker Setup

Simple guide to deploy the Temporal worker to Railway.

## Quick Setup Steps

### 1. Create Railway Service

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Configure the Service

1. Click on the service that was created
2. Go to **Settings** tab
3. Configure:
   - **Root Directory**: Leave empty (use repo root) OR set to `.` (repo root)
   - **Build Command**: `cd core && npm install && npm run build`
   - **Start Command**: `cd core && npm run worker:prod`

**Important for Workspaces**: Since this is an npm workspace, Railway needs to:

- Run from repo root (to access root `package-lock.json`)
- Then `cd core` to build and run the worker

**Important**:

- Make sure `package-lock.json` is committed to your repo
- If Railway auto-runs `npm ci` and it fails, the build command above will override it
- If you see `npm ci` errors, commit the updated `package-lock.json` from running `npm install` locally

### 3. Set Environment Variables

Go to **Variables** tab and add:

```
TEMPORAL_ADDRESS=your-temporal-cloud-address:7233
TEMPORAL_API_KEY=your-temporal-api-key
TEMPORAL_NAMESPACE=your-temporal-namespace
DATABASE_URL=your-production-database-url
NODE_ENV=production
TEMPORAL_TASK_QUEUE=calendar-sync-queue
```

### 4. Deploy

Railway will auto-deploy. Check the **Logs** tab to see:

```
Worker starting...
Environment check:
  NODE_ENV: production
  TEMPORAL_ADDRESS: set
  TEMPORAL_NAMESPACE: set
  TEMPORAL_API_KEY: set
  Task Queue: calendar-sync-queue
✅ Connected to Temporal Cloud
🚀 Worker started, listening for tasks on queue: calendar-sync-queue
```

## Verify It's Working

1. **Check Railway Logs**: Should show worker is running
2. **Check Temporal UI**: Go to Workers tab, you should see your worker polling
3. **Test a Workflow**: Trigger a workflow from your app, it should execute

## Troubleshooting

- **Build fails with `npm ci` errors**:
  - The `package-lock.json` must be in sync with `package.json`
  - Run `npm install` in the `core/` directory locally
  - Commit and push the updated `package-lock.json`
  - Or change Build Command to: `npm install --legacy-peer-deps && npm run build`
- **Build fails**: Make sure Root Directory is set to `core`
- **Worker crashes**: Check environment variables are all set
- **No logs**: Wait 30 seconds after deploy, then check logs
- **Workflows still stuck**: Verify worker appears in Temporal UI Workers tab
