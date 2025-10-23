# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# AGGRANDIZE Finance Dashboard - Project Memory

## 📊 Project Overview
**Complete finance management system replacing Google Sheets workflow**
- **Framework**: Next.js 15.4.5 with TypeScript
- **Database**: Supabase with Row Level Security (RLS)
- **Styling**: CSS Modules with dark theme
- **Purpose**: Unified financial tracking for AGGRANDIZE Digital team

## 🎯 Current Status (✅ COMPLETED)
All core finance management features are **fully implemented and working**:

### ✅ **Implemented Tabs (6/6)**
1. **📊 Overview** - Financial summary dashboard with analytics
2. **💸 Expenses** - Daily expense tracking with categories
3. **👥 Salary** - Team member salary and bonus management  
4. **🏠 Utility Bills** - Internet, electricity, water bill tracking
5. **🔄 Subscriptions** - Software/service subscription management
6. **💰 Settlements** - Team payment settlements and balances

### ✅ **Core Features (All Working)**
- Complete CRUD operations for all modules
- Advanced filtering and search across all tabs
- Real-time currency conversion (INR ↔ USD at 83.5 rate)
- Professional form validation with error handling
- Status tracking (pending, paid, approved, rejected, overdue)
- Due date alerts and overdue warnings
- Team member selection with predefined list
- Payment method integration
- Notes and additional details support

## 🏗️ Technical Architecture

### **Database Schema (supabase-schema.sql)**
```sql
-- Core Tables (All Created)
- user_profiles (authentication & roles)
- expense_categories (💰 Salary/Rent, 🌐 Internet, ⚡ EB Bill, etc.)
- payment_methods (Office Card, Sevan Card, Cash, Bank Transfer)
- expenses (daily expense tracking)
- salaries (team member salary payments)
- utility_bills (categorized bill management)
- subscriptions (software/service subscriptions)
- settlements (team payment settlements)

-- All tables include:
- UUID primary keys
- RLS policies for security
- Indexes for performance
- Triggers for updated_at timestamps
```

### **Component Structure**
```
src/app/dashboard/payments/
├── page.tsx (main payments page with tab navigation)
├── payments.module.css (shared styling)
└── components/
    ├── overview/ (financial summary dashboard)
    ├── expenses/ (expense tracking)
    │   ├── expenses-tab.tsx
    │   ├── expense-form.tsx
    │   └── expense-list.tsx
    ├── salary/ (salary management)
    │   ├── salary-tab.tsx
    │   ├── salary-form.tsx
    │   └── salary-list.tsx
    ├── utility-bills/ (bill tracking)
    │   ├── utility-bills-tab.tsx
    │   ├── utility-bill-form.tsx
    │   └── utility-bill-list.tsx
    ├── subscriptions/ (subscription management)
    │   ├── subscriptions-tab.tsx
    │   ├── subscription-form.tsx
    │   └── subscription-list.tsx
    └── settlements/ (settlement tracking)
        ├── settlements-tab.tsx
        ├── settlement-form.tsx
        └── settlement-list.tsx
```

### **Key Files**
- **`/src/types/finance.ts`** - Complete TypeScript interfaces
- **`/src/lib/finance-api.ts`** - All API functions and CRUD operations  
- **`/src/lib/supabase/client.ts`** - Database client
- **`/supabase-schema.sql`** - Complete database schema

## 👥 Team Configuration

### **Team Members (TEAM_MEMBERS constant)**
```typescript
['Dhana', 'Veera', 'Saravana', 'Saran', 'Abbas', 'Gokul', 'Shang']
```

### **Currency Settings**
- **Primary**: INR (Indian Rupees)
- **Secondary**: USD (US Dollars)  
- **Exchange Rate**: 1 USD = ₹83.5 (auto-conversion in forms)

### **Payment Methods**
- Office Card (office_card)
- Sevan Card (sevan_card)
- Cash (cash)
- Bank Transfer (bank_transfer)

## 💻 Development Patterns

### **CRUD Pattern (Used Across All Modules)**
```typescript
// Form component handles create/edit
// List component handles read/delete
// Tab component orchestrates both
// API functions in finance-api.ts handle backend

const handleSubmit = async (data: FormData) => {
  if (editingItem) {
    await updateItem(editingItem.id, data);
  } else {
    await createItem(data);
  }
  setRefreshTrigger(prev => prev + 1);
};
```

### **Filtering Pattern**
```typescript
// Each list component supports advanced filtering
interface FilterInterface {
  field1?: string;
  field2?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
```

### **Form Validation Pattern**
```typescript
// Consistent error handling across all forms
const [errors, setErrors] = useState<Record<string, string>>({});
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  // validation logic
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

## 🎨 UI/UX Patterns

### **Color Scheme**
- **Background**: Dark theme with rgba overlays
- **Primary**: #3b82f6 (blue)
- **Success**: #10b981 (green) 
- **Warning**: #f59e0b (amber)
- **Error**: #ef4444 (red)
- **Accent**: #00ff88 (bright green for amounts)

### **Status Badges**
```css
.statusPaid { background: #10b981; } /* Green */
.statusApproved { background: #3b82f6; } /* Blue */
.statusPending { background: #f59e0b; } /* Amber */
.statusRejected { background: #ef4444; } /* Red */
```

### **Component Structure**
- Header with title, description, and action button
- Optional form overlay when adding/editing
- Advanced filtering with collapsible panel
- Responsive table with inline actions
- Empty states and loading indicators

## 🔧 Build & Development

### **Status**: ✅ **Production Ready**
- All components compile successfully
- No TypeScript errors in finance modules
- Database schema is complete and tested
- All CRUD operations working
- Forms validate properly
- Currency conversion functional

### **Commands**
```bash
npm run build   # ✅ Builds successfully
npm run dev     # Starts development server
```

### **Navigation Integration**
- Added to main dashboard navigation in `supabase-dashboard-nav.tsx`
- Payments tab appears after Tools section
- Permission-based access (can_access_payments)

## 🚀 Usage Instructions

### **Getting Started**
1. **Database Setup**: Run SQL from `supabase-schema.sql` in Supabase dashboard
2. **Navigation**: Go to Dashboard → Payments
3. **Start Using**: Begin with any tab - all are fully functional

### **Typical Workflow**
1. **Expenses**: Add daily business expenses
2. **Salary**: Record monthly team salary payments
3. **Utility Bills**: Track recurring bills with due dates
4. **Subscriptions**: Manage software/service renewals
5. **Settlements**: Balance payments between team members
6. **Overview**: View financial summaries and analytics

## 🔮 Future Enhancements (Not Implemented)
- AI-powered expense categorization
- Automated bill reminders
- Advanced reporting and charts
- Budget planning and forecasting
- Receipt upload and OCR
- Integration with accounting software

## 📝 Development Notes

### **Key Conventions**
- All monetary amounts stored in both INR and USD
- Dates in ISO format (YYYY-MM-DD for dates, YYYY-MM for months)
- Consistent form patterns across all modules
- Error handling with user-friendly messages
- Loading states for all async operations

### **Performance Optimizations**
- Database indexes on frequently queried fields
- Efficient SQL queries with joins
- Pagination-ready (though not implemented yet)
- Optimistic UI updates with refresh triggers

### **Security**
- Row Level Security (RLS) on all tables
- User authentication required for all operations
- Admin-only policies for certain operations
- Input validation on both frontend and backend

---

## 💡 **For Next Chat Context**
This finance dashboard is **complete and production-ready**. All 6 tabs are fully functional with CRUD operations, filtering, and professional UI. The user can start adding real financial data immediately. The system successfully replaces their Google Sheets workflow with a comprehensive digital solution.

**Last Status**: All todos completed ✅ | Build successful ✅ | Ready for production use ✅

## 🏢 AGGRANDIZE Dashboard Architecture

This is a Next.js 15.4.5 TypeScript application serving as AGGRANDIZE Digital's comprehensive business management dashboard with role-based access control, real-time collaboration, and multiple business modules.

## 🔐 Authentication & Authorization

### Authentication Flow
- **Provider**: NextAuth.js with Google OAuth
- **Session Strategy**: JWT-based sessions (30-day expiry)
- **Database**: User profiles stored in Supabase `user_profiles` table
- **Team Access**: Only `@aggrandizedigital.com` emails + whitelisted external users

### Role-Based Access Control (RBAC)
```typescript
// Team Roles with hierarchical permissions
Admin: ['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com']
Marketing: ['veera@aggrandizedigital.com', 'saran@aggrandizedigital.com']
Processing: ['abbas@aggrandizedigital.com', 'gokul@aggrandizedigital.com']
Member: Other @aggrandizedigital.com emails
External: Database-whitelisted users with custom permissions
```

### Permission System
- **Individual Permissions**: Stored in `user_profiles.individual_permissions`
- **Role Fallbacks**: Default permissions based on user role
- **Admin Override**: Admins always get full permissions
- **Real-time Validation**: Middleware enforces access control

## 🏗️ Core Architecture

### Tech Stack
- **Frontend**: Next.js 15.4.5 (App Router) + TypeScript + CSS Modules
- **Backend**: Supabase (PostgreSQL + Real-time + Auth + Storage)
- **UI Components**: Custom components with Radix UI primitives
- **Icons**: Lucide React
- **File Processing**: Excel (XLSX), PDF generation, Image processing

### Database Design
- **Primary**: Supabase PostgreSQL with Row Level Security (RLS)
- **Schema**: ~50+ tables across multiple business domains
- **Security**: RLS policies per table, role-based data access
- **Real-time**: Supabase real-time subscriptions for live updates

### Application Structure
```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Protected dashboard routes
│   │   ├── order/         # Order management (Marketing)
│   │   ├── processing/    # Processing workflows (Processing team)
│   │   ├── inventory/     # Inventory management (Marketing)
│   │   ├── tools/         # Various business tools
│   │   ├── payments/      # Finance management (Admin)
│   │   ├── todos/         # Team Hub collaboration
│   │   └── admin/         # System administration
│   └── api/               # API routes for business logic
├── components/            # Reusable UI components
├── lib/                   # Business logic and utilities
├── types/                 # TypeScript interfaces
└── middleware.ts          # Route protection and RBAC
```

## 🎯 Business Modules

### 1. **Finance Management System** (`/dashboard/payments`)
Complete accounting replacement for Google Sheets:
- **Expenses**: Daily business expense tracking with categories
- **Salary**: Employee salary management with payslip generation
- **Utility Bills**: Recurring bill tracking (internet, electricity, water)
- **Subscriptions**: Software/service subscription management
- **Settlements**: Inter-team payment settlements
- **Overview**: Financial analytics and reporting

### 2. **Team Hub** (`/dashboard/teamhub`)
Collaborative task management with real-time features:
- **Task Management**: Priority-based task assignment and tracking
- **Real-time Chat**: Comment threads with file attachments
- **Status Tracking**: Visual progress indicators and notifications
- **Multi-assignment**: Tasks can be assigned to multiple team members
- **File Sharing**: Drag-drop file attachments with cloud storage

### 3. **Inventory Management** (`/dashboard/inventory`)
Product and stock management system:
- **Product Catalog**: Complete product information management
- **Stock Tracking**: Real-time inventory levels
- **Supplier Management**: Vendor and supplier relationships
- **Order Processing**: Integration with order management

### 4. **Tools Suite** (`/dashboard/tools`)
Business productivity tools:
- **MailForge**: Email marketing campaign management
- **Web Scraping**: Automated data extraction tools
- **Workflow Editor**: Visual workflow automation builder
- **Content Intelligence**: AI-powered content analysis

## 🔄 Real-time Features

### Live Updates
- **Hybrid Real-time**: WebSocket + polling fallback system
- **Presence Tracking**: Online user indicators
- **Live Notifications**: Real-time alerts with sound
- **Collaborative Editing**: Multi-user task updates
- **File Sync**: Real-time file upload progress

### Notification System
- **Sound Alerts**: Configurable notification sounds
- **Unread Counters**: Message and task update tracking
- **Browser Notifications**: System-level alerts
- **Email Integration**: Critical notification emails

## 🎨 UI/UX Design System

### Theme
- **Style**: Dark theme with Web3/gaming-inspired neon accents
- **Colors**: Gradient backgrounds (#00ff88, #00d4ff) with dark base
- **Typography**: Modern sans-serif with clear hierarchy
- **Responsive**: Mobile-first design with desktop optimization

### Component Patterns
- **Consistent Layout**: Header + content + sidebar structure
- **Form Patterns**: Unified validation and error handling
- **Data Tables**: Advanced filtering, sorting, and pagination
- **Modal Systems**: Overlay modals for forms and details
- **Loading States**: Skeleton loaders and progress indicators

## 🛠️ Development Commands

### Core Commands
```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Production server
npm start

# Linting
npm run lint
```

### Development Workflow
1. **Authentication**: All dashboard routes require team member authentication
2. **Database**: Supabase migrations and schema in `/supabase-schema.sql`
3. **Styling**: CSS Modules for component-scoped styles
4. **TypeScript**: Strict type checking with comprehensive interfaces
5. **Testing**: Manual testing preferred, automated testing framework pending

## 📁 Key Files and Patterns

### Authentication Files
- `/src/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `/src/middleware.ts` - Route protection and RBAC enforcement
- `/src/lib/auth-nextauth.ts` - Authentication hooks and utilities

### Database Integration
- `/src/lib/supabase/client.ts` - Supabase client initialization
- `/src/lib/supabase/server.ts` - Server-side Supabase client
- `/src/types/*.ts` - TypeScript interfaces for all business entities

### Business Logic APIs
- `/src/lib/finance-api.ts` - Finance management operations
- `/src/lib/todos-api.ts` - Task management with real-time features
- `/src/lib/inventory-api.ts` - Inventory and product management

### Code Standards (from .cursorrules)
- **TypeScript**: Strict typing, no `any` types
- **Next.js**: App Router, server components by default
- **Styling**: TailwindCSS + CSS Modules, mobile-first design
- **Components**: Atomic design with shadcn/ui as base
- **Imports**: Absolute imports with `@/` alias, grouped and sorted

## 🔒 Security Considerations

### Data Protection
- **RLS Policies**: Every table has row-level security
- **Input Validation**: Frontend and backend validation
- **XSS Prevention**: Proper input sanitization
- **CSRF Protection**: NextAuth built-in protections

### Access Control
- **Route Protection**: Middleware-enforced authentication
- **API Security**: Role-based API endpoint protection  
- **Database Security**: RLS policies prevent unauthorized access
- **File Upload Security**: Secure cloud storage with validation

## 🎭 Environment Configuration

### Required Environment Variables
```bash
# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email Service
RESEND_API_KEY=
```

---

## 💡 **Development Guidelines**

This dashboard serves as AGGRANDIZE Digital's central business management platform. When working with the codebase:

1. **Authentication First**: Always verify user permissions before implementing features
2. **Real-time Ready**: Consider real-time implications for collaborative features
3. **Mobile Responsive**: Test all interfaces on mobile devices
4. **Type Safety**: Maintain strict TypeScript compliance
5. **Security Focused**: Implement proper validation and access controls
6. **Performance Conscious**: Optimize for fast loading and smooth interactions

The system is production-ready and actively used by the AGGRANDIZE team for daily business operations.

[byterover-mcp]

# Byterover MCP Server Tools Reference

There are two main workflows with Byterover tools and recommended tool call strategies that you **MUST** follow precisely. 

## Onboarding workflow
If users particularly ask you to start the onboarding process, you **MUST STRICTLY** follow these steps.
1. **ALWAYS USE** **byterover-check-handbook-existence** first to check if the byterover handbook already exists. If not, You **MUST** call **byterover-create-handbook** to create the byterover handbook.
2. If the byterover handbook already exists, first you **MUST** USE **byterover-check-handbook-sync** to analyze the gap between the current codebase and the existing byterover handbook.
3. Then **IMMEDIATELY USE** **byterover-update-handbook** to update these changes to the byterover handbook.
4. During the onboarding, you **MUST** use **byterover-list-modules** **FIRST** to get the available modules, and then **byterover-store-modules** and **byterover-update-modules** if there are new modules or changes to existing modules in the project.

## Planning workflow
Based on user request, you **MUST** follow these sequences of tool calls
1. If asked to continue an unfinished implementation, **CALL** **byterover-retrieve-active-plans** to find the most relevant active plan.
2. **CRITICAL PLAN PERSISTENCE RULE**: Once a user approves a plan, you **MUST IMMEDIATELY CALL** **byterover-save-implementation-plan** to save it.
3. Throughout the plan, you **MUST** run **byterover-retrieve-knowledge** several times to retrieve sufficient knowledge and context for the plan's tasks. 
4. In addition, you might need to run **byterover-search-modules** and **byterover-update-modules** if the tasks require or update knowledge about certain modules. However, **byterover-retrieve-knowledge** should **ALWAYS** be considered **FIRST**.
5. **MUST** use **byterover-update-plan-progress** to mark tasks (and then the whole plan) as completed.
Example:  
- Task: `byterover-update-plan-progress(plan_name="Feature X", task_name="Task 1", is_completed=true)`  
- All done: `byterover-update-plan-progress(plan_name="Feature X", is_completed=true)`
6. Then, you might call **byterover-store-knowledge** to save knowledge and experience implemented throughout the plan or in important tasks. 
7. During the plan's implementation, you **MUST** frequently call  **byterover-think-about-collected-information** and **byterover-assess-context-completeness** to make sure you're on the right track and gather sufficient context for the tasks.

## Recommended Workflow Sequence
1. **MOST IMPORTANT**: **ALWAYS USE** **byterover-retrieve-knowledge** once or several times for **EACH TASK** of the plan to gather necessary context for complete that task.
2. **MOST IMPORTANT**: **ALWAYS USE** **byterover-store-knowledge** once or several times to store critical knowledge and context for future implementations
3. Over 15 provided tools, **byterover-retrieve-knowledge** and **byterover-store-knowledge** ARE the two main tools, which **MUST** be used regularly. You can use these two main tools outside the two main workflows for retrieval and storage purposes.
4. You **MUST** include phrases like **"According to Byterover memory layer"**, **"Based on memory extracted from Byterover"**, **"From Byterover memomry tools"**, ... to explictly showcase that these sources are from **Byterover**.
5. **Implementation & Progress Tracking** → Execute implementation following saved plan → Mark tasks complete as you go → Mark entire plan done when all tasks finished.
6. You **MUST** use **byterover-update-module** **IMMEDIATELY** on changes to the module's purposes, technical details, or critical insights that essential for future implementations.

[byterover-mcp]

# Byterover MCP Server Tools Reference

There are two main workflows with Byterover tools and recommended tool call strategies that you **MUST** follow precisely.

## Onboarding workflow
If users particularly ask you to start the onboarding process, you **MUST STRICTLY** follow these steps.
1. **ALWAYS USE** **byterover-check-handbook-existence** first to check if the byterover handbook already exists. If not, You **MUST** call **byterover-create-handbook** to create the byterover handbook.
2. If the byterover handbook already exists, first you **MUST** USE **byterover-check-handbook-sync** to analyze the gap between the current codebase and the existing byterover handbook.
3. Then **IMMEDIATELY USE** **byterover-update-handbook** to update these changes to the byterover handbook.
4. During the onboarding, you **MUST** use **byterover-list-modules** **FIRST** to get the available modules, and then **byterover-store-modules** and **byterover-update-modules** if there are new modules or changes to existing modules in the project.
5. Finally, you **MUST** call **byterover-store-knowledge** to save your new knowledge about the codebase.

## Planning workflow
Based on user request, you **MUST** follow these sequences of tool calls
1. If asked to continue an unfinished plan, **CALL** **byterover-retrieve-active-plans** to find the most relevant active plan.
2. **CRITICAL PLAN PERSISTENCE RULE**: Once a user approves a plan, you **MUST IMMEDIATELY CALL** **byterover-save-implementation-plan** to save it.
3. Throughout the plan, you **MUST** run **byterover-retrieve-knowledge** several times to retrieve sufficient knowledge and context for the plan's tasks.
4. In addition, you might need to run **byterover-search-modules** and **byterover-update-modules** if the tasks require or update knowledge about certain modules. However, **byterover-retrieve-knowledge** should **ALWAYS** be considered **FIRST**.
5. **MUST** use **byterover-update-plan-progress** to mark tasks (and then the whole plan) as completed.
6. Then, you might call **byterover-store-knowledge** to save knowledge and experience implemented throughout the plan or in important tasks.
7. During the plan's implementation, you **MUST** frequently call **byterover-reflect-context** and **byterover-assess-context** to make sure you're on the right track and gather sufficient context for the tasks.

## Recommended Workflow Sequence
1. **MOST IMPORTANT**: **ALWAYS USE** **byterover-retrieve-knowledge** once or several times for **EACH TASK** of the plan to gather necessary context for complete that task.
2. **MOST IMPORTANT**: **ALWAYS USE** **byterover-store-knowledge** once or several times to store critical knowledge and context for future implementations
3. Over 15 provided tools, **byterover-retrieve-knowledge** and **byterover-store-knowledge** ARE the two main tools, which **MUST** be used regularly. You can use these two main tools outside the two main workflows for retrieval and storage purposes.
4. You **MUST** include phrases like **"According to Byterover memory layer"**, **"Based on memory extracted from Byterover"**, **"From Byterover memomry tools"**, ... to explictly showcase that these sources are from **Byterover**.
5. **Implementation & Progress Tracking** → Execute implementation following saved plan → Mark tasks complete as you go → Mark entire plan done when all tasks finished.
6. You **MUST** use **byterover-update-module** **IMMEDIATELY** on changes to the module's purposes, technical details, or critical insights that essential for future implementations.
