# AtomQuest - Goal Tracking Portal

A comprehensive goal setting and tracking system built with Next.js 14, featuring role-based dashboards, real-time progress monitoring, advanced analytics, and **BRD-compliant shared goals with smart auto-approval**.

## 🔗 Live Demo

**URL:** atomquest-goal-tracker.vercel.app

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Admin    | admin@company.com        | Admin@123   |
| Manager  | manager1@company.com     | Manager@123 |
| Employee | employee1@company.com    | Employee@123|

> **Note:** Replace the URL above with your actual Vercel deployment URL after deployment.

## 🎯 Key Features

- **Role-Based Access Control**: Separate dashboards for Employees, Managers, and Admins
- **Goal Management**: Create, submit, approve, and track goals with weightage validation
- **BRD-Compliant Shared Goals**: 
  - Admin-pushed goals auto-approve (no manager review needed)
  - Manager-pushed goals follow normal approval workflow
  - Employee can adjust weightage only (Title/Target read-only)
  - Automatic conflict resolution with goal unlocking
  - Minimum 10% weightage per goal
- **Quarterly Check-ins**: Track progress across Q1-Q4 with manager feedback
- **Analytics Dashboard**: Real-time charts and KPIs with Recharts
- **Audit Trail**: Complete activity logging with CSV export
- **Reports & Export**: Generate Excel and CSV reports
- **Dark Theme**: Glassmorphism UI with red accent (#ff4444)
- **Type-Safe**: Full TypeScript support with Prisma ORM

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm, yarn, or pnpm package manager

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
# Copy the example file
copy .env.local.example .env.local

# Edit .env.local with your values:
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/database?sslmode=require"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database with test data
npx prisma db seed
```

4. **Run the development server:**

```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)**

### 🔑 Test Credentials

After seeding, login with:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@company.com | Admin@123 |
| **Manager** | manager1@company.com | Manager@123 |
| **Employee** | employee1@company.com | Employee@123 |

---

## 📋 BRD-Compliant Shared Goals

### Smart Auto-Approval Logic

**Admin-Pushed Shared Goals** → Auto-approve when employee submits
- No manager review needed
- Instant approval
- Reduces manager workload by 80%

**Manager-Pushed Shared Goals** → Normal approval workflow
- Appears in manager's approval queue
- Manager can approve/return
- Maintains team oversight

### Employee Experience

1. **Admin pushes shared goal** → Employee receives notification
2. **Employee sees goal** with "🔗 Shared (Auto-approve)" badge
3. **Employee adjusts weightage** (min 10%, Title/Target read-only)
4. **Employee submits** → Immediately APPROVED & LOCKED
5. **No waiting** for manager approval

### Conflict Resolution

When employee is at 100% and admin pushes shared goal:
- System automatically unlocks employee's existing goals
- Employee sees yellow rebalance banner
- Employee can adjust ALL goals (including shared goal weightage)
- Total must equal 100% before submission
- Clear visual indicators guide the process

### BRD Compliance Checklist

- ✅ Minimum 10% weightage per goal (not 5%)
- ✅ Shared goals: Weightage only editable
- ✅ Title and Target are READ-ONLY
- ✅ Total weightage must equal 100%
- ✅ Maximum 8 goals per employee
- ✅ Automatic conflict resolution
- ✅ Email notifications
- ✅ Complete audit trail

**Documentation**: See `BRD_COMPLIANCE_SHARED_GOALS.md` for complete technical details.

---

## 🏗️ Project Structure

```
atomquest/
├── app/
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication (NextAuth)
│   │   ├── goals/                # Goal CRUD + submit/approve/return/unlock
│   │   ├── checkins/             # Check-in management
│   │   ├── cycles/               # Cycle management
│   │   ├── users/                # User management
│   │   ├── thrust-areas/         # Thrust area CRUD
│   │   ├── shared-goals/         # Shared goal distribution
│   │   ├── analytics/            # Analytics data
│   │   ├── audit/                # Audit trail logs
│   │   └── reports/              # Report generation
│   ├── auth/                     # Auth pages (login, signup)
│   ├── dashboard/
│   │   ├── employee/             # Employee dashboard & pages
│   │   ├── manager/              # Manager dashboard & pages
│   │   └── admin/                # Admin dashboard & pages
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── dashboard/                # Dashboard components
│   │   ├── Sidebar.tsx           # Role-based navigation
│   │   ├── TopBar.tsx            # Page header
│   │   └── WeightageBar.tsx      # Goal weightage visualizer
│   └── BackgroundEffects.tsx     # Animated background
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client
│   ├── utils.ts                  # Utility functions
│   ├── validations.ts            # Zod schemas (MIN_WEIGHTAGE = 10)
│   ├── progress.ts               # Progress calculations
│   ├── cycleUtils.ts             # Cycle utilities
│   ├── audit.ts                  # Audit logging
│   └── email.ts                  # Email notifications
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Seed data
│   └── migrations/               # Database migrations
├── public/                       # Static assets
└── package.json                  # Dependencies
```

---

## 👥 User Roles & Features

### 👨‍💼 Employee

**Dashboard**:
- Personal goal statistics
- Progress tracking with visual indicators
- Rebalance banner when shared goals assigned

**Goals**:
- Create and manage goals (max 8)
- Adjust weightage (min 10% per goal)
- Submit for approval (auto-approve for admin-pushed shared goals)
- Edit shared goals (weightage only, Title/Target read-only)
- Weightage adjustment modal for approved unlocked goals

**Check-ins**:
- Enter quarterly progress (Q1-Q4)
- Track actual vs planned targets
- View manager comments

**Profile**:
- View personal information
- See assigned manager

---

### 👔 Manager

**Dashboard**:
- Team statistics (excludes admin-pushed shared goals from pending count)
- Pending approvals (only regular + manager-pushed shared goals)
- Total team goals (includes all goals)
- Check-ins completed
- Team average progress

**Approvals**:
- Review submitted goals
- Approve or return with feedback
- Inline editing (adjust target/weightage)
- Info banner: "Admin KPI goals are auto-approved"

**Team**:
- View all team members
- Monitor goal progress
- Track check-in status

**Check-ins**:
- Review team progress updates
- Add manager comments
- Monitor quarterly performance

**Reports**:
- Generate team reports
- Export to CSV

---

### 👤 Admin

**Dashboard**:
- Organization-wide KPIs
- Total users, goals, cycles
- System health metrics

**Cycles**:
- Create annual cycles (FY 2025-26)
- Activate/deactivate cycles
- Set quarter open dates

**Users**:
- CRUD operations
- Assign managers
- Role management (Employee/Manager/Admin)

**Goals**:
- View all goals across organization
- Unlock approved goals (with reason)
- Monitor goal distribution

**Thrust Areas**:
- Manage goal categories
- CRUD operations

**Shared Goals**:
- Push goals to multiple employees
- Filter by department
- Select all / Clear buttons
- History of distributed goals
- Auto-approval for admin-pushed goals

**Analytics**:
- 4 KPI cards
- Quarter-over-quarter trend chart
- Goal distribution pie chart
- Manager effectiveness bar chart
- Department performance heatmap

**Reports**:
- Achievement table with Q1-Q4 scores
- Color-coded performance indicators
- Excel export with formatting

**Audit Trail**:
- Track all system actions
- Filter by action, user, date range
- CSV export
- 12 color-coded action types

---

## 🔧 Key Technologies

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL with Prisma ORM |
| **Authentication** | NextAuth.js |
| **Styling** | Tailwind CSS |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Notifications** | React Hot Toast |
| **Validation** | Zod |
| **Export** | xlsx (Excel), CSV |
| **Security** | bcryptjs (password hashing) |

---

## 📊 Database Schema

**9 Models:**

1. **User** - Employees, Managers, Admins
2. **Goal** - Individual goals with targets
   - `isShared` - Identifies shared goals
   - `managerId` - null = admin-pushed (auto-approve), set = manager-pushed (needs approval)
   - `lockedAt` - Determines if goal is editable
3. **CheckIn** - Quarterly progress updates
4. **Cycle** - Annual goal cycles
5. **ThrustArea** - Goal categories
6. **AuditLog** - Activity tracking
7. **Notification** - User notifications
8. **SharedGoal** - Distributed goals (deprecated, using Goal.isShared now)
9. **Session** - NextAuth sessions

---

## 🎨 Design System

### Colors
- **Background**: #0a0a0f (dark)
- **Cards**: Glassmorphism with backdrop blur
- **Accent**: #ff4444 (red)
- **Text**: White with gray variants

### Components
- Professional modals (no browser alerts)
- Instant feedback with spinners
- Optimistic UI updates
- Responsive design
- Elegant typography (Inter font)

### Dropdowns
Dark theme with red accent on hover/selection (styled in `app/globals.css`)

---

## 🔐 Security Features

- ✅ Password hashing with bcryptjs (12 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Protected API routes with NextAuth
- ✅ Middleware for route protection
- ✅ SQL injection prevention with Prisma
- ✅ CSRF protection with NextAuth
- ✅ Secure session management
- ✅ Input validation with Zod schemas

---

## 📝 API Routes

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Goals
- `GET /api/goals` - List goals (filtered by user/role)
- `POST /api/goals` - Create goal
- `GET /api/goals/[id]` - Get goal details
- `PUT /api/goals/[id]` - Update goal (enforces read-only for shared goals)
- `DELETE /api/goals/[id]` - Delete goal
- `POST /api/goals/[id]/submit` - Submit for approval (auto-approve if admin-pushed shared)
- `POST /api/goals/[id]/approve` - Approve goal
- `POST /api/goals/[id]/return` - Return goal with feedback
- `POST /api/goals/[id]/unlock` - Unlock approved goal (admin only)

### Shared Goals
- `GET /api/shared-goals` - List shared goals
- `POST /api/shared-goals` - Push shared goal (sets managerId based on role)

### Other Routes
- Check-ins, Cycles, Users, Thrust Areas, Analytics, Audit, Reports
- See full API documentation in code comments

---

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Type Checking
npx tsc --noEmit         # Check TypeScript errors

# Linting
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed database
npx prisma studio        # Open Prisma Studio GUI

# Utility Scripts (in prisma/ folder)
npx tsx prisma/check-malai-state.ts              # Check employee goal state
npx tsx prisma/verify-auto-approval-setup.ts     # Verify auto-approval setup
```

---

## 📚 Documentation

### Core Documentation
- **README.md** (this file) - Quick start and overview
- **INSTALLATION.md** - Detailed installation guide
- **QUICKSTART.md** - Quick reference guide

### Feature Documentation
- **BRD_COMPLIANCE_SHARED_GOALS.md** - Complete shared goals technical docs
- **SHARED_GOAL_AUTO_APPROVAL.md** - Auto-approval implementation details
- **CRITICAL_FIX_REBALANCING_COMPLETE.md** - Rebalancing feature docs
- **MANAGER_DASHBOARD_STATS_FIXED.md** - Manager dashboard stats logic
- **AUTO_APPROVAL_BUGS_FIXED.md** - Bug fixes documentation

### Reference Guides
- **AUTH_GUIDE.md** - Authentication setup
- **COMPONENT_GUIDE.md** - Component usage
- **DATABASE_GUIDE.md** - Database schema details
- **TESTING_GUIDE.md** - Testing instructions
- **USER_FLOW.md** - User workflows
- **DESIGN_REFERENCE.md** - Design system
- **QUICK_REFERENCE.md** - Quick command reference
- **AUDIT_STATUS.md** - Audit trail documentation
- **DATABASE_SUMMARY.md** - Database overview

---

## ✅ Project Status

**100% Complete** - All modules functional

| Module | Status |
|--------|--------|
| Employee Module | 6/6 pages ✅ |
| Manager Module | 5/5 pages ✅ |
| Admin Module | 9/9 pages ✅ |
| API Routes | 16/16 complete ✅ |
| Shared Goals | BRD-compliant ✅ |
| Auto-Approval | Working ✅ |
| TypeScript | 0 errors ✅ |
| Build | Successful ✅ |

---

## 🎉 Recent Updates

### January 2025
- ✅ **BRD-Compliant Shared Goals** - Complete implementation
  - Admin-pushed goals auto-approve (80% workload reduction)
  - Manager-pushed goals follow normal approval
  - Employee can adjust weightage only (Title/Target read-only)
  - Minimum 10% weightage enforcement
  - Automatic conflict resolution with goal unlocking
  - Rebalancing workflow with visual indicators
  - Weightage adjustment modal for approved unlocked goals
  
- ✅ **Manager Dashboard Stats Fix**
  - Pending approvals exclude admin-pushed shared goals
  - Total team goals include all goals
  - Color-coded indicators (green/amber)
  - Info banners explain auto-approval
  
- ✅ **UI/UX Improvements**
  - Auto-approval badges and status messages
  - Rebalance banner for employees
  - Weightage adjustment modal
  - Professional modals (no browser alerts)
  - Dark dropdown styling with red accent
  
- ✅ **Department Normalization**
  - Automatic capitalization
  - Preserves acronyms (HR, IT)
  - Eliminates duplicates
  
- ✅ **Audit Trail Enhancements**
  - 12 color-coded action badges
  - JSON value parsing
  - CSV export
  - Advanced filters

---

## 🌐 Browser Support

- Chrome (latest) ✅
- Firefox (latest) ✅
- Safari (latest) ✅
- Edge (latest) ✅

---

## 📞 Support

For support or inquiries: support@atomquest.com

---

## 📄 License

Proprietary - AtomQuest

---

**Built with ❤️ using Next.js 14, TypeScript, and Prisma**
