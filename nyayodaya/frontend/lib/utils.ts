import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DeadlineUrgency, ContemptRisk, CaseStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDaysUntilDeadline(deadline: string | undefined): number | null {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  const diffMs = deadlineDate.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function getDeadlineUrgency(deadline: string | undefined): DeadlineUrgency {
  const days = getDaysUntilDeadline(deadline)
  if (days === null) return 'ok'
  if (days <= 3) return 'critical'
  if (days <= 14) return 'soon'
  return 'ok'
}

export function formatDeadlineLabel(deadline: string | undefined): string {
  const days = getDaysUntilDeadline(deadline)
  if (days === null) return 'No deadline'
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function getStatusLabel(status: CaseStatus): string {
  const labels: Record<CaseStatus, string> = {
    processing: 'Processing',
    extracted: 'Extracted',
    pending_verification: 'Pending Verification',
    verified: 'Verified',
    rejected: 'Rejected',
    complied: 'Complied',
  }
  return labels[status] || status
}

export function getContemptRiskLabel(risk: ContemptRisk | undefined): string {
  if (!risk) return 'Unknown'
  const labels: Record<ContemptRisk, string> = {
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk',
  }
  return labels[risk]
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}
