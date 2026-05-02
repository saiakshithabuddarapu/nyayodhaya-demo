'use client'

import { Case } from '@/types'

interface DepartmentComplianceProps {
  cases: Case[]
}

interface DeptStats {
  name: string
  code: string
  total: number
  verified: number
  pending: number
  rate: number
}

export function DepartmentCompliance({ cases }: DepartmentComplianceProps) {
  const deptMap: Record<string, DeptStats> = {}

  for (const c of cases) {
    const dept = c.respondent_department
    if (!dept) continue

    if (!deptMap[dept.id]) {
      deptMap[dept.id] = { name: dept.name, code: dept.code, total: 0, verified: 0, pending: 0, rate: 0 }
    }

    deptMap[dept.id].total++

    if (c.status === 'verified' || c.status === 'complied') {
      deptMap[dept.id].verified++
    } else if (c.status === 'pending_verification') {
      deptMap[dept.id].pending++
    }
  }

  const depts = Object.values(deptMap)
    .map((d) => ({ ...d, rate: d.total > 0 ? Math.round((d.verified / d.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)

  if (depts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-400">
        No department data yet
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">Department Compliance</h3>
        <p className="text-xs text-slate-400 mt-0.5">Verified vs total cases per department</p>
      </div>

      <ul className="divide-y divide-slate-100">
        {depts.map((dept) => (
          <li key={dept.code} className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-semibold text-slate-700">{dept.code}</span>
                <span className="ml-1.5 text-xs text-slate-400 hidden sm:inline">{dept.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{dept.verified}/{dept.total}</span>
                <span className={`font-semibold ${dept.rate >= 70 ? 'text-green-700' : dept.rate >= 40 ? 'text-amber-700' : 'text-red-700'}`}>
                  {dept.rate}%
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${dept.rate >= 70 ? 'bg-green-500' : dept.rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${dept.rate}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
