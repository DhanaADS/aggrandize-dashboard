# Deploy Dashboard

Build and deploy the AGGRANDIZE Dashboard to Vercel.

## Pre-Deployment Checks

### 1. Check for Errors
```bash
npm run build
```
- Report any TypeScript errors
- Report any build warnings
- Ensure all tests pass (if any)

### 2. Check Git Status
```bash
git status
```
- List uncommitted changes
- Ask if changes should be committed before deploy

### 3. Environment Check
Verify required environment variables:
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- UMBREL_DATABASE_URL (if configured)

## Deployment Options

### Option 1: Vercel CLI (Recommended)
```bash
npx vercel --prod
```

### Option 2: Git Push (if connected)
```bash
git push origin main
```
Vercel auto-deploys from main branch.

### Option 3: Vercel Dashboard
Direct user to Vercel dashboard for manual deployment.

## Post-Deployment

### Verify Deployment
- Check deployment URL
- Test login functionality
- Verify database connections
- Check key pages load correctly

### Report
```
DEPLOYMENT COMPLETE
===================
URL: https://aggrandize-dashboard.vercel.app
Status: Success
Build Time: XX seconds
Commit: [commit hash]

Verified:
  [x] Homepage loads
  [x] Login works
  [x] Dashboard accessible
```

## Rollback
If issues found:
```bash
npx vercel rollback
```
