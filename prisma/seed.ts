import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

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

  console.log("Seed complete! Login: admin@demo.com / demo1234")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
