# TalentBridge Africa — HR Management Platform

A full-stack HR management and recruitment SaaS platform built for East African companies, starting with Uganda.

## Features (MVP)

| Module | Status |
|--------|--------|
| Company onboarding with AI suggestions | ✅ |
| Job posting with AI description generation | ✅ |
| Public job application form | ✅ |
| Resume upload and text extraction | ✅ |
| AI resume screening and scoring | ✅ |
| Candidate pipeline tracking | ✅ |
| Interview scheduling | ✅ |
| AI-generated email communications | ✅ |
| Offer letter generation (PDF) | ✅ |
| Employee profile management | ✅ |
| Employee onboarding checklist | ✅ |
| Performance review module | ✅ |
| People analytics dashboard | ✅ |
| AI HR assistant (chat) | ✅ |
| Role-based access control (8 roles) | ✅ |
| Uganda/East Africa compliance fields (NSSF, PAYE, TIN) | ✅ |
| Audit logs | ✅ |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Recharts
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (JWT) with RBAC
- **AI**: Anthropic Claude (claude-sonnet-4-6)
- **PDF**: pdf-lib
- **Email**: Nodemailer
- **File parsing**: Mammoth (DOCX)

---

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database (free options: [Neon](https://neon.tech), [Supabase](https://supabase.com), or local)
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/talentbridge"
NEXTAUTH_SECRET="generate-a-random-32-char-string"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."

# Optional (for email sending)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"
```

**Generate NEXTAUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set up the database

```bash
npm run setup
# This runs: prisma generate + prisma db push + seed
```

Or step by step:
```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:seed       # Load demo data
```

### 5. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Company Admin | admin@demo.com | demo1234 |
| HR Manager | hr@demo.com | demo1234 |

## Demo Public Job Links

- `http://localhost:3000/apply/senior-software-engineer-abc12345`
- `http://localhost:3000/apply/accountant-xyz67890`

---

## Project Structure

```
talentbridge/
├── app/
│   ├── (auth)/              # Login, Register pages
│   ├── (dashboard)/         # Protected HR pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── company/         # Company onboarding
│   │   ├── recruitment/     # Jobs + Candidates
│   │   ├── employees/       # Employee management
│   │   ├── onboarding/      # Onboarding tracker
│   │   ├── performance/     # Performance reviews
│   │   ├── analytics/       # People analytics
│   │   └── ai-assistant/    # AI chat interface
│   ├── apply/[slug]/        # Public job application
│   └── api/                 # API routes
├── components/
│   ├── layout/              # Sidebar, Header
│   └── ui/                  # Badges, KPI cards
├── lib/
│   ├── auth.ts              # NextAuth config + RBAC
│   ├── ai.ts                # Anthropic AI functions
│   ├── email.ts             # Email sending
│   ├── pdf.ts               # PDF generation
│   ├── prisma.ts            # Database client
│   ├── resume-parser.ts     # DOCX/PDF text extraction
│   └── utils.ts             # Utility functions
├── prisma/
│   ├── schema.prisma        # Full database schema
│   └── seed.ts              # Demo data
└── types/
    └── index.ts             # TypeScript types
```

---

## User Roles

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full platform access |
| `COMPANY_ADMIN` | Full company access |
| `HR_MANAGER` | All HR operations + analytics |
| `HR_OFFICER` | Recruitment, candidates, employees |
| `DEPARTMENT_MANAGER` | Own department employees + reviews |
| `SUPERVISOR` | Team performance reviews |
| `EMPLOYEE` | Own profile + onboarding tasks |
| `CANDIDATE` | Application form only |

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new company
- `POST /api/auth/[...nextauth]` — NextAuth handler

### Jobs
- `GET /api/jobs` — List jobs
- `POST /api/jobs` — Create job
- `GET /api/jobs/[id]` — Get job + candidates
- `PATCH /api/jobs/[id]` — Update job
- `GET /api/jobs/public/[slug]` — Public job (no auth)

### Candidates
- `GET /api/candidates` — List candidates (with filters)
- `POST /api/candidates` — Add candidate
- `GET /api/candidates/[id]` — Get candidate full profile
- `PATCH /api/candidates/[id]` — Update candidate
- `POST /api/candidates/[id]/screen` — Run AI screening
- `PATCH /api/candidates/[id]/status` — Update status
- `POST /api/candidates/[id]/interview` — Schedule interview

### Employees
- `GET /api/employees` — List employees
- `POST /api/employees` — Add employee
- `GET /api/employees/[id]` — Get employee profile
- `PATCH /api/employees/[id]` — Update employee

### AI
- `POST /api/ai` — HR assistant query
- `POST /api/ai/generate-job` — Generate job description
- `POST /api/company/ai-suggestions` — Company setup AI

### Others
- `POST /api/offers` — Generate offer letter PDF
- `POST /api/communications` — Generate + send email
- `POST /api/upload` — Upload resume/document
- `GET /api/analytics` — People analytics data
- `GET/POST/PATCH /api/performance` — Performance reviews

---

## Production Deployment

1. Switch `DATABASE_URL` to your production PostgreSQL
2. Set `NEXTAUTH_URL` to your production domain
3. Move file uploads to cloud storage (S3, Cloudinary) by updating `app/api/upload/route.ts`
4. Configure production SMTP
5. Deploy to Vercel, Railway, or your preferred host

---

## East Africa Compliance

The platform includes fields for Uganda compliance:
- **NSSF** (National Social Security Fund) number
- **TIN** (Tax Identification Number) for PAYE
- Employment contract tracking
- Probation period management
- Annual leave (21 days default per Ugandan labor law)
- Sick leave (10 days default)

Extendable for Kenya (NHIF, NSSF KE), Tanzania (NSSF TZ), Rwanda (RSSB).

---

Built with ❤️ for East African businesses.
