import { DSC_RECRUITMENT_WORKFLOW } from "../lib/dsc-workflow"

export async function seedDscHrms(prisma: any, passwordHash: string) {
  console.log("Seeding DSC-HRMS government demo data...")

  const [wakiso, mbarara, kotido] = await Promise.all([
    prisma.district.upsert({
      where: { code: "WAK" },
      update: {},
      create: { id: "district-wakiso", code: "WAK", name: "Wakiso District", region: "Central", districtType: "district", headquarters: "Wakiso" },
    }),
    prisma.district.upsert({
      where: { code: "MBA" },
      update: {},
      create: { id: "district-mbarara", code: "MBA", name: "Mbarara City", region: "Western", districtType: "city", headquarters: "Mbarara" },
    }),
    prisma.district.upsert({
      where: { code: "KOT" },
      update: {},
      create: { id: "district-kotido", code: "KOT", name: "Kotido District", region: "Karamoja", districtType: "district", headquarters: "Kotido" },
    }),
  ])

  await Promise.all([
    upsertDscUser(prisma, passwordHash, "mops.admin@gov.ug", "Agnes Namuli", "NATIONAL_ADMIN_MOPS", null),
    upsertDscUser(prisma, passwordHash, "chairperson.wakiso@dsc.go.ug", "Hon. Margaret Kiyingi", "DSC_CHAIRPERSON", wakiso.id),
    upsertDscUser(prisma, passwordHash, "member.wakiso@dsc.go.ug", "Dr. Samuel Ocen", "DSC_MEMBER", wakiso.id),
    upsertDscUser(prisma, passwordHash, "secretary.wakiso@dsc.go.ug", "Rose Namatovu", "SECRETARY_DSC", wakiso.id),
    upsertDscUser(prisma, passwordHash, "cao.wakiso@dsc.go.ug", "Peter Wamala", "CAO", wakiso.id),
    upsertDscUser(prisma, passwordHash, "dhro.wakiso@dsc.go.ug", "Sarah Akello", "DHRO", wakiso.id),
    upsertDscUser(prisma, passwordHash, "hod.health.wakiso@dsc.go.ug", "Dr. Jane Nakato", "HOD", wakiso.id),
    upsertDscUser(prisma, passwordHash, "clerk.wakiso@dsc.go.ug", "Moses Kato", "DISTRICT_RECEPTION_CLERK", wakiso.id),
    upsertDscUser(prisma, passwordHash, "auditor.igg@gov.ug", "Irene Auma", "AUDITOR_IGG", null),
    upsertDscUser(prisma, passwordHash, "applicant.demo@example.com", "Christine Namusisi", "APPLICANT", wakiso.id),
  ])

  const [chairperson, secretary, member, cao, dhro, hod] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "chairperson.wakiso@dsc.go.ug" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "secretary.wakiso@dsc.go.ug" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "member.wakiso@dsc.go.ug" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "cao.wakiso@dsc.go.ug" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "dhro.wakiso@dsc.go.ug" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "hod.health.wakiso@dsc.go.ug" } }),
  ])

  const wakisoDsc = await prisma.districtServiceCommission.upsert({
    where: { districtId: wakiso.id },
    update: { chairpersonId: chairperson.id, secretaryId: secretary.id },
    create: {
      id: "dsc-wakiso",
      districtId: wakiso.id,
      name: "Wakiso District Service Commission",
      establishedDate: new Date("1997-07-01"),
      chairpersonId: chairperson.id,
      secretaryId: secretary.id,
    },
  })

  await Promise.all([
    prisma.dSCMember.upsert({ where: { id: "dsc-member-wakiso-chair" }, update: {}, create: { id: "dsc-member-wakiso-chair", dscId: wakisoDsc.id, userId: chairperson.id, memberType: "chairperson", title: "Chairperson", profession: "Public Administration", appointedDate: new Date("2024-01-01") } }),
    prisma.dSCMember.upsert({ where: { id: "dsc-member-wakiso-secretary" }, update: {}, create: { id: "dsc-member-wakiso-secretary", dscId: wakisoDsc.id, userId: secretary.id, memberType: "secretary", title: "Secretary DSC", profession: "Human Resource Management", appointedDate: new Date("2024-01-01") } }),
    prisma.dSCMember.upsert({ where: { id: "dsc-member-wakiso-member" }, update: {}, create: { id: "dsc-member-wakiso-member", dscId: wakisoDsc.id, userId: member.id, memberType: "member", title: "Commission Member", profession: "Education", appointedDate: new Date("2024-01-01") } }),
  ])

  const healthDept = await prisma.districtDepartment.upsert({
    where: { id: "dept-wak-health" },
    update: { hodId: hod.id },
    create: { id: "dept-wak-health", districtId: wakiso.id, code: "HLT", name: "Health", hodId: hod.id },
  })

  await Promise.all([
    prisma.districtDepartment.upsert({ where: { id: "dept-wak-education" }, update: {}, create: { id: "dept-wak-education", districtId: wakiso.id, code: "EDU", name: "Education" } }),
    prisma.districtDepartment.upsert({ where: { id: "dept-wak-admin" }, update: {}, create: { id: "dept-wak-admin", districtId: wakiso.id, code: "ADM", name: "Administration" } }),
  ])

  const salaryScales = await Promise.all(["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8"].map((scale, index) =>
    prisma.salaryScale.upsert({
      where: { id: `scale-${scale.toLowerCase()}-wakiso` },
      update: {},
      create: {
        id: `scale-${scale.toLowerCase()}-wakiso`,
        districtId: wakiso.id,
        scaleCode: scale,
        scaleLevel: `Uganda Public Service ${scale}`,
        minimumSalary: 8000000 - index * 750000,
        maximumSalary: 10000000 - index * 650000,
        financialYear: "2025/2026",
        effectiveFrom: new Date("2025-07-01"),
      },
    })
  ))

  const staffStructure = await prisma.approvedStaffStructure.upsert({
    where: { id: "structure-wak-clinical-officer" },
    update: {},
    create: {
      id: "structure-wak-clinical-officer",
      districtId: wakiso.id,
      departmentId: healthDept.id,
      salaryScaleId: salaryScales[4].id,
      postTitle: "Clinical Officer",
      postCode: "WAK/HLT/CO/2025",
      grade: "U5",
      approvedPosts: 22,
      filledPosts: 18,
      vacantPosts: 4,
      underRecruitment: 1,
      financialYear: "2025/2026",
      schemeOfService: "Health Cadre Scheme of Service",
      jobDescription: "Provide clinical diagnosis, treatment, health education, and patient referral services at district health facilities.",
      personSpec: "Diploma in Clinical Medicine and Community Health, valid Allied Health Professionals Council registration, and at least two years of relevant experience.",
      minimumQualification: "Diploma in Clinical Medicine and Community Health",
      experienceRequired: "2 years",
      ageRange: "21-45",
    },
  })

  const notice = await prisma.establishmentNotice.upsert({
    where: { noticeNumber: "MOPS/EST/WAK/2025/044" },
    update: {},
    create: {
      id: "notice-wakiso-2025",
      districtId: wakiso.id,
      noticeNumber: "MOPS/EST/WAK/2025/044",
      financialYear: "2025/2026",
      approvedPosts: 1,
      wageEnvelope: 73500000,
      issuedBy: "Ministry of Public Service",
      issuedDate: new Date("2025-07-10"),
      effectiveFrom: new Date("2025-07-01"),
      status: "active",
      notes: "Clearance for one Clinical Officer recruitment under Wakiso Health Department.",
    },
  })

  const vacancy = await prisma.vacancyDeclaration.upsert({
    where: { id: "vacancy-wak-clinical-officer-2025" },
    update: {},
    create: {
      id: "vacancy-wak-clinical-officer-2025",
      districtId: wakiso.id,
      departmentId: healthDept.id,
      staffStructureId: staffStructure.id,
      postTitle: "Clinical Officer",
      grade: "U5",
      vacancyReason: "retirement",
      vacancyDate: new Date("2025-07-15"),
      numberOfVacancies: 1,
      hodId: hod.id,
      hodNotes: "Vacancy created following retirement at Namayumba HC III.",
      dhroId: dhro.id,
      dhroNotes: "Validated against approved staff structure.",
      status: "cleared",
      consolidatedDate: new Date("2025-07-18"),
    },
  })

  await prisma.wageBillClearance.upsert({
    where: { id: "wage-clearance-wak-clinical-officer-2025" },
    update: {},
    create: {
      id: "wage-clearance-wak-clinical-officer-2025",
      districtId: wakiso.id,
      establishmentNoticeId: notice.id,
      vacancyDeclarationId: vacancy.id,
      requestedBy: cao.id,
      requestedAt: new Date("2025-07-20"),
      approvedBy: "MoPS Establishment Portal",
      approvedAt: new Date("2025-07-25"),
      financialYear: "2025/2026",
      postsRequested: 1,
      wageImpact: 73500000,
      status: "approved",
      mopsRef: "MOPS/WB/WAK/2025/118",
    },
  })

  const cycle = await prisma.recruitmentCycle.upsert({
    where: { postRef: "WAK/DSC/HLT/CO/01/2025" },
    update: {},
    create: {
      id: "cycle-wak-clinical-officer-2025",
      districtId: wakiso.id,
      establishmentNoticeId: notice.id,
      vacancyDeclarationId: vacancy.id,
      postTitle: "Clinical Officer",
      postRef: "WAK/DSC/HLT/CO/01/2025",
      grade: "U5",
      department: "Health",
      numberOfPosts: 1,
      currentStep: 9,
      status: "step_9_shortlisting_committee_scores_applications",
      secretaryId: secretary.id,
      chairpersonId: chairperson.id,
      financialYear: "2025/2026",
      startedAt: new Date("2025-07-15"),
      workflowSteps: {
        create: DSC_RECRUITMENT_WORKFLOW.map((step) => ({
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          actorRole: step.actorRole,
          status: step.stepNumber < 9 ? "completed" : step.stepNumber === 9 ? "in_progress" : "pending",
          startedAt: step.stepNumber <= 9 ? new Date("2025-07-15") : null,
          completedAt: step.stepNumber < 9 ? new Date("2025-08-20") : null,
          documentsGenerated: step.stepNumber === 6 ? ["notice_board_pdf", "fm_radio_script"] : [],
        })),
      },
    },
  })

  await seedRecruitmentArtifacts(prisma, { wakiso, mbarara, kotido, cycle, notice, staffStructure, secretary, chairperson, member, cao, dhro, wakisoDsc, salaryScaleId: salaryScales[4].id })
}

async function upsertDscUser(prisma: any, passwordHash: string, email: string, name: string, role: string, districtId: string | null) {
  return prisma.user.upsert({
    where: { email },
    update: { role, dscRole: role, districtId, isActive: true },
    create: { email, name, password: passwordHash, role, dscRole: role, districtId, isActive: true },
  })
}

async function seedRecruitmentArtifacts(prisma: any, ctx: any) {
  const { wakiso, mbarara, kotido, cycle, staffStructure, secretary, chairperson, member, cao, dhro, wakisoDsc, salaryScaleId } = ctx

  await prisma.advert.upsert({
    where: { recruitmentCycleId: cycle.id },
    update: {},
    create: {
      id: "advert-wak-clinical-officer-2025",
      recruitmentCycleId: cycle.id,
      districtId: wakiso.id,
      postTitle: "Clinical Officer",
      postRef: cycle.postRef,
      grade: "U5",
      salaryScale: "U5",
      dutyStation: "Namayumba HC III, Wakiso District",
      department: "Health",
      eligibilityCriteria: "Ugandan citizens meeting the person specification and public service requirements.",
      qualifications: staffStructure.minimumQualification,
      experience: staffStructure.experienceRequired,
      ageRange: staffStructure.ageRange,
      applicationInstructions: "Submit PSC Form 3 online, by USSD stub, or at the District Service Commission registry.",
      deadline: new Date("2025-08-15T20:59:00.000Z"),
      preparedBy: secretary.id,
      approvedBy: chairperson.id,
      approvedAt: new Date("2025-07-30"),
      minuteItemRef: "WAK/DSC/MIN/2025/07/14",
      status: "closed",
      publishedAt: new Date("2025-08-01"),
      closedAt: new Date("2025-08-15T20:59:00.000Z"),
      publicationLogs: {
        create: [
          { channel: "district_website", status: "successful", publishedAt: new Date("2025-08-01"), reference: "https://wakiso.go.ug/jobs/WAK-DSC-HLT-CO-01-2025" },
          { channel: "notice_board_pdf", status: "successful", publishedAt: new Date("2025-08-01"), reference: "WAK/NOTICE/2025/CO" },
          { channel: "mops_portal", status: "manual_required", notes: "Awaiting manual MoPS portal upload confirmation." },
          { channel: "fm_radio", status: "successful", publishedAt: new Date("2025-08-03"), reference: "CBS FM script batch 88" },
        ],
      },
    },
  })

  const applications = await Promise.all([
    upsertApplication(prisma, cycle, wakiso, "app-wak-0001", "DSC-WAK-2025-0001", "online", "Christine", "Namusisi", "CM85001122ABCD", "female", "shortlisted", true),
    upsertApplication(prisma, cycle, wakiso, "app-wak-0002", "DSC-WAK-2025-0002", "ussd", "Brian", "Okello", "CM76004455WXYZ", "male", "under_review", false),
    upsertApplication(prisma, cycle, wakiso, "app-wak-0003", "DSC-WAK-2025-0003", "paper", "Aisha", "Nabukenya", "CF92007788PQRS", "female", "received", true, true),
  ])

  const shortlistPanel = await prisma.shortlistingPanel.upsert({
    where: { recruitmentCycleId: cycle.id },
    update: {},
    create: {
      id: "shortlist-panel-wak-co-2025",
      recruitmentCycleId: cycle.id,
      createdBy: secretary.id,
      status: "scoring",
      scoringCriteria: [
        { key: "qualification", label: "Required diploma", passRequired: true },
        { key: "registration", label: "Professional registration", passRequired: true },
        { key: "experience", label: "Relevant experience", passRequired: true },
      ],
      panelMembers: {
        create: [
          { memberId: chairperson.id, memberRole: "dsc_chairperson", hasSubmitted: true, submittedAt: new Date("2025-08-21") },
          { memberId: member.id, memberRole: "dsc_member", hasSubmitted: true, submittedAt: new Date("2025-08-21") },
        ],
      },
    },
  })

  await prisma.shortlistingScore.upsert({
    where: { panelId_applicationId_scorerId: { panelId: shortlistPanel.id, applicationId: applications[0].id, scorerId: member.id } },
    update: {},
    create: {
      panelId: shortlistPanel.id,
      applicationId: applications[0].id,
      scorerId: member.id,
      scores: { qualification: "pass", registration: "pass", experience: "pass" },
      overallResult: "pass",
      notes: "Meets all essential criteria.",
      isSubmitted: true,
      submittedAt: new Date("2025-08-21"),
    },
  })

  await prisma.shortlistDecision.upsert({
    where: { applicationId: applications[0].id },
    update: {},
    create: { panelId: shortlistPanel.id, applicationId: applications[0].id, finalDecision: "shortlisted", decisionBy: secretary.id, approvedBy: chairperson.id, approvedAt: new Date("2025-08-22"), notifiedAt: new Date("2025-08-23") },
  })

  await prisma.dSCMinute.upsert({
    where: { id: "minute-wak-2025-07-14" },
    update: {},
    create: {
      id: "minute-wak-2025-07-14",
      dscId: wakisoDsc.id,
      recruitmentCycleId: cycle.id,
      minuteNumber: "WAK/DSC/MIN/2025/07/14",
      sessionDate: new Date("2025-07-30"),
      sessionType: "ordinary",
      agenda: "Authorization of advert and recruitment timetable for Clinical Officer.",
      decisions: [{ item: "Advert approval", decision: "approved", postRef: cycle.postRef }],
      draftedBy: secretary.id,
      approvedBy: chairperson.id,
      approvedAt: new Date("2025-07-30"),
      status: "approved",
    },
  })

  const appointment = await prisma.appointmentDecision.upsert({
    where: { applicationId: applications[0].id },
    update: {},
    create: {
      id: "appointment-decision-wak-0001",
      recruitmentCycleId: cycle.id,
      applicationId: applications[0].id,
      dscDecision: "appointed",
      decisionDate: new Date("2025-09-05"),
      minuteRef: "WAK/DSC/MIN/2025/09/03",
      postTitle: cycle.postTitle,
      grade: cycle.grade,
      salaryScale: "U5",
      dutyStation: "Namayumba HC III",
      reportingOfficer: "District Health Officer",
      probationMonths: 12,
      effectiveDate: new Date("2025-10-01"),
      decidedBy: chairperson.id,
    },
  })

  await prisma.appointmentLetter.upsert({
    where: { applicationId: applications[0].id },
    update: {},
    create: {
      id: "appointment-letter-wak-0001",
      applicationId: applications[0].id,
      letterRef: "WAK/CAO/APPT/2025/0001",
      postTitle: appointment.postTitle,
      grade: appointment.grade,
      salaryScale: appointment.salaryScale,
      effectiveDate: new Date("2025-10-01"),
      dutyStation: appointment.dutyStation,
      reportingOfficer: appointment.reportingOfficer,
      probationMonths: 12,
      acceptanceDeadline: new Date("2025-09-20"),
      signedByCao: true,
      caoSignatureDate: new Date("2025-09-08"),
      caoId: cao.id,
      deliveredVia: ["portal", "sms_link", "printable_pdf"],
      deliveredAt: new Date("2025-09-08"),
      acceptanceStatus: "accepted",
      acceptedAt: new Date("2025-09-12"),
      acceptedByName: "Christine Namusisi",
      acceptanceMethod: "online",
      status: "accepted",
    },
  })

  const govEmployee = await prisma.employeeGovernmentProfile.upsert({
    where: { employeeNumber: "WAK-HLT-0001" },
    update: {},
    create: {
      id: "gov-employee-wak-0001",
      districtId: wakiso.id,
      salaryScaleId,
      employeeNumber: "WAK-HLT-0001",
      firstName: "Christine",
      lastName: "Namusisi",
      nin: "CM85001122ABCD",
      dateOfBirth: new Date("1994-04-16"),
      gender: "female",
      phone: "+256701234567",
      email: "christine.namusisi@example.com",
      postTitle: "Clinical Officer",
      grade: "U5",
      department: "Health",
      dutyStation: "Namayumba HC III",
      reportingOfficer: "District Health Officer",
      appointmentDate: new Date("2025-10-01"),
      hcmSyncStatus: "pending",
    },
  })

  await prisma.probationRecord.upsert({
    where: { employeeId: govEmployee.id },
    update: {},
    create: {
      id: "probation-wak-0001",
      employeeId: govEmployee.id,
      probationMonths: 12,
      startDate: new Date("2025-10-01"),
      expectedEndDate: new Date("2026-09-30"),
      status: "on_probation",
      reviews: { create: [{ reviewMonth: 3, reviewType: "progress" }, { reviewMonth: 5, reviewType: "progress" }, { reviewMonth: 11, reviewType: "final" }] },
    },
  })

  await prisma.payrollCertification.upsert({
    where: { id: "payroll-cert-wak-2025-10" },
    update: {},
    create: { id: "payroll-cert-wak-2025-10", districtId: wakiso.id, employeeId: govEmployee.id, period: "2025-10", dhroId: dhro.id, certifiedAt: new Date("2025-10-31"), payrollAmount: 6125000, employeeCount: 1, discrepancies: [], status: "certified" },
  })

  await prisma.statutoryReport.upsert({
    where: { id: "report-wak-q3-2025" },
    update: {},
    create: { id: "report-wak-q3-2025", districtId: wakiso.id, reportType: "quarterly_dsc", period: "2025-Q3", generatedBy: secretary.id, generatedAt: new Date("2025-09-30"), dataSnapshot: { openRecruitmentCycles: 1, applicationsReceived: 3, shortlisted: 1, pwdApplicants: 1 }, status: "draft" },
  })

  const existingSeedAudit = await prisma.immutableAuditEvent.findFirst({ where: { action: "seed_recruitment_cycle", entityId: cycle.id } })
  if (!existingSeedAudit) {
    await prisma.immutableAuditEvent.create({
      data: {
        districtId: wakiso.id,
        recruitmentCycleId: cycle.id,
        actorId: secretary.id,
        actorRole: "SECRETARY_DSC",
        action: "seed_recruitment_cycle",
        entityType: "RecruitmentCycle",
        entityId: cycle.id,
        afterStateHash: "seed-demo",
        metadata: { source: "prisma/seed-dsc.ts", postRef: cycle.postRef, otherDemoDistricts: [mbarara.name, kotido.name] },
      },
    })
  }
}

async function upsertApplication(prisma: any, cycle: any, wakiso: any, id: string, applicationRef: string, intakeChannel: string, firstName: string, lastName: string, nin: string, gender: string, status: string, complete: boolean, paper = false) {
  return prisma.pSCForm3Application.upsert({
    where: { applicationRef },
    update: {},
    create: {
      id,
      recruitmentCycleId: cycle.id,
      districtId: wakiso.id,
      postRef: cycle.postRef,
      intakeChannel,
      firstName,
      lastName,
      nin,
      dateOfBirth: new Date("1994-04-16"),
      gender,
      pwdStatus: paper,
      nationality: "Ugandan",
      subCounty: paper ? "Entebbe Municipality" : "Busukuma",
      district: "Wakiso",
      region: "Central",
      phone: intakeChannel === "online" ? "+256701234567" : "+256782345678",
      email: intakeChannel === "online" ? "christine.namusisi@example.com" : null,
      educationHistory: [{ level: "Diploma", institution: "Mulago School of Clinical Officers", year: 2018 }],
      qualifications: [{ name: "Diploma in Clinical Medicine", awardDate: "2018-11-20" }],
      employmentHistory: [{ employer: "Kasangati HC IV", role: "Clinical Assistant", years: 4 }],
      professionalBodies: [{ body: "Allied Health Professionals Council", registrationNo: "AHPC/CO/22118" }],
      referees: [{ name: "Dr. Paul Ssewanyana", phone: "+256772000111" }],
      applicationRef,
      submittedAt: new Date("2025-08-04"),
      status,
      ninVerified: intakeChannel === "online",
      documentComplete: complete,
      scannedFormUrl: paper ? "/files/demo/psc-form-3-paper.pdf" : null,
      ocrExtracted: paper ? { confidence: 0.82, fields: ["firstName", "lastName", "nin", "phone"] } : undefined,
      clerkVerifiedBy: paper ? "Moses Kato" : null,
      clerkVerifiedAt: paper ? new Date("2025-08-11") : null,
      clerkLocked: paper,
      ussdSessionId: intakeChannel === "ussd" ? "AT-USSD-WAK-0002" : null,
    },
  })
}
