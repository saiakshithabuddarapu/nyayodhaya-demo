import { createServiceClient } from '@/lib/supabase/server'
import { MetricsGrid, DeadlineTracker, DepartmentCompliance, RecentCases } from '@/components/dashboard'
import { Case, DashboardMetrics } from '@/types'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createServiceClient()

  const [allCasesRes, verifiedTodayRes] = await Promise.all([
    supabase
      .from('cases')
      .select(`
        id, case_number, court, order_date, status, claimants, respondents, 
        key_directives, absolute_deadline, comply_recommendation, contempt_risk, 
        created_at, updated_at,
        respondent_department:departments(id, name, code)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('cases')
      .select('id', { count: 'exact' })
      .eq('status', 'verified')
      .gte('updated_at', new Date(Date.now() - 86400000).toISOString()),
  ])

  const allCases = (allCasesRes.data ?? []) as unknown as Case[]
  const verifiedTodayCount = verifiedTodayRes.count ?? 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)

  const criticalDeadlines = allCases.filter((c) => {
    if (!c.absolute_deadline) return false
    const d = new Date(c.absolute_deadline)
    return d <= threeDaysLater && (c.status === 'verified' || c.status === 'pending_verification')
  }).length

  const verifiedCases = allCases.filter((c) => c.status === 'verified' || c.status === 'complied').length
  const pendingVerification = allCases.filter((c) => c.status === 'pending_verification').length
  const complianceRate = allCases.length > 0 ? (verifiedCases / allCases.length) * 100 : 0

  const metrics: DashboardMetrics = {
    total_cases: allCases.length,
    pending_verification: pendingVerification,
    verified_today: verifiedTodayCount,
    critical_deadlines: criticalDeadlines,
    compliance_rate: complianceRate,
  }

  const deadlineCases = allCases
    .filter((c) => c.absolute_deadline && (c.status === 'verified' || c.status === 'pending_verification'))
    .slice(0, 10)

  const recentVerified = allCases
    .filter((c) => c.status === 'verified' || c.status === 'complied')
    .slice(0, 10)

  return { metrics, allCases, deadlineCases, recentVerified }
}

export default async function DashboardPage() {
  const { metrics, allCases, deadlineCases, recentVerified } = await getDashboardData()

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Human-verified intelligence only. All AI-extracted data requires officer approval before appearing here.
        </p>
      </div>

      <MetricsGrid metrics={metrics} />

      <div className="grid lg:grid-cols-2 gap-6">
        <DeadlineTracker cases={deadlineCases} />
        <DepartmentCompliance cases={allCases} />
      </div>

      <RecentCases cases={recentVerified} />
    </div>
  )
}
