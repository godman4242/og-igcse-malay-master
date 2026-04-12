# Deployment Guide — IGCSE Malay Master

**Current Phase:** Phase 0 (localhost development) → Phase 1 (cloud with backend)

---

## Local Development (Phase 0)

### Prerequisites

- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/kheshav/igcse-malay-master.git
cd igcse-malay-master

# Install dependencies
npm install

# Start dev server (auto-reload)
npm run dev
# Opens at http://localhost:5173
```

### Development Workflow

```bash
# Lint code before committing
npm run lint

# Build for production (test locally)
npm run build

# Preview production build
npm run preview

# Run tests (Phase 1)
npm test
```

---

## Staging Deployment (Phase 1)

### Prerequisite: Vercel Setup

1. **Create Vercel account** at https://vercel.com
2. **Import GitHub repository**
   - Connect GitHub account
   - Select `igcse-malay-master` repo
   - Vercel auto-detects Vite config
3. **Set environment variables**
   - Go to Project Settings > Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`
4. **Enable Preview Deployments**
   - Go to Settings > Git > Preview Deployments
   - Set to "All" (deploy every PR)

### Deploying to Staging

**Automatic:** Every push to `develop` branch deploys to `igcse-malay-staging.vercel.app`

**Manual:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy staging
vercel --prod=false

# Deploy production
vercel --prod
```

### QA Checklist Before Merge to Main

- [ ] All routes load without errors (/, /study, /roleplay, /grammar, /writing, /import, /settings)
- [ ] Dark and light themes work
- [ ] localStorage persists across page reload
- [ ] No console errors (`F12` → Console tab)
- [ ] Mobile responsive (DevTools: 375px width)
- [ ] SM-2 algorithm updates intervals correctly
- [ ] Translation fallback works offline
- [ ] Speech API gracefully degrades if unavailable
- [ ] Can add, edit, delete cards
- [ ] Streak increments on daily review

---

## Production Deployment (Phase 1)

### Prerequisites

- Supabase project with schema initialized
- GitHub Actions secrets configured
- Vercel production project

### GitHub Secrets (for CI/CD)

Add to GitHub Settings > Secrets > Actions:

```
VERCEL_TOKEN        # From Vercel Settings > Tokens
VERCEL_ORG_ID       # From Vercel dashboard URL
VERCEL_PROJECT_ID   # From Vercel project settings
```

### Deployment Process

1. **Create release branch**
   ```bash
   git checkout -b release/v1.0.0
   ```

2. **Update version** (in package.json, optional but recommended)
   ```json
   { "version": "1.0.0" }
   ```

3. **Create PR to main**
   - GitHub Actions runs: lint → build → test
   - Manual QA in preview deployment
   - Once approved, merge to main

4. **Production Deploy** (automatic on merge to main)
   - GitHub Actions runs full CI/CD suite
   - Vercel deploys to production (`igcse-malay.vercel.app`)
   - Notify team of live release

### Rollback (if needed)

```bash
# Revert the last commit
git revert HEAD --no-edit
git push

# Vercel will auto-deploy previous working version
```

---

## Supabase Backend Setup (Phase 1)

### 1. Create Supabase Project

1. Sign up at https://supabase.com
2. Create new project (free tier)
3. Wait for database initialization (~1 min)

### 2. Initialize Database Schema

1. Go to SQL Editor
2. Copy-paste the schema from `src/config/supabase.js` → `SCHEMA_SQL` constant
3. Execute the SQL
4. Verify tables created: `users`, `card_state`, `study_session`, `roleplay_attempt`, `streak`

### 3. Configure Authentication

1. Go to Authentication > Providers
2. Enable Email/Password
3. Enable Google (optional)
   - Get Google OAuth credentials from https://console.cloud.google.com
   - Add Redirect URL: `https://yourdomain.com/auth/callback`

### 4. Get API Credentials

1. Go to Settings > API
2. Copy `Project URL` → `VITE_SUPABASE_URL`
3. Copy `anon public` key → `VITE_SUPABASE_KEY`
4. Add to `.env.local` and Vercel environment variables

### 5. Configure Row-Level Security (Phase 2)

```sql
-- Prevent users from seeing each other's cards
CREATE POLICY "Users can only see their own cards"
ON card_state FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own cards
CREATE POLICY "Users can insert their own cards"
ON card_state FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

## Monitoring & Alerts (Phase 2+)

### Vercel Analytics

- Real-time deployment dashboard at https://vercel.com/dashboard
- Monitor Web Vitals (LCP, FID, CLS)
- Check error logs in Function Logs section

### Sentry (Error Tracking)

1. Sign up at https://sentry.io
2. Create new project (React)
3. Install SDK:
   ```bash
   npm install @sentry/react
   ```
4. Initialize in `src/main.jsx`:
   ```javascript
   import * as Sentry from "@sentry/react"
   Sentry.init({ dsn: "YOUR_DSN" })
   ```

### Supabase Logs

Go to Supabase dashboard → Logs section to monitor:
- Auth errors
- Database errors
- API rate limits

---

## Performance Optimization

### Lighthouse Audit

```bash
# Build then audit
npm run build
npm run preview

# Open in Chrome DevTools: Lighthouse tab
# Target: 90+ on Performance, Accessibility, Best Practices
```

### Bundle Analysis

```bash
# Install analyzer
npm install --save-dev vite-plugin-visualizer

# Generate report
npm run build -- --mode analyze

# View dist/stats.html
```

### Caching Strategy

- **Static assets:** 1-year cache (Vercel auto-adds fingerprints)
- **HTML:** No cache (must be fresh for updates)
- **API responses:** 1-minute Supabase cache (configurable)

---

## Database Backups

### Automatic Backups (Supabase)

- Daily snapshots (free tier: 7-day retention)
- Stored in Supabase backup storage
- Restore via Dashboard > Database > Backups

### Manual Backup

```bash
# Export all user data (Phase 2)
curl -X GET "https://your-project.supabase.co/rest/v1/card_state?select=*" \
  -H "Authorization: Bearer $VITE_SUPABASE_KEY" \
  > backup.json
```

### User Data Export (GDPR)

Implement `/api/user/export` endpoint that returns:
- User profile
- All cards and progress
- All study sessions
- All roleplay attempts

Format: JSON or CSV

---

## Disaster Recovery Plan

**Scenario: Database corruption**

1. Stop app (prevent further writes)
2. Restore from Supabase backup
3. Notify users of data recovery
4. Redeploy with clean state

**Scenario: Code regression**

1. Revert GitHub commit
2. Vercel auto-deploys previous working version
3. Hotfix if needed, push new version

**Scenario: API key leaked**

1. Go to Supabase Settings > API
2. Regenerate anon key
3. Update environment variables in Vercel
4. Redeploy

---

## Scaling Checklist (Phase 2+)

- [ ] Database indexed for 1M+ rows
- [ ] API rate limiting configured
- [ ] CDN caching enabled
- [ ] Load testing passed (100 concurrent users)
- [ ] Error monitoring in place
- [ ] Uptime SLA 99.5%
- [ ] Data backup automated
- [ ] Team runbooks documented

---

## Environment Variables Checklist

**Development (.env.local)**
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Staging (Vercel staging project)**
```
VITE_SUPABASE_URL=https://staging.supabase.co
VITE_SUPABASE_KEY=staging-anon-key
```

**Production (Vercel production project)**
```
VITE_SUPABASE_URL=https://igcse-malay.supabase.co
VITE_SUPABASE_KEY=prod-anon-key
```

---

## Team Deployment Responsibilities

| Role | Task |
|------|------|
| Developer | Create PR, ensure CI passes |
| QA/Product | Test on staging, approve merge |
| DevOps | Monitor production, manage secrets |
| Support | Notify users of downtime |

---

## Troubleshooting

**Issue:** Vercel build fails with "node_modules not found"
- **Fix:** Ensure `npm ci` runs in build command

**Issue:** Supabase connection timeout
- **Fix:** Check firewall, verify `VITE_SUPABASE_URL` is correct

**Issue:** localStorage data not syncing to Supabase
- **Fix:** Check user is authenticated, verify RLS policies

**Issue:** Blank page after deploy
- **Fix:** Check for service worker cache (hard refresh: Cmd+Shift+R)

---

## Glossary

- **Preview Deployment:** Automatic staging deploy on PR
- **Production Deployment:** Live deployment for end users
- **Rollback:** Revert to previous working version
- **RLS:** Row-Level Security (database access control)
- **SLA:** Service Level Agreement (uptime guarantee)
