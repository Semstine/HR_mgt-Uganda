import { DSC_RECRUITMENT_WORKFLOW } from '../lib/dsc-workflow'

const CYCLE_EXTRAS = [
  {
    id: 'cycle-wak-subcounty-chief',
    postRef: 'WAK/DSC/ADM/SC/02/2025',
    postTitle: 'Sub-County Chief',
    grade: 'U3',
    department: 'Administration',
    currentStep: 10,
    status: 'step_10_interviews',
    appCount: 14,
    deptId: 'dept-wak-admin',
    startedAt: new Date('2025-06-01'),
  },
  {
    id: 'cycle-kot-teacher',
    postRef: 'KOT/DSC/EDU/PRI/01/2025',
    postTitle: 'Primary School Teacher',
    grade: 'U6',
    department: 'Education',
    currentStep: 5,
    status: 'step_5_advert_published',
    appCount: 9,
    deptId: null,
    districtId: 'district-kotido',
    startedAt: new Date('2025-07-20'),
  },
  {
    id: 'cycle-mba-vet-officer',
    postRef: 'MBA/DSC/AGR/VO/01/2025',
    postTitle: 'District Veterinary Officer',
    grade: 'U4',
    department: 'Agriculture',
    currentStep: 13,
    status: 'step_13_dsc_decision',
    appCount: 7,
    deptId: null,
    districtId: 'district-mbarara',
    startedAt: new Date('2025-04-10'),
  },
  {
    id: 'cycle-wak-records-officer',
    postRef: 'WAK/DSC/ADM/RO/03/2025',
    postTitle: 'Records Officer',
    grade: 'U7',
    department: 'Administration',
    currentStep: 3,
    status: 'step_3_dsc_approved',
    appCount: 0,
    deptId: 'dept-wak-admin',
    startedAt: new Date('2025-09-01'),
  },
  {
    id: 'cycle-wak-cdo',
    postRef: 'WAK/DSC/CDS/CDO/04/2025',
    postTitle: 'Community Development Officer',
    grade: 'U5',
    department: 'Community Development',
    currentStep: 17,
    status: 'completed',
    appCount: 11,
    deptId: null,
    startedAt: new Date('2025-01-10'),
  },
]

const EXTRA_EMPLOYEES = [
  { id: 'gov-emp-wak-002', num: 'WAK-ADM-0001', first: 'Robert', last: 'Kasozi', nin: 'CM80003344EFGH', title: 'Senior Assistant Secretary', grade: 'U3', dept: 'Administration', station: 'Wakiso District Headquarters', gender: 'male', dob: new Date('1984-08-12'), status: 'active' },
  { id: 'gov-emp-wak-003', num: 'WAK-EDU-0001', first: 'Doreen', last: 'Namubiru', nin: 'CF92005566IJKL', title: 'Education Officer', grade: 'U4', dept: 'Education', station: 'Wakiso Education Directorate', gender: 'female', dob: new Date('1991-03-25'), status: 'active' },
  { id: 'gov-emp-wak-004', num: 'WAK-HLT-0002', first: 'Joseph', last: 'Tukamuhebwa', nin: 'CM78009900MNOP', title: 'Medical Officer', grade: 'U4', dept: 'Health', station: 'Wakiso Health Centre IV', gender: 'male', dob: new Date('1982-11-08'), status: 'active' },
  { id: 'gov-emp-wak-005', num: 'WAK-HLT-0003', first: 'Annet', last: 'Akello', nin: 'CF96001122QRST', title: 'Enrolled Nurse', grade: 'U7', dept: 'Health', station: 'Kasangati HC IV', gender: 'female', dob: new Date('1995-07-30'), status: 'active' },
  { id: 'gov-emp-wak-006', num: 'WAK-FIN-0001', first: 'Henry', last: 'Mugisha', nin: 'CM74006677UVWX', title: 'Senior Accountant', grade: 'U3', dept: 'Finance', station: 'Wakiso District Headquarters', gender: 'male', dob: new Date('1978-05-14'), status: 'active' },
  { id: 'gov-emp-wak-007', num: 'WAK-HLT-0004', first: 'Prossy', last: 'Nalubega', nin: 'CF89004455YZAB', title: 'Clinical Officer', grade: 'U5', dept: 'Health', station: 'Masuliita HC III', gender: 'female', dob: new Date('1993-01-17'), status: 'active' },
  { id: 'gov-emp-wak-008', num: 'WAK-ADM-0002', first: 'Isaac', last: 'Ssebunya', nin: 'CM86007788CDEF', title: 'Human Resource Officer', grade: 'U4', dept: 'Administration', station: 'Wakiso District Headquarters', gender: 'male', dob: new Date('1990-09-22'), status: 'active' },
  { id: 'gov-emp-wak-009', num: 'WAK-EDU-0002', first: 'Sylvia', last: 'Naluwooza', nin: 'CF94003344GHIJ', title: 'District Inspector of Schools', grade: 'U3', dept: 'Education', station: 'Wakiso Education Directorate', gender: 'female', dob: new Date('1992-04-06'), status: 'active' },
  { id: 'gov-emp-mba-001', num: 'MBA-HLT-0001', first: 'Patrick', last: 'Tumwebaze', nin: 'CM77002233KLMN', title: 'Senior Medical Officer', grade: 'U3', dept: 'Health', station: 'Mbarara Regional Referral Hospital', gender: 'male', dob: new Date('1981-12-03'), status: 'active' },
  { id: 'gov-emp-kot-001', num: 'KOT-ADM-0001', first: 'Boniface', last: 'Lokeris', nin: 'CM83008899OPQR', title: 'Chief Administrative Officer', grade: 'U1E', dept: 'Administration', station: 'Kotido District Headquarters', gender: 'male', dob: new Date('1987-06-19'), status: 'active' },
]

export async function seedDscExtended(prisma: any, ctx: {
  wakiso: any; mbarara: any; kotido: any;
  secretary: any; chairperson: any; salaryScaleId: string;
}) {
  const { wakiso, mbarara, kotido, secretary, chairperson, salaryScaleId } = ctx

  // ── Extra Recruitment Cycles ─────────────────────────────────────────────────
  for (const c of CYCLE_EXTRAS) {
    const districtId = c.districtId ?? wakiso.id
    const exists = await prisma.recruitmentCycle.findUnique({ where: { postRef: c.postRef } })
    if (!exists) {
      await prisma.recruitmentCycle.create({
        data: {
          id: c.id,
          districtId,
          postTitle: c.postTitle,
          postRef: c.postRef,
          grade: c.grade,
          department: c.department,
          numberOfPosts: 1,
          currentStep: c.currentStep,
          status: c.status,
          secretaryId: secretary.id,
          chairpersonId: chairperson.id,
          financialYear: '2025/2026',
          startedAt: c.startedAt,
          workflowSteps: {
            create: DSC_RECRUITMENT_WORKFLOW.map((step) => ({
              stepNumber: step.stepNumber,
              stepName: step.stepName,
              actorRole: step.actorRole,
              status: step.stepNumber < c.currentStep ? 'completed' : step.stepNumber === c.currentStep ? 'in_progress' : 'pending',
              startedAt: step.stepNumber <= c.currentStep ? c.startedAt : null,
              completedAt: step.stepNumber < c.currentStep ? new Date(c.startedAt.getTime() + step.stepNumber * 7 * 24 * 60 * 60 * 1000) : null,
              documentsGenerated: [],
            })),
          },
        },
      })
    }

    // seed a few applications per cycle
    if (c.appCount > 0) {
      const NAMES = [
        ['Peter', 'Olwoch', 'CM82001122AABB', 'male'],
        ['Mary', 'Akello', 'CF90003344CCDD', 'female'],
        ['James', 'Okello', 'CM85005566EEFF', 'male'],
        ['Susan', 'Nalwoga', 'CF93007788GGHH', 'female'],
        ['Charles', 'Byakagaba', 'CM79009900IIJJ', 'male'],
        ['Fatuma', 'Nakirya', 'CF97001122KKLL', 'female'],
        ['Moses', 'Kimbugwe', 'CM88003344MMNN', 'male'],
        ['Irene', 'Namutebi', 'CF91005566OOPP', 'female'],
        ['David', 'Okwir', 'CM76007788QQRR', 'male'],
        ['Agnes', 'Nantume', 'CF99009900SSTT', 'female'],
        ['Paul', 'Ssematimba', 'CM83001122UUVV', 'male'],
        ['Goretti', 'Namukasa', 'CF94003344WWXX', 'female'],
        ['Richard', 'Ouma', 'CM80005566YYZZ', 'male'],
        ['Harriet', 'Nakawuki', 'CF92007788AABB', 'female'],
      ]
      const statuses = ['received', 'under_review', 'shortlisted', 'received', 'under_review']
      const take = Math.min(c.appCount, NAMES.length)
      for (let i = 0; i < take; i++) {
        const [first, last, nin, gender] = NAMES[i]
        const ref = `${districtId.split('-')[1].toUpperCase()}-${c.id.split('-').pop()?.toUpperCase()}-${String(i + 1).padStart(3, '0')}`
        const appExists = await prisma.pSCForm3Application.findFirst({ where: { recruitmentCycleId: c.id, nin } })
        if (!appExists) {
          await prisma.pSCForm3Application.create({
            data: {
              recruitmentCycleId: c.id,
              districtId,
              postRef: c.postRef,
              intakeChannel: i % 3 === 0 ? 'paper' : i % 3 === 1 ? 'ussd' : 'online',
              firstName: first,
              lastName: last,
              nin,
              dateOfBirth: new Date('1990-01-01'),
              gender,
              nationality: 'Ugandan',
              subCounty: 'Central Division',
              district: districtId.includes('wakiso') ? 'Wakiso' : districtId.includes('mbarara') ? 'Mbarara' : 'Kotido',
              region: districtId.includes('kotido') ? 'Karamoja' : districtId.includes('mbarara') ? 'Western' : 'Central',
              phone: `+25670${String(1000000 + i).slice(1)}`,
              educationHistory: [{ level: 'Diploma', institution: 'Makerere University', year: 2015 }],
              qualifications: [{ name: c.postTitle + ' qualification', awardDate: '2015-06-30' }],
              employmentHistory: [{ employer: 'Previous District', role: 'Assistant Officer', years: 3 }],
              referees: [{ name: 'Dr. Sample Referee', phone: '+256701000000' }],
              professionalBodies: [],
              applicationRef: ref,
              submittedAt: new Date(c.startedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
              status: statuses[i % statuses.length],
              ninVerified: i % 3 === 2,
              documentComplete: i % 2 === 0,
            },
          })
        }
      }
    }
  }

  // ── Extra Employees ──────────────────────────────────────────────────────────
  for (const e of EXTRA_EMPLOYEES) {
    const districtId = e.id.includes('mba') ? mbarara.id : e.id.includes('kot') ? kotido.id : wakiso.id
    const exists = await prisma.employeeGovernmentProfile.findFirst({ where: { employeeNumber: e.num } })
    if (!exists) {
      await prisma.employeeGovernmentProfile.create({
        data: {
          id: e.id,
          districtId,
          salaryScaleId,
          employeeNumber: e.num,
          firstName: e.first,
          lastName: e.last,
          nin: e.nin,
          dateOfBirth: e.dob,
          gender: e.gender,
          phone: '+256701000000',
          postTitle: e.title,
          grade: e.grade,
          department: e.dept,
          dutyStation: e.station,
          reportingOfficer: 'Supervisor',
          appointmentDate: new Date('2024-01-01'),
          employmentStatus: e.status,
          hcmSyncStatus: Math.random() > 0.3 ? 'synced' : 'pending',
        },
      })
    }
  }

  // ── Ghost Worker Flags ───────────────────────────────────────────────────────
  const ghostData = [
    { id: 'ghost-wak-001', employeeId: 'gov-emp-wak-005', employeeRef: 'WAK-HLT-0003', flagType: 'duplicate_nin', description: 'Duplicate NIN detected across two payroll entries — WAK-HLT-0003 shares NIN CF96001122QRST with another IFMS record' },
    { id: 'ghost-wak-002', employeeId: 'gov-emp-wak-007', employeeRef: 'WAK-HLT-0004', flagType: 'payroll_no_profile', description: 'Biometric verification failed at Masuliita HC III for 3 consecutive months; employee not seen at duty station' },
    { id: 'ghost-mba-001', employeeId: 'gov-emp-mba-001', employeeRef: 'MBA-HLT-0001', flagType: 'nira_mismatch', description: 'NIRA NIN verification returned status: DECEASED for NIN CM77002233KLMN. Cross-check with payroll required.' },
  ]
  for (const g of ghostData) {
    const exists = await prisma.ghostWorkerFlag.findUnique({ where: { id: g.id } })
    if (!exists) {
      await prisma.ghostWorkerFlag.create({
        data: {
          id: g.id,
          districtId: g.id.includes('mba') ? mbarara.id : wakiso.id,
          employeeId: g.employeeId,
          employeeRef: g.employeeRef,
          flagType: g.flagType,
          description: g.description,
          flaggedBy: secretary.id,
          flaggedAt: new Date('2025-10-05'),
          status: 'open',
        },
      })
    }
  }

  // ── Leave Requests ───────────────────────────────────────────────────────────
  const leaveData = [
    { id: 'leave-001', employeeId: 'gov-emp-wak-002', type: 'annual', days: 14, from: new Date('2025-11-03'), to: new Date('2025-11-14'), status: 'pending', reason: 'Family obligation' },
    { id: 'leave-002', employeeId: 'gov-emp-wak-003', type: 'sick', days: 3, from: new Date('2025-10-20'), to: new Date('2025-10-22'), status: 'approved', reason: 'Medical treatment' },
    { id: 'leave-003', employeeId: 'gov-emp-wak-004', type: 'annual', days: 21, from: new Date('2025-12-01'), to: new Date('2025-12-21'), status: 'pending', reason: 'Annual leave' },
    { id: 'leave-004', employeeId: 'gov-emp-wak-006', type: 'study', days: 5, from: new Date('2025-11-10'), to: new Date('2025-11-14'), status: 'pending', reason: 'Professional development course' },
    { id: 'leave-005', employeeId: 'gov-emp-wak-008', type: 'annual', days: 7, from: new Date('2025-10-27'), to: new Date('2025-11-02'), status: 'approved', reason: 'Personal' },
  ]
  for (const l of leaveData) {
    const exists = await prisma.leaveRequest.findUnique({ where: { id: l.id } })
    if (!exists) {
      await prisma.leaveRequest.create({
        data: {
          id: l.id,
          districtId: wakiso.id,
          employeeId: l.employeeId,
          leaveType: l.type,
          days: l.days,
          startDate: l.from,
          endDate: l.to,
          status: l.status,
          reason: l.reason,
          approvedBy: l.status !== 'pending' ? secretary.id : null,
          approvedAt: l.status !== 'pending' ? new Date('2025-10-03') : null,
        },
      })
    }
  }

  console.log('  Extended DSC data seeded: 5 extra cycles, 10 employees, 3 ghost flags, 5 leave requests')
}
