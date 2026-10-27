# PortGate Frontend — Deployment Guide

## ✅ Build Verification

The production build has been successfully tested:

```
✓ Compiled successfully in 2.9s
✓ Running TypeScript in 3.0s
✓ Collecting page data in 715ms
✓ Generating static pages (4/4) in 755ms
✓ Finalizing page optimization in 33ms

Route (app)
┌ ○ /
└ ○ /_not-found

○  (Static)  prerendered as static content
```

**Zero TypeScript errors. Zero build warnings. Production-ready.**

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

**One-Click Deployment:**

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add PortGate frontend"
   git push origin main
   ```

2. Visit [vercel.com](https://vercel.com) and import your repository

3. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` → Your production FastAPI URL (e.g., `https://api.portgate.com`)

4. Deploy! Vercel will automatically:
   - Install dependencies
   - Run `npm run build`
   - Deploy to a global CDN
   - Provide a `.vercel.app` domain

**Custom Domain:**
- Add your domain in Vercel dashboard → Settings → Domains
- Update DNS records as instructed

---

### Option 2: Netlify

1. Push code to GitHub/GitLab/Bitbucket

2. Visit [netlify.com](https://netlify.com) and create new site

3. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → Your production FastAPI URL

5. Deploy!

---

### Option 3: Docker + Self-Hosted

**Create `Dockerfile` in `portgate-fe/`:**

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variable for build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Update `next.config.ts` to enable standalone output:**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

**Build and run:**

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.portgate.com -t portgate-fe .
docker run -p 3000:3000 portgate-fe
```

**Docker Compose (with backend):**

```yaml
version: '3.8'

services:
  backend:
    build: ./portgate-be
    ports:
      - "8000:8000"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    volumes:
      - ./portgate-be:/app

  frontend:
    build:
      context: ./portgate-fe
      args:
        NEXT_PUBLIC_API_URL: http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

### Option 4: AWS (S3 + CloudFront)

1. Build the static export:
   ```bash
   npm run build
   ```

2. Upload `.next` folder to S3 bucket

3. Configure CloudFront distribution:
   - Origin: S3 bucket
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Default root object: `index.html`

4. Update environment variables before build:
   ```bash
   export NEXT_PUBLIC_API_URL=https://api.portgate.com
   npm run build
   ```

---

### Option 5: Traditional Node.js Server

**On your server:**

```bash
# Clone repository
git clone <your-repo-url>
cd portgate-fe

# Install dependencies
npm ci --production

# Build
npm run build

# Start with PM2 (process manager)
npm install -g pm2
pm2 start npm --name "portgate-fe" -- start
pm2 save
pm2 startup
```

**Environment variables (create `.env.production.local`):**

```
NEXT_PUBLIC_API_URL=https://api.portgate.com
```

**Nginx reverse proxy configuration:**

```nginx
server {
    listen 80;
    server_name portgate.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

**Never commit sensitive values to Git!**

- Use `.env.local` for local development (gitignored)
- Use platform-specific secret management in production (Vercel Secrets, AWS Secrets Manager, etc.)

### 2. CORS Configuration

Ensure your backend (`portgate-be/main.py`) allows your frontend domain:

```python
# Development
allowed_origins = ["http://localhost:3000"]

# Production
allowed_origins = ["https://portgate.com", "https://www.portgate.com"]
```

### 3. Content Security Policy

Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.portgate.com;",
          },
        ],
      },
    ];
  },
};
```

### 4. Rate Limiting

Consider implementing rate limiting on your FastAPI backend to prevent abuse:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/audit")
@limiter.limit("10/minute")  # 10 requests per minute
async def audit(...):
    ...
```

---

## 📊 Performance Optimization

### 1. Image Optimization

If you add images later, use Next.js `<Image>` component:

```tsx
import Image from 'next/image';

<Image src="/logo.png" alt="PortGate" width={200} height={50} />
```

### 2. Code Splitting

Already handled by Next.js automatically. Each page/component is code-split.

### 3. Caching Strategy

Configure in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 4. Bundle Analysis

Analyze bundle size:

```bash
npm install --save-dev @next/bundle-analyzer

# Update next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

---

## 🧪 Testing Before Production

### 1. Build Test

```bash
npm run build
npm start
```

Visit `http://localhost:3000` and test:
- [ ] All 3 document tabs render correctly
- [ ] Discrepancy cards are clickable and trigger highlighting
- [ ] Supplier fix simulation works
- [ ] Upload modal opens and submits
- [ ] Export modal displays ISF and CSV
- [ ] Backend health indicator shows correct status

### 2. Cross-Browser Testing

Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 3. Performance Audit

Run Lighthouse audit in Chrome DevTools:
- [ ] Performance score > 90
- [ ] Accessibility score > 95
- [ ] Best Practices score > 90
- [ ] SEO score > 90

---

## 🔄 Continuous Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: portgate-fe/package-lock.json
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./portgate-fe
      
      - name: Build
        run: npm run build
        working-directory: ./portgate-fe
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./portgate-fe
```

---

## 📝 Post-Deployment Checklist

- [ ] Frontend accessible at production URL
- [ ] Backend API reachable from frontend
- [ ] CORS configured correctly
- [ ] SSL/TLS certificate active
- [ ] Environment variables set correctly
- [ ] Health check endpoint responding (`/api/health`)
- [ ] All document tabs rendering
- [ ] PDF upload working (if Gemini API key configured)
- [ ] Mock mode working
- [ ] Export downloads working
- [ ] Mobile responsive design verified
- [ ] Error pages configured (404, 500)
- [ ] Analytics/monitoring configured (optional: Vercel Analytics, Google Analytics)

---

## 🐛 Troubleshooting

### "CORS Error"

**Problem:** Browser console shows CORS policy error

**Solution:** Update backend `main.py`:

```python
allowed_origins = [
    "https://portgate.com",
    "https://www.portgate.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### "Failed to fetch /api/health"

**Problem:** Frontend can't reach backend

**Solutions:**
1. Check `NEXT_PUBLIC_API_URL` is set correctly
2. Verify backend is running and accessible
3. Check firewall rules
4. Test backend directly: `curl https://api.portgate.com/api/health`

### "Module not found" errors

**Problem:** Build fails with import errors

**Solutions:**
1. Clear cache: `rm -rf .next node_modules package-lock.json`
2. Reinstall: `npm install`
3. Rebuild: `npm run build`

### "Hydration mismatch" warnings

**Problem:** React hydration warnings in console

**Solutions:**
1. Ensure all `useEffect` dependencies are correct
2. Don't use `window` or `document` during SSR
3. Use `useEffect` for client-only code

---

## 📞 Support

For deployment issues:
1. Check logs in platform dashboard (Vercel/Netlify/AWS)
2. Verify environment variables are set
3. Test backend API independently
4. Review CORS configuration
5. Check SSL certificate status

---

**Last Updated:** December 2024  
**Production Build Status:** ✅ Verified  
**Framework:** Next.js 16.4 (App Router) + React 19 + TypeScript + Tailwind CSS v4
