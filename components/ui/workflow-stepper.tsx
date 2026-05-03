import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Step {
  number: number
  name: string
  status: 'completed' | 'active' | 'pending'
  actor?: string
}

interface WorkflowStepperProps {
  steps: Step[]
  currentStep: number
  compact?: boolean
}

export function WorkflowStepper({ steps, currentStep, compact = false }: WorkflowStepperProps) {
  if (compact) {
    const total = steps.length
    const pct = Math.round((currentStep / total) * 100)
    const active = steps.find(s => s.status === 'active')
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">{active?.name || `Step ${currentStep}`}</span>
          <span className="font-bold text-blue-600">{currentStep}/{total}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                step.status === 'completed' && 'bg-green-500 border-green-500 text-white',
                step.status === 'active' && 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200',
                step.status === 'pending' && 'bg-white border-gray-200 text-gray-400',
              )}>
                {step.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : step.number}
              </div>
              {step.status === 'active' && (
                <span className="text-xs text-blue-700 font-semibold mt-1 whitespace-nowrap max-w-20 text-center leading-tight">
                  {step.name}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-1 transition-all', step.status === 'completed' ? 'bg-green-400' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
