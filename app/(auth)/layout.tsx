export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col bg-blue-600 p-10 relative overflow-hidden flex-shrink-0">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white translate-y-1/3 -translate-x-1/3" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">DSC-HRMS</p>
            <p className="text-blue-200 text-xs">Government HR Platform</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative mt-auto">
          <h2 className="text-3xl font-bold text-white leading-tight">
            District Service Commission Human Resource Management System
          </h2>
          <p className="text-blue-200 mt-4 text-sm leading-relaxed">
            The official 17-step recruitment and workforce management platform for Uganda's district local governments.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              '17-step DSC recruitment workflow',
              'NIRA, UNEB, NCHE credential verification',
              'Immutable audit trail for IGG compliance',
              'Ghost worker detection & payroll certification',
              'MoPS, PSC & HCM integration-ready',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-blue-100 text-sm">{f}</p>
              </div>
            ))}
          </div>

          <p className="text-blue-300 text-xs mt-10">
            © {new Date().getFullYear()} DSC-HRMS · Ministry of Public Service, Uganda
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-bold text-gray-900">DSC-HRMS</p>
          </div>

          <div className="card p-8 shadow-md shadow-gray-200/60">
            {children}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Secured · Government of Uganda · Official use only
          </p>
        </div>
      </div>
    </div>
  )
}
