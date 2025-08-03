# AGGRANDIZE Dashboard - Development Context

## Project Overview
**Brand:** AGGRANDIZE  
**Type:** Role-Based Access Control Dashboard  
**Goal:** Secure dashboard with 4 main sections and user role management

## Technology Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **Backend:** Supabase (future) + hardcoded auth (MVP)
- **Deployment:** Vercel
- **Repository:** GitHub

## User Authentication & Roles

### Users & Credentials
- **Password for all users:** Admin@123

### Admin Role
- **Email:** dhana@aggrandizedigital.com
- **Access:** All 4 tabs (Order, Processing, Inventory, Tools)

### Marketing Team
- **Users:** veera, saravana, saran
- **Access:** Order, Inventory, Tools (if admin allows)

### Processing Team  
- **Users:** abbas, gokul
- **Access:** Processing, Tools (if admin allows)

## Dashboard Tabs
1. **Order** - Order management section
2. **Processing** - Processing workflow section
3. **Inventory** - Inventory management section
4. **Tools** - Utility tools section

## Development Phases

### ✅ Phase 1: Project Setup & Structure
- [ ] Check Node.js version
- [ ] Create Next.js project with App Router
- [ ] Install TailwindCSS (pre-configured)
- [ ] Setup shadcn/ui components
- [ ] Create folder structure
- [ ] Setup environment files

### 🔄 Phase 2: Authentication System
- [ ] Create login page with form validation
- [ ] Implement hardcoded user credentials
- [ ] Create role-based logic
- [ ] Add session management
- [ ] Create protected route middleware

### ⏳ Phase 3: Dashboard Layout
- [ ] Create main dashboard layout
- [ ] Implement navigation (tabs)
- [ ] Add role-based tab visibility
- [ ] Create logout functionality
- [ ] Add placeholder content for tabs

### ⏳ Phase 4: Responsive Design
- [ ] Mobile-first responsive design
- [ ] Test across screen sizes
- [ ] UI polish and accessibility
- [ ] Cross-browser testing

### ⏳ Phase 5: Deployment
- [ ] Setup GitHub repository
- [ ] Configure Vercel deployment
- [ ] Environment variables setup
- [ ] Final testing and documentation

## Current Progress
**Current Phase:** Phase 1 - Project Setup & Structure  
**Current Step:** Checking Node.js version and creating project

## Next Immediate Steps
1. Check Node.js and npm versions
2. Run create-next-app command
3. Install and configure shadcn/ui
4. Create basic folder structure
5. Setup environment files

## File Structure (Planned)
```
aggrandize-dashboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── order/
│   │   │   ├── processing/
│   │   │   ├── inventory/
│   │   │   └── tools/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── auth/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── auth.ts
│   │   └── utils.ts
│   └── types/
│       └── auth.ts
├── .cursorrules
├── PROJECT_CONTEXT.md
└── package.json
```

## Code Standards
- Use TypeScript for all files
- Use shadcn/ui components for UI
- Follow Next.js App Router patterns
- Use Tailwind for all styling
- Implement proper role-based access control
- No hardcoded values (use constants)
- Use descriptive variable and function names
- Add proper TypeScript types for all data