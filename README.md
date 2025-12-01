# Planner App

A full-stack Household planning application built with TypeScript, tRPC, React, Temporal, and PostgreSQL.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Docker** and **Docker Compose** (for local database and Temporal instances)
- **Cloudflare Tunnel (cloudflared)** (required for webhooks in development) - See step 5 for installation
- **Git**

## Project Structure

This is a monorepo containing two main workspaces:

- **`core/`** - Backend server with tRPC API, Temporal workflows, and database logic
- **`dashboard/`** - Frontend React application with Vite

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Planner App"
```

### 2. Start Docker Services

The project uses Docker Compose to run PostgreSQL and Temporal services locally.

```bash
docker-compose up -d
```

This will start:

- **PostgreSQL** on port `5555` (mapped from container port 5432)
- **Temporal Server** on port `7234` (mapped from container port 7233)
- **Temporal UI** on port `8090` (mapped from container port 8080)

**Database Credentials:**

- Host: `localhost`
- Port: `5555`
- User: `devuser`
- Password: `devpassword`
- Database: `devdb`

**Temporal:**

- Server: `localhost:7234`
- UI: `http://localhost:8090`
- Namespace: `default` (for local development)

### 3. Install Dependencies

Install dependencies for all workspaces:

```bash
npm install
```

This will install dependencies for both the root workspace and the `core` and `dashboard` workspaces.

### 4. Set Up Environment Variables

Create a `.env` file in the `core/` directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://devuser:devpassword@localhost:5555/devdb

# Node Environment
NODE_ENV=dev

# Server Configuration
PORT=3000
# Note: These URLs should use your Cloudflare tunnel URLs (see step 5)
# For permanent tunnels, use your domain subdomains:
APP_URL=https://dashboard.yourdomain.com  # Frontend tunnel URL
API_URL=https://api.yourdomain.com         # Backend tunnel URL
# For quick tunnels, use the same tunnel URL for both (will change on restart)

# Temporal (for local development)
# NODE_ENV=dev will automatically use localhost:7234 with 'default' namespace !! very important to set to "dev" while working locally
# No additional Temporal env vars needed for local development

# Google Calendar (for calendar integration)
# GOOGLE_CLIENT_ID=your-client-id
# GOOGLE_CLIENT_SECRET=your-client-secret
# WEBHOOK_URL should match API_URL (webhooks go to the backend)
WEBHOOK_URL=https://api.yourdomain.com
# Note: WEBHOOK_URL is required for webhooks to work. See step 5 for Cloudflare Tunnel setup.
```

**Note:** For production, you'll need to set `TEMPORAL_ADDRESS`, `TEMPORAL_API_KEY`, and `TEMPORAL_NAMESPACE` if using Temporal Cloud.

### 5. Set Up Cloudflare Tunnel for Webhooks (Required for Calendar Integration)

Webhooks require your local server to be accessible from the internet. For local development, you'll need to use a tunnel service like Cloudflare Tunnel (cloudflared) to expose your local backend to receive webhook callbacks.

#### Install Cloudflare Tunnel

**macOS:**

```bash
brew install cloudflare/cloudflare/cloudflared
```

**Linux:**

```bash
# Download the latest release
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

**Windows:**
Download from [Cloudflare's releases page](https://github.com/cloudflare/cloudflared/releases) or use Chocolatey:

```bash
choco install cloudflared
```

#### Option 1: Quick Tunnel (Temporary - URL Changes on Restart)

For quick testing, you can use a temporary tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

This will output a URL like:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://random-words-1234.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

**Note:** This URL changes every time you restart the tunnel. For development, we recommend setting up a permanent tunnel (Option 2).

#### Option 2: Permanent Named Tunnel (Recommended)

For a persistent URL that doesn't change, set up a named tunnel with separate routes for your frontend and backend:

1. **Login to Cloudflare:**

   ```bash
   cloudflared tunnel login
   ```

   This will open your browser to authenticate with Cloudflare. Select the domain you want to use for the tunnel.

2. **Create a named tunnel:**

   ```bash
   cloudflared tunnel create planner-dev
   ```

3. **Configure the tunnel with multiple ingress rules:**

   Create a `config.yml` file in your home directory (or project root). This configuration routes different subdomains to different local services:

   ```yaml
   tunnel: planner-dev
   ingress:
     # Frontend (dashboard) - routes to Vite dev server
     - hostname: dashboard.yourdomain.com
       service: http://localhost:5173
     # Backend (API) - routes to Express server
     - hostname: api.yourdomain.com
       service: http://localhost:3000
     # Catch-all rule (must be last)
     - service: http_status:404
   ```

   Replace `yourdomain.com` with your actual domain name.

4. **Route DNS to the tunnel:**

   Cloudflare will automatically create DNS records, or you can create them manually:

   ```bash
   cloudflared tunnel route dns planner-dev dashboard.yourdomain.com
   cloudflared tunnel route dns planner-dev api.yourdomain.com
   ```

   Alternatively, create CNAME records in your Cloudflare dashboard:
   - `dashboard.yourdomain.com` → `{tunnel-id}.cfargotunnel.com`
   - `api.yourdomain.com` → `{tunnel-id}.cfargotunnel.com`

   You can find your tunnel ID by running:

   ```bash
   cloudflared tunnel list
   ```

5. **Run the tunnel:**

   ```bash
   cloudflared tunnel run planner-dev
   ```

   Or run it in the background:

   ```bash
   cloudflared tunnel run planner-dev &
   ```

6. **Verify the tunnel is working:**
   - Frontend: Visit `https://dashboard.yourdomain.com` (should show your Vite dev server)
   - Backend: Visit `https://api.yourdomain.com` (should show your API)

#### Update Environment Variables

After setting up your tunnel(s), update your `.env` file in the `core/` directory:

**For permanent tunnels (recommended):**

```env
# Use your permanent tunnel URLs
APP_URL=https://dashboard.yourdomain.com
API_URL=https://api.yourdomain.com
WEBHOOK_URL=https://api.yourdomain.com
```

**For quick tunnels (temporary):**

```env
# Use the temporary tunnel URL (will change on restart)
APP_URL=https://random-words-1234.trycloudflare.com
API_URL=https://random-words-1234.trycloudflare.com
WEBHOOK_URL=https://random-words-1234.trycloudflare.com
```

**Important Notes:**

- Keep the `cloudflared` process running while developing with webhooks
- The tunnel URL must be accessible via HTTPS (which Cloudflare provides automatically)
- Google Calendar requires HTTPS for webhook endpoints
- For permanent tunnels, the URLs remain the same across restarts
- Make sure both your frontend (port 5173) and backend (port 3000) are running when using the permanent tunnel setup

### 6. Set Up the Database

Run database migrations to set up the schema:

```bash
cd core
npm run db:push
```

Alternatively, you can generate migration files:

```bash
npm run db:generate
```

To open Drizzle Studio (database GUI):

```bash
npm run db:studio
```

### 7. Start the Development Servers

From the root directory, you can start both the backend and frontend:

**Option 1: Start everything from root (recommended)**

```bash
# Terminal 1: Start Cloudflare tunnel (if using permanent tunnel)
cloudflared tunnel run planner-dev

# OR if using quick tunnel:
# cloudflared tunnel --url http://localhost:3000

# Terminal 2: Start backend (server + worker)
cd core
npm run dev

# Terminal 3: Start frontend
cd dashboard
npm run dev
```

**Option 2: Start components individually**

```bash
# Terminal 1: Start Cloudflare tunnel (if using permanent tunnel)
cloudflared tunnel run planner-dev

# OR if using quick tunnel:
# cloudflared tunnel --url http://localhost:3000

# Terminal 2: Backend server only
cd core
npm run server:dev

# Terminal 3: Temporal worker only
cd core
npm run worker:dev

# Terminal 4: Frontend
cd dashboard
npm run dev
```

**Note:**

- If you're using webhooks (e.g., Google Calendar integration), keep the Cloudflare tunnel running in a separate terminal
- For permanent tunnels: The URLs remain constant (`dashboard.yourdomain.com` and `api.yourdomain.com`)
- For quick tunnels: The URL changes on each restart - update your `.env` file if it changes
- Make sure your `APP_URL`, `API_URL`, and `WEBHOOK_URL` environment variables match your tunnel configuration

The application should now be running:

- **Backend API**: `http://localhost:3000`
- **Frontend**: `http://localhost:5173` (Vite default)
- **Temporal UI**: `http://localhost:8090`

## Docker Services Management

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f db
docker-compose logs -f temporal
docker-compose logs -f temporal-ui
```

### Reset Database (⚠️ This will delete all data)

```bash
docker-compose down -v
docker-compose up -d
```

Then re-run migrations:

```bash
cd core
npm run db:push
```

## Development Workflow

### Running Scripts

**From root directory:**

- `npm run lint` - Lint all TypeScript files
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run build` - Build both core and dashboard

**From `core/` directory:**

- `npm run dev` - Start server and worker in development mode
- `npm run server` - Start server only
- `npm run worker` - Start Temporal worker only
- `npm run db:push` - Push database schema changes
- `npm run db:generate` - Generate migration files
- `npm run db:studio` - Open Drizzle Studio

**From `dashboard/` directory:**

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Quality

The project uses:

- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Make sure to run linting and formatting before committing:

```bash
npm run lint:fix
npm run format
```

## Accessing Services

Once everything is running, you can access:

- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Temporal UI**: http://localhost:8090
- **Drizzle Studio**: Run `npm run db:studio` in the `core/` directory

## Troubleshooting

### Database Connection Issues

1. **Check if Docker containers are running:**

   ```bash
   docker-compose ps
   ```

2. **Verify database is healthy:**

   ```bash
   docker-compose logs db
   ```

3. **Check DATABASE_URL in your `.env` file:**
   - Should be: `postgresql://devuser:devpassword@localhost:5555/devdb`
   - Port should be `5555` (not `5432`)

### Temporal Connection Issues

1. **Check if Temporal is running:**

   ```bash
   docker-compose logs temporal
   ```

2. **Verify NODE_ENV is set to `dev`:**
   - The code automatically connects to `localhost:7234` when `NODE_ENV=dev`
   - No additional Temporal environment variables needed for local development

3. **Check Temporal UI:**
   - Open http://localhost:8090 to see if Temporal is accessible

### Webhook Issues

1. **Webhooks not being received:**
   - Ensure `cloudflared` tunnel is running
     - For permanent tunnels: `cloudflared tunnel run planner-dev`
     - For quick tunnels: `cloudflared tunnel --url http://localhost:3000`
   - Verify `APP_URL`, `API_URL`, and `WEBHOOK_URL` in your `.env` all match your tunnel URLs
   - Check that your backend server is running on port 3000
   - Verify the webhook endpoint is accessible:
     - Permanent tunnel: `curl https://api.yourdomain.com/google-calendar-webhook`
     - Quick tunnel: `curl https://your-tunnel-url.trycloudflare.com/google-calendar-webhook`

2. **Tunnel URL changed (quick tunnels only):**
   - If you restart a quick tunnel, you'll get a new URL
   - Update `APP_URL`, `API_URL`, and `WEBHOOK_URL` in your `.env` file with the new URL
   - Restart your backend server to pick up the new environment variables
   - Re-register webhooks with Google Calendar if needed
   - **Note:** Permanent tunnels don't have this issue - the URLs remain constant

3. **Webhook registration fails:**
   - Ensure the tunnel URL uses HTTPS (Cloudflare provides this automatically)
   - Check that Google Calendar can reach your webhook endpoint
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
   - For permanent tunnels, verify DNS records are correctly configured

4. **Permanent tunnel not working:**
   - Verify the tunnel is running: `cloudflared tunnel run planner-dev`
   - Check your `config.yml` file has the correct ingress rules
   - Verify DNS records point to the tunnel: `cloudflared tunnel route dns list`
   - Ensure both frontend (port 5173) and backend (port 3000) services are running

### Port Conflicts

If you encounter port conflicts:

- **PostgreSQL (5555)**: Change the port mapping in `docker-compose.yml` and update `DATABASE_URL`
- **Temporal (7234)**: Change the port mapping in `docker-compose.yml` and update the connection in `core/src/workflows/temporal-client.ts`
- **Temporal UI (8090)**: Change the port mapping in `docker-compose.yml`
- **Backend (3000)**: Change `PORT` in your `.env` file
- **Frontend (5173)**: Vite will automatically use the next available port

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` (or remove it, as it defaults to production)
2. Configure production database connection string
3. Set Temporal Cloud credentials:
   - `TEMPORAL_ADDRESS`
   - `TEMPORAL_API_KEY`
   - `TEMPORAL_NAMESPACE`
4. Set `APP_URL` and `API_URL` to your production URLs
5. Configure Google Calendar credentials if using calendar integration

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Temporal Documentation](https://docs.temporal.io/)
- [tRPC Documentation](https://trpc.io/)
- [Better Auth Documentation](https://www.better-auth.com/docs)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and formatting: `npm run lint:fix && npm run format`
4. Test your changes locally
5. Submit a pull request

## License

[Add your license here]
