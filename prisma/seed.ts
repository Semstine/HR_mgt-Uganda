import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { seedDscHrms } from "./seed-dsc"
import { seedDscExtended } from "./seed-dsc-extended"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding TalentBridge Africa (PostgreSQL)...")

  const company = await prisma.company.upsert({
    where: { id: "demo-company-001" },
    update: {},
    create: {
      id: "demo-company-001",
      name: "Acme Uganda Ltd",
      industry: "Technology",
      productsServices: "Software development and IT consulting for East African businesses",
      size: "51-200",
      location: "Kampala, Uganda",
      website: "https://acme.co.ug",
      currentHrProcess: "Excel spreadsheets and paper-based processes",
      setupComplete: true,
      settings: {
        create: {
          country: "Uganda", currency: "UGX", currencySymbol: "UGX",
          timezone: "Africa/Kampala", probationMonths: 3, annualLeaveDays: 21,
          sickLeaveDays: 10, maternityLeave: 60, paternityLeave: 4,
        },
      },
    },
  })

  const [engDept, hrDept, finDept, salesDept] = await Promise.all([
    prisma.department.upsert({ where: { id: "dept-eng" }, update: {}, create: { id: "dept-eng", name: "Engineering", companyId: company.id } }),
    prisma.department.upsert({ where: { id: "dept-hr" }, update: {}, create: { id: "dept-hr", name: "Human Resources", companyId: company.id } }),
    prisma.department.upsert({ where: { id: "dept-fin" }, update: {}, create: { id: "dept-fin", name: "Finance", companyId: company.id } }),
    prisma.department.upsert({ where: { id: "dept-sales" }, update: {}, create: { id: "dept-sales", name: "Sales & Marketing", companyId: company.id } }),
  ])

  const hash = await bcrypt.hash("demo1234", 12)
  await prisma.user.upsert({ where: { email: "admin@demo.com" }, update: {}, create: { email: "admin@demo.com", name: "Sarah Nakibuuka", password: hash, role: "COMPANY_ADMIN", companyId: company.id } })
  await prisma.user.upsert({ where: { email: "hr@demo.com" }, update: {}, create: { email: "hr@demo.com", name: "James Okello", password: hash, role: "HR_MANAGER", companyId: company.id } })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const devJob = await prisma.job.upsert({
    where: { publicSlug: "senior-software-engineer-abc12345" },
    update: {},
    create: {
      title: "Senior Software Engineer", companyId: company.id, departmentId: engDept.id,
      location: "Kampala, Uganda", employmentType: "FULL_TIME",
      description: "We are looking for an experienced Senior Software Engineer.",
      responsibilities: "- Design and develop high-quality software\n- Lead technical architecture\n- Mentor junior developers",
      requiredSkills: ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"],
      preferredSkills: ["Next.js", "AWS", "Docker"],
      experienceLevel: "Senior Level (5-8 years)",
      education: "Bachelor degree in Computer Science or related field",
      salaryMin: 3000000, salaryMax: 6000000, currency: "UGX",
      deadline: new Date("2025-08-31"), status: "ACTIVE",
      screeningKeywords: ["JavaScript", "TypeScript", "React", "Node.js", "software", "engineer"],
      interviewQuestions: ["Tell us about a challenging problem you solved.", "How do you approach system design?", "How do you ensure code quality?"],
      aiApproved: true, publicSlug: "senior-software-engineer-abc12345",
      embedCode: "<a href=\"" + appUrl + "/apply/senior-software-engineer-abc12345\">Apply Now</a>",
    },
  })

  const accJob = await prisma.job.upsert({
    where: { publicSlug: "accountant-xyz67890" },
    update: {},
    create: {
      title: "Accountant", companyId: company.id, departmentId: finDept.id,
      location: "Kampala, Uganda", employmentType: "FULL_TIME",
      description: "We are seeking a qualified Accountant.",
      responsibilities: "- Prepare monthly financial statements\n- Handle PAYE, NSSF, and URA filings",
      requiredSkills: ["Accounting", "QuickBooks", "Excel", "PAYE", "NSSF", "URA compliance"],
      preferredSkills: ["CPA qualification", "Tally ERP"],
      experienceLevel: "Mid Level (2-5 years)",
      education: "Bachelor degree in Accounting or Finance. CPA preferred.",
      salaryMin: 1500000, salaryMax: 2500000, currency: "UGX",
      deadline: new Date("2025-07-15"), status: "ACTIVE",
      screeningKeywords: ["accountant", "accounting", "finance", "QuickBooks", "PAYE", "NSSF", "URA"],
      interviewQuestions: ["How familiar are you with URA filing?", "Describe your PAYE experience."],
      aiApproved: true, publicSlug: "accountant-xyz67890",
      embedCode: "<a href=\"" + appUrl + "/apply/accountant-xyz67890\">Apply Now</a>",
    },
  })

  await prisma.candidate.upsert({ where: { id: "cand-001" }, update: {}, create: { id: "cand-001", firstName: "David", lastName: "Ssemakula", email: "david.ssemakula@gmail.com", phone: "+256 701 234 567", location: "Kampala, Uganda", jobId: devJob.id, status: "SHORTLISTED", screeningScore: 87, screeningNotes: "Strong React and Node.js experience.", screeningData: { score: 87, breakdown: { skills: 90, experience: 88, education: 85, keywords: 85 }, strengths: ["Strong JS/TS"], gaps: ["No AWS"], recommendation: "shortlist", explanation: "Strong match." }, parsedSkills: ["JavaScript", "TypeScript", "React", "Node.js"], parsedJobTitles: ["Software Engineer"], parsedEmployers: ["Tech Solutions Uganda"], parsedYearsExp: 6, source: "public_link", applicationDate: new Date("2025-05-01") } })

  const histCount = await prisma.candidateStatusHistory.count({ where: { candidateId: "cand-001" } })
  if (histCount === 0) {
    await prisma.candidateStatusHistory.createMany({ data: [{ candidateId: "cand-001", toStatus: "RECEIVED", createdAt: new Date("2025-05-01") }, { candidateId: "cand-001", fromStatus: "RECEIVED", toStatus: "UNDER_REVIEW", reason: "AI screening completed", changedBy: "AI System", createdAt: new Date("2025-05-02") }, { candidateId: "cand-001", fromStatus: "UNDER_REVIEW", toStatus: "SHORTLISTED", reason: "Strong technical skills", changedBy: "Sarah Nakibuuka", createdAt: new Date("2025-05-05") }] })
  }

  await prisma.candidate.upsert({ where: { id: "cand-002" }, update: {}, create: { id: "cand-002", firstName: "Grace", lastName: "Achieng", email: "grace.achieng@yahoo.com", phone: "+256 782 345 678", location: "Kampala, Uganda", jobId: devJob.id, status: "UNDER_REVIEW", screeningScore: 64, source: "public_link", applicationDate: new Date("2025-05-03") } })
  await prisma.candidate.upsert({ where: { id: "cand-003" }, update: {}, create: { id: "cand-003", firstName: "Patrick", lastName: "Muwonge", email: "patrick.muwonge@gmail.com", phone: "+256 703 456 789", location: "Entebbe, Uganda", jobId: accJob.id, status: "INTERVIEW_SCHEDULED", screeningScore: 91, parsedSkills: ["Accounting", "QuickBooks", "PAYE", "NSSF"], parsedYearsExp: 4, source: "referral", applicationDate: new Date("2025-05-06") } })

  await prisma.employee.upsert({ where: { id: "emp-001" }, update: {}, create: { id: "emp-001", companyId: company.id, departmentId: engDept.id, employeeNumber: "EMP0001", firstName: "Michael", lastName: "Byaruhanga", email: "michael.byaruhanga@acme.co.ug", phone: "+256 704 111 222", jobTitle: "Lead Software Engineer", employmentType: "FULL_TIME", startDate: new Date("2023-01-15"), salary: 5500000, currency: "UGX", paymentFrequency: "monthly", nssfNumber: "NSSF123456", nssfRate: 5, tinNumber: "TIN789012", bankName: "Stanbic Bank Uganda", bankAccount: "9030012345678", contractType: "permanent", probationMonths: 3, probationEndDate: new Date("2023-04-15") } })
  await prisma.employee.upsert({ where: { id: "emp-002" }, update: {}, create: { id: "emp-002", companyId: company.id, departmentId: hrDept.id, employeeNumber: "EMP0002", firstName: "Patience", lastName: "Nakalembe", email: "patience.nakalembe@acme.co.ug", jobTitle: "HR Officer", employmentType: "FULL_TIME", startDate: new Date("2023-03-01"), salary: 2800000, currency: "UGX", contractType: "permanent" } })
  await prisma.employee.upsert({ where: { id: "emp-003" }, update: {}, create: { id: "emp-003", companyId: company.id, departmentId: salesDept.id, employeeNumber: "EMP0003", firstName: "Brenda", lastName: "Namugga", email: "brenda.namugga@acme.co.ug", jobTitle: "Business Development Manager", employmentType: "FULL_TIME", startDate: new Date("2024-01-10"), salary: 3500000, currency: "UGX", contractType: "permanent" } })

  await prisma.onboarding.upsert({ where: { employeeId: "emp-001" }, update: {}, create: { employeeId: "emp-001", completedTasks: ["personal_info","emergency_contact","bank_details","tax_info","nssf","contract_sign","policies","id_documents","orientation","it_setup","meet_team","first_week"], personalInfoComplete: true, emergencyContactComplete: true, bankDetailsComplete: true, contractSigned: true, policiesAcknowledged: true, orientationComplete: true, status: "complete", completedAt: new Date("2023-01-30") } })
  await prisma.onboarding.upsert({ where: { employeeId: "emp-003" }, update: {}, create: { employeeId: "emp-003", completedTasks: ["personal_info","emergency_contact","id_documents"], personalInfoComplete: true, emergencyContactComplete: true, status: "in-progress" } })

  const salaryHistCount = await prisma.salaryHistory.count({ where: { employeeId: "emp-001" } })
  if (salaryHistCount === 0) {
    await prisma.salaryHistory.createMany({ data: [{ employeeId: "emp-001", salary: 4500000, currency: "UGX", effectiveDate: new Date("2023-01-15"), reason: "Initial salary", approvedBy: "Sarah Nakibuuka" }, { employeeId: "emp-001", salary: 5500000, currency: "UGX", effectiveDate: new Date("2024-01-01"), reason: "Annual increment", approvedBy: "Sarah Nakibuuka" }] })
  }

  await prisma.performanceReview.upsert({ where: { id: "review-001" }, update: {}, create: { id: "review-001", employeeId: "emp-001", cycle: "ANNUAL", period: "2024 Annual Review", status: "COMPLETED", goalsScore: 88, skillsScore: 90, overallScore: 89, comments: "Michael has shown exceptional technical leadership.", promotionRecommended: true, dueDate: new Date("2025-01-31"), completedAt: new Date("2025-01-20") } })
  await prisma.performanceReview.upsert({ where: { id: "review-002" }, update: {}, create: { id: "review-002", employeeId: "emp-003", cycle: "QUARTERLY", period: "Q1 2025", status: "PENDING", dueDate: new Date("2025-04-15") } })

  const complianceCount = await prisma.complianceRecord.count({ where: { companyId: company.id } })
  if (complianceCount === 0) {
    await prisma.complianceRecord.createMany({ data: [{ companyId: company.id, employeeId: "emp-001", type: "nssf", title: "NSSF Registration - Michael Byaruhanga", status: "compliant" }, { companyId: company.id, employeeId: "emp-002", type: "nssf", title: "NSSF Registration - Patience Nakalembe", status: "pending", dueDate: new Date("2025-06-30") }, { companyId: company.id, employeeId: "emp-003", type: "contract", title: "Employment Contract - Brenda Namugga", status: "compliant" }, { companyId: company.id, employeeId: "emp-001", type: "paye", title: "PAYE Registration - Michael Byaruhanga", status: "compliant" }, { companyId: company.id, type: "leave_policy", title: "Annual Leave Policy Review", status: "pending", dueDate: new Date("2025-07-01") }] })
  }

  // ── Onboarding Paths ────────────────────────────────────────────────────────
  const engPath = await prisma.onboardingPath.upsert({
    where: { id: "path-engineering" },
    update: {},
    create: {
      id: "path-engineering", companyId: company.id,
      name: "Engineering Onboarding Path", department: "Engineering",
      role: "Engineer", employmentType: "FULL_TIME", durationDays: 30, isActive: true,
      description: "Standard onboarding for all engineering hires",
      steps: {
        create: [
          { title: "Welcome & Company Overview", description: "Watch welcome video and read company overview document", stepOrder: 1, ownerRole: "employee", dueOffsetDays: 1, isRequired: true },
          { title: "Complete Personal Information", description: "Fill in all personal details, emergency contacts, and residential address", stepOrder: 2, ownerRole: "employee", dueOffsetDays: 1, isRequired: true },
          { title: "Sign Employment Contract", description: "Review and digitally sign your employment contract", stepOrder: 3, ownerRole: "employee", dueOffsetDays: 2, isRequired: true },
          { title: "Submit ID & Compliance Documents", description: "Upload National ID/Passport, TIN, and NSSF information", stepOrder: 4, ownerRole: "employee", dueOffsetDays: 3, isRequired: true },
          { title: "Acknowledge HR Policies", description: "Read and acknowledge HR manual, code of conduct, and leave policy", stepOrder: 5, ownerRole: "employee", dueOffsetDays: 5, isRequired: true },
          { title: "IT Account Setup", description: "Create company email, assign system access, and issue equipment", stepOrder: 6, ownerRole: "it", dueOffsetDays: 2, isRequired: true },
          { title: "Submit Bank & Payroll Details", description: "Provide bank account details for payroll processing", stepOrder: 7, ownerRole: "employee", dueOffsetDays: 5, isRequired: true },
          { title: "Engineering Team Orientation", description: "Meet the engineering team, review codebase standards, and development workflow", stepOrder: 8, ownerRole: "supervisor", dueOffsetDays: 7, isRequired: true },
          { title: "Set 30/60/90-Day Goals", description: "Work with your supervisor to define initial performance goals", stepOrder: 9, ownerRole: "supervisor", dueOffsetDays: 10, isRequired: true },
          { title: "HR Sign-off", description: "HR Manager to confirm onboarding completion and issue employee card", stepOrder: 10, ownerRole: "hr", dueOffsetDays: 30, isRequired: true },
        ],
      },
    },
  })

  await prisma.onboardingPath.upsert({
    where: { id: "path-general" },
    update: {},
    create: {
      id: "path-general", companyId: company.id,
      name: "General Staff Onboarding", durationDays: 14, isActive: true,
      description: "Default onboarding for all new hires without a specific path",
      steps: {
        create: [
          { title: "Welcome & Orientation", description: "Welcome session with HR", stepOrder: 1, ownerRole: "hr", dueOffsetDays: 1, isRequired: true },
          { title: "Personal Information & Documents", description: "Complete personal info form and submit ID documents", stepOrder: 2, ownerRole: "employee", dueOffsetDays: 2, isRequired: true },
          { title: "Sign Employment Contract", stepOrder: 3, ownerRole: "employee", dueOffsetDays: 3, isRequired: true },
          { title: "Submit NSSF & TIN", stepOrder: 4, ownerRole: "employee", dueOffsetDays: 3, isRequired: true },
          { title: "Acknowledge Policies", stepOrder: 5, ownerRole: "employee", dueOffsetDays: 5, isRequired: true },
          { title: "Submit Bank Details", stepOrder: 6, ownerRole: "employee", dueOffsetDays: 7, isRequired: true },
          { title: "HR Sign-off", stepOrder: 7, ownerRole: "hr", dueOffsetDays: 14, isRequired: true },
        ],
      },
    },
  })

  await prisma.onboardingPath.upsert({
    where: { id: "path-internship" },
    update: {},
    create: {
      id: "path-internship", companyId: company.id,
      name: "Internship Onboarding Path", employmentType: "INTERNSHIP",
      durationDays: 7, isActive: true,
      description: "Lightweight onboarding for interns",
      steps: {
        create: [
          { title: "Welcome & Introductions", stepOrder: 1, ownerRole: "hr", dueOffsetDays: 1, isRequired: true },
          { title: "Submit Personal Details", stepOrder: 2, ownerRole: "employee", dueOffsetDays: 1, isRequired: true },
          { title: "Sign Internship Agreement", stepOrder: 3, ownerRole: "employee", dueOffsetDays: 2, isRequired: true },
          { title: "IT & Workspace Setup", stepOrder: 4, ownerRole: "it", dueOffsetDays: 2, isRequired: true },
          { title: "Meet Supervisor & Set Goals", stepOrder: 5, ownerRole: "supervisor", dueOffsetDays: 3, isRequired: true },
        ],
      },
    },
  })

  // ── Onboarding Materials ─────────────────────────────────────────────────────
  const matsCount = await prisma.onboardingMaterial.count({ where: { companyId: company.id } })
  if (matsCount === 0) {
    await prisma.onboardingMaterial.createMany({
      data: [
        { companyId: company.id, title: "Company Welcome Guide", description: "Overview of Acme Uganda Ltd, mission, values, and culture", category: "welcome", version: "2025.1", status: "active", appliesTo: "all", isRequired: true, uploadedBy: "Sarah Nakibuuka" },
        { companyId: company.id, title: "HR Policy Manual", description: "Comprehensive HR policies including leave, conduct, and grievance", category: "policy", version: "2025.1", status: "active", appliesTo: "all", isRequired: true, uploadedBy: "James Okello" },
        { companyId: company.id, title: "Code of Conduct", description: "Expected standards of professional behaviour", category: "policy", version: "2024.2", status: "active", appliesTo: "all", isRequired: true, uploadedBy: "James Okello" },
        { companyId: company.id, title: "Leave Policy", description: "Annual leave, sick leave, maternity/paternity leave entitlements", category: "policy", version: "2025.1", status: "active", appliesTo: "all", isRequired: true, uploadedBy: "James Okello" },
        { companyId: company.id, title: "NSSF/PAYE/TIN Information Guide", description: "Uganda NSSF and PAYE compliance information for employees", category: "compliance", version: "2025.1", status: "active", appliesTo: "all", isRequired: true, uploadedBy: "James Okello" },
        { companyId: company.id, title: "IT Usage Policy", description: "Company policy on use of IT systems, email, and internet", category: "it", version: "2024.1", status: "active", appliesTo: "all", isRequired: true, uploadedBy: "Sarah Nakibuuka" },
        { companyId: company.id, title: "Engineering Development Standards", description: "Coding standards, Git workflow, and PR review process", category: "role_specific", version: "2025.1", status: "active", appliesTo: "department", appliesValue: "Engineering", isRequired: true, uploadedBy: "Sarah Nakibuuka" },
        { companyId: company.id, title: "Payroll & Bank Details Form", description: "Form to collect employee bank account information for payroll", category: "payroll", version: "2025.1", status: "active", appliesTo: "all", isRequired: true, uploadedBy: "James Okello" },
        { companyId: company.id, title: "Health & Safety Guide", description: "Workplace health and safety procedures and emergency contacts", category: "general", version: "2024.1", status: "active", appliesTo: "all", isRequired: false, uploadedBy: "James Okello" },
        { companyId: company.id, title: "Probation Review Form", description: "Template for 3-month probation performance review", category: "compliance", version: "2025.1", status: "active", appliesTo: "all", isRequired: false, uploadedBy: "James Okello" },
      ],
    })
  }

  // ── Employee Onboarding (new system) ─────────────────────────────────────────
  const eo3Exists = await prisma.employeeOnboarding.findUnique({ where: { employeeId: "emp-003" } })
  if (!eo3Exists) {
    const eo3 = await prisma.employeeOnboarding.create({
      data: {
        employeeId: "emp-003", pathId: engPath.id,
        status: "in_progress", progressPercent: 30,
        assignmentReason: "Auto-matched on department: Engineering",
        assignedBy: "System",
        tasks: {
          create: [
            { title: "Welcome & Company Overview", ownerRole: "employee", status: "completed", dueDate: new Date("2024-01-11"), completedAt: new Date("2024-01-11") },
            { title: "Complete Personal Information", ownerRole: "employee", status: "completed", dueDate: new Date("2024-01-11"), completedAt: new Date("2024-01-11") },
            { title: "Sign Employment Contract", ownerRole: "employee", status: "completed", dueDate: new Date("2024-01-12"), completedAt: new Date("2024-01-12") },
            { title: "Submit ID & Compliance Documents", ownerRole: "employee", status: "pending", dueDate: new Date("2024-01-13") },
            { title: "Acknowledge HR Policies", ownerRole: "employee", status: "pending", dueDate: new Date("2024-01-15") },
            { title: "IT Account Setup", ownerRole: "it", status: "completed", dueDate: new Date("2024-01-12"), completedAt: new Date("2024-01-12") },
            { title: "Submit Bank & Payroll Details", ownerRole: "employee", status: "pending", dueDate: new Date("2024-01-15") },
            { title: "Engineering Team Orientation", ownerRole: "supervisor", status: "pending", dueDate: new Date("2024-01-17") },
            { title: "Set 30/60/90-Day Goals", ownerRole: "supervisor", status: "pending", dueDate: new Date("2024-01-20") },
            { title: "HR Sign-off", ownerRole: "hr", status: "pending", dueDate: new Date("2024-02-09") },
          ],
        },
      },
    })
    await prisma.onboardingActivityLog.create({
      data: { employeeOnboardingId: eo3.id, actorId: "System", action: "path_assigned", details: "Auto-matched on department: Engineering" },
    })
  }

  await seedDscHrms(prisma, hash)

  const [wakiso, mbarara, kotido, secretary, chairperson, scale] = await Promise.all([
    prisma.district.findUniqueOrThrow({ where: { code: 'WAK' } }),
    prisma.district.findUniqueOrThrow({ where: { code: 'MBA' } }),
    prisma.district.findUniqueOrThrow({ where: { code: 'KOT' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'secretary.wakiso@dsc.go.ug' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'chairperson.wakiso@dsc.go.ug' } }),
    prisma.salaryScale.findFirstOrThrow({ where: { scaleCode: 'U5' } }),
  ])
  await seedDscExtended(prisma, { wakiso, mbarara, kotido, secretary, chairperson, salaryScaleId: scale.id })

  console.log("Seed complete! Login: admin@demo.com / demo1234")
  console.log("DSC-HRMS demo login: secretary.wakiso@dsc.go.ug / demo1234")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
