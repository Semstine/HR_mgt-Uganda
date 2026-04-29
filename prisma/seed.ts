import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const j = (v: unknown) => JSON.stringify(v)

async function main() {
  console.log('🌱 Seeding TalentBridge Africa...')

  const company = await prisma.company.upsert({
    where: { id: 'demo-company-001' },
    update: {},
    create: {
      id: 'demo-company-001',
      name: 'Acme Uganda Ltd',
      industry: 'Technology',
      productsServices: 'Software development and IT consulting for East African businesses',
      size: '51-200',
      location: 'Kampala, Uganda',
      website: 'https://acme.co.ug',
      currentHrProcess: 'Excel spreadsheets and paper-based processes',
      setupComplete: true,
      settings: {
        create: { country: 'Uganda', currency: 'UGX', currencySymbol: 'UGX', timezone: 'Africa/Kampala' },
      },
    },
  })

  const [engDept, hrDept, finDept, salesDept] = await Promise.all([
    prisma.department.upsert({ where: { id: 'dept-eng' }, update: {}, create: { id: 'dept-eng', name: 'Engineering', companyId: company.id } }),
    prisma.department.upsert({ where: { id: 'dept-hr' }, update: {}, create: { id: 'dept-hr', name: 'Human Resources', companyId: company.id } }),
    prisma.department.upsert({ where: { id: 'dept-fin' }, update: {}, create: { id: 'dept-fin', name: 'Finance', companyId: company.id } }),
    prisma.department.upsert({ where: { id: 'dept-sales' }, update: {}, create: { id: 'dept-sales', name: 'Sales & Marketing', companyId: company.id } }),
  ])

  const hash = await bcrypt.hash('demo1234', 12)

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', name: 'Sarah Nakibuuka', password: hash, role: 'COMPANY_ADMIN', companyId: company.id },
  })
  await prisma.user.upsert({
    where: { email: 'hr@demo.com' },
    update: {},
    create: { email: 'hr@demo.com', name: 'James Okello', password: hash, role: 'HR_MANAGER', companyId: company.id },
  })

  const devJob = await prisma.job.upsert({
    where: { publicSlug: 'senior-software-engineer-abc12345' },
    update: {},
    create: {
      title: 'Senior Software Engineer',
      companyId: company.id,
      departmentId: engDept.id,
      location: 'Kampala, Uganda',
      employmentType: 'FULL_TIME',
      description: 'We are looking for an experienced Senior Software Engineer to join our growing engineering team.',
      responsibilities: '• Design and develop high-quality software\n• Lead technical architecture decisions\n• Mentor junior developers\n• Conduct code reviews',
      requiredSkills: j(['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL']),
      preferredSkills: j(['Next.js', 'AWS', 'Docker']),
      experienceLevel: 'Senior Level (5-8 years)',
      education: "Bachelor's degree in Computer Science or related field",
      salaryMin: 3000000,
      salaryMax: 6000000,
      currency: 'UGX',
      deadline: new Date('2025-08-31'),
      status: 'ACTIVE',
      screeningKeywords: j(['JavaScript', 'TypeScript', 'React', 'Node.js', 'software', 'engineer']),
      interviewQuestions: j([
        'Tell us about a challenging technical problem you solved.',
        'How do you approach designing a scalable system?',
        'Describe your experience with REST API design.',
        'How do you ensure code quality in a team?',
      ]),
      aiApproved: true,
      publicSlug: 'senior-software-engineer-abc12345',
    },
  })

  const accJob = await prisma.job.upsert({
    where: { publicSlug: 'accountant-xyz67890' },
    update: {},
    create: {
      title: 'Accountant',
      companyId: company.id,
      departmentId: finDept.id,
      location: 'Kampala, Uganda',
      employmentType: 'FULL_TIME',
      description: 'We are seeking a qualified Accountant to manage our financial records and ensure compliance with Uganda Revenue Authority requirements.',
      responsibilities: '• Prepare monthly financial statements\n• Manage accounts payable/receivable\n• Handle PAYE, NSSF, and URA filings\n• Conduct bank reconciliations',
      requiredSkills: j(['Accounting', 'QuickBooks', 'Excel', 'PAYE', 'NSSF', 'URA compliance']),
      preferredSkills: j(['CPA qualification', 'Tally ERP']),
      experienceLevel: 'Mid Level (2-5 years)',
      education: "Bachelor's degree in Accounting, Finance, or Commerce. CPA preferred.",
      salaryMin: 1500000,
      salaryMax: 2500000,
      currency: 'UGX',
      deadline: new Date('2025-07-15'),
      status: 'ACTIVE',
      screeningKeywords: j(['accountant', 'accounting', 'finance', 'QuickBooks', 'PAYE', 'NSSF', 'URA']),
      interviewQuestions: j([
        'How familiar are you with Uganda Revenue Authority filing?',
        'Describe your experience with PAYE and NSSF calculations.',
        'Tell us about a financial discrepancy you identified.',
      ]),
      aiApproved: true,
      publicSlug: 'accountant-xyz67890',
    },
  })

  await prisma.candidate.upsert({
    where: { id: 'cand-001' },
    update: {},
    create: {
      id: 'cand-001',
      firstName: 'David',
      lastName: 'Ssemakula',
      email: 'david.ssemakula@gmail.com',
      phone: '+256 701 234 567',
      location: 'Kampala, Uganda',
      jobId: devJob.id,
      status: 'SHORTLISTED',
      screeningScore: 87,
      screeningNotes: 'Strong React and Node.js experience. 6 years relevant experience.',
      screeningData: j({
        score: 87,
        breakdown: { skills: 90, experience: 88, education: 85, keywords: 85 },
        strengths: ['Strong JavaScript/TypeScript skills', '6 years experience', 'Local candidate'],
        gaps: ['No AWS experience', 'Docker not listed'],
        recommendation: 'shortlist',
        explanation: 'David shows strong alignment with the role requirements, particularly in JavaScript and React.',
      }),
      source: 'public_link',
      applicationDate: new Date('2025-05-01'),
    },
  })

  const histCount = await prisma.candidateStatusHistory.count({ where: { candidateId: 'cand-001' } })
  if (histCount === 0) {
    await prisma.candidateStatusHistory.createMany({
      data: [
        { candidateId: 'cand-001', toStatus: 'RECEIVED', createdAt: new Date('2025-05-01') },
        { candidateId: 'cand-001', fromStatus: 'RECEIVED', toStatus: 'UNDER_REVIEW', reason: 'AI screening completed', changedBy: 'AI System', createdAt: new Date('2025-05-02') },
        { candidateId: 'cand-001', fromStatus: 'UNDER_REVIEW', toStatus: 'SHORTLISTED', reason: 'Strong technical skills', changedBy: 'Sarah Nakibuuka', createdAt: new Date('2025-05-05') },
      ],
    })
  }

  await prisma.candidate.upsert({
    where: { id: 'cand-002' },
    update: {},
    create: {
      id: 'cand-002', firstName: 'Grace', lastName: 'Achieng',
      email: 'grace.achieng@yahoo.com', phone: '+256 782 345 678',
      location: 'Kampala, Uganda', jobId: devJob.id,
      status: 'UNDER_REVIEW', screeningScore: 64, source: 'public_link',
      applicationDate: new Date('2025-05-03'),
    },
  })

  await prisma.candidate.upsert({
    where: { id: 'cand-003' },
    update: {},
    create: {
      id: 'cand-003', firstName: 'Patrick', lastName: 'Muwonge',
      email: 'patrick.muwonge@gmail.com', phone: '+256 703 456 789',
      location: 'Entebbe, Uganda', jobId: accJob.id,
      status: 'INTERVIEW_SCHEDULED', screeningScore: 91,
      screeningData: j({
        score: 91,
        breakdown: { skills: 95, experience: 90, education: 92, keywords: 87 },
        strengths: ['CPA qualification', 'URA filing experience', 'QuickBooks proficiency'],
        gaps: ['No Tally ERP experience'],
        recommendation: 'shortlist',
        explanation: 'Patrick is an excellent match with CPA qualification and URA compliance experience.',
      }),
      source: 'referral', applicationDate: new Date('2025-05-06'),
    },
  })

  // Employees
  await prisma.employee.upsert({
    where: { id: 'emp-001' },
    update: {},
    create: {
      id: 'emp-001', companyId: company.id, departmentId: engDept.id,
      employeeNumber: 'EMP0001', firstName: 'Michael', lastName: 'Byaruhanga',
      email: 'michael.byaruhanga@acme.co.ug', phone: '+256 704 111 222',
      jobTitle: 'Lead Software Engineer', employmentType: 'FULL_TIME',
      startDate: new Date('2023-01-15'), salary: 5500000, currency: 'UGX',
      paymentFrequency: 'monthly', nssfNumber: 'NSSF123456', tinNumber: 'TIN789012',
      bankName: 'Stanbic Bank Uganda', bankAccount: '9030012345678',
    },
  })

  await prisma.employee.upsert({
    where: { id: 'emp-002' },
    update: {},
    create: {
      id: 'emp-002', companyId: company.id, departmentId: hrDept.id,
      employeeNumber: 'EMP0002', firstName: 'Patience', lastName: 'Nakalembe',
      email: 'patience.nakalembe@acme.co.ug',
      jobTitle: 'HR Officer', employmentType: 'FULL_TIME',
      startDate: new Date('2023-03-01'), salary: 2800000, currency: 'UGX',
    },
  })

  await prisma.employee.upsert({
    where: { id: 'emp-003' },
    update: {},
    create: {
      id: 'emp-003', companyId: company.id, departmentId: salesDept.id,
      employeeNumber: 'EMP0003', firstName: 'Brenda', lastName: 'Namugga',
      email: 'brenda.namugga@acme.co.ug',
      jobTitle: 'Business Development Manager', employmentType: 'FULL_TIME',
      startDate: new Date('2024-01-10'), salary: 3500000, currency: 'UGX',
    },
  })

  await prisma.onboarding.upsert({
    where: { employeeId: 'emp-001' },
    update: {},
    create: {
      employeeId: 'emp-001',
      completedTasks: j(['personal_info', 'emergency_contact', 'bank_details', 'tax_info', 'nssf', 'contract_sign', 'policies', 'id_documents', 'orientation', 'it_setup', 'meet_team', 'first_week']),
      personalInfoComplete: true, emergencyContactComplete: true, bankDetailsComplete: true,
      contractSigned: true, policiesAcknowledged: true, orientationComplete: true,
      status: 'complete', completedAt: new Date('2023-01-30'),
    },
  })

  await prisma.onboarding.upsert({
    where: { employeeId: 'emp-003' },
    update: {},
    create: {
      employeeId: 'emp-003',
      completedTasks: j(['personal_info', 'emergency_contact', 'id_documents']),
      personalInfoComplete: true, emergencyContactComplete: true,
      status: 'in-progress',
    },
  })

  await prisma.performanceReview.upsert({
    where: { id: 'review-001' },
    update: {},
    create: {
      id: 'review-001', employeeId: 'emp-001',
      cycle: 'ANNUAL', period: '2024 Annual Review', status: 'COMPLETED',
      goalsScore: 88, skillsScore: 90, overallScore: 89,
      comments: 'Michael has shown exceptional technical leadership this year.',
      aiSummary: 'Michael demonstrates strong technical skills and leadership. Delivered 3 major projects.',
      recommendations: 'Consider for senior lead role in Q2 2025.',
      dueDate: new Date('2025-01-31'), completedAt: new Date('2025-01-20'),
    },
  })

  await prisma.performanceReview.upsert({
    where: { id: 'review-002' },
    update: {},
    create: {
      id: 'review-002', employeeId: 'emp-003',
      cycle: 'QUARTERLY', period: 'Q1 2025', status: 'PENDING',
      dueDate: new Date('2025-04-15'),
    },
  })

  console.log('\n✅ Seed complete!')
  console.log('\n🔐 Demo login:')
  console.log('   admin@demo.com / demo1234')
  console.log('   hr@demo.com / demo1234')
  console.log('\n🔗 Public job links:')
  console.log('   http://localhost:3000/apply/senior-software-engineer-abc12345')
  console.log('   http://localhost:3000/apply/accountant-xyz67890')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
