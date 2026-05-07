'use client'

import { useEffect, useState } from 'react'
import { JobStatus } from '@/types'
import { pollJobStatus } from '@/lib/api/pipeline'
import { Progress } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PipelineProgressProps {
  jobId: string
  onComplete: (caseId: string) => void
  onError?: (error: string) => void
}

interface Step {
  label: string
  sublabel: string
  minProgress: number
}

const STEPS: Step[] = [
  { label: 'Downloading PDF from storage',   sublabel: 'Supabase Storage',           minProgress: 5  },
  { label: 'Parsing document structure',      sublabel: 'PyMuPDF',                    minProgress: 15 },
  { label: 'Extracting with Gemini AI',       sublabel: 'gemini-2.5-flash',           minProgress: 30 },
  { label: 'Computing confidence scores',     sublabel: 'Multi-signal validation',    minProgress: 55 },
  { label: 'Generating action plan',          sublabel: 'Strategic Intelligence',     minProgress: 75 },
  { label: 'Queuing for verification',        sublabel: 'Human-in-the-loop',          minProgress: 92 },
]

function getStepState(step: Step, nextStep: Step | undefined, progress: number, status: string) {
  if (status === 'complete' || progress >= (nextStep?.minProgress ?? 101)) return 'done'
  if (progress >= step.minProgress) return 'active'
  return 'pending'
}

export function PipelineProgress({ jobId, onComplete, onError }: PipelineProgressProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stop = pollJobStatus(
      jobId,
      (status) => setJobStatus(status),
      (caseId) => onComplete(caseId),
      (err) => {
        setError(err)
        onError?.(err)
      }
    )
    return stop
  }, [jobId, onComplete, onError])

  const progress = jobStatus?.progress ?? 0
  const status = jobStatus?.status ?? 'queued'

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-900">
            {status === 'complete' ? 'Processing complete' : 'Processing judgment…'}
          </span>
          <span className="text-sm font-bold text-teal-700">{progress}%</span>
        </div>
        
        {status !== 'complete' && status !== 'failed' && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-md flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="mt-0.5 text-amber-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-[11px] font-medium text-amber-800 leading-tight">
              <strong>Processing in progress:</strong> Please wait while the AI pipeline analyzes the document. This may take 30-60 seconds...
            </p>
          </div>
        )}
        <Progress
          value={progress}
          variant={status === 'failed' ? 'destructive' : 'default'}
        />
        {jobStatus?.current_step && (
          <p className="text-xs text-slate-400 mt-1.5">{jobStatus.current_step}</p>
        )}
      </div>

      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const state = getStepState(step, STEPS[i + 1], progress, status)

          return (
            <li key={step.label} className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {state === 'done' ? (
                  <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : state === 'active' ? (
                  <div className="w-5 h-5 rounded-full border-2 border-teal-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                )}
              </div>
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  state === 'done' ? 'text-slate-700' : state === 'active' ? 'text-teal-700' : 'text-slate-400'
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400">{step.sublabel}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Processing failed:</strong> {error}
        </div>
      )}
    </div>
  )
}
