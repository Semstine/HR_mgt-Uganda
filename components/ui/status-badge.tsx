import { cn } from '@/lib/utils'
import type { CandidateStatus, JobStatus } from '@prisma/client'
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_COLORS, JOB_STATUS_COLORS } from '@/types'

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <span className={cn('badge', CANDIDATE_STATUS_COLORS[status])}>
      {CANDIDATE_STATUS_LABELS[status]}
    </span>
  )
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={cn('badge', JOB_STATUS_COLORS[status])}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="badge bg-gray-100 text-gray-500">Not scored</span>
  const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={cn('badge', color)}>{score.toFixed(0)}%</span>
}
