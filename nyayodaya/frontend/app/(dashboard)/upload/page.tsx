'use client'

import { useState, useCallback } from 'react'
import { UploadZone, PipelineProgress, ExtractionResult } from '@/components/upload'
import { Case } from '@/types'

type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleUpload = useCallback(async (file: File) => {
    setState('uploading')
    setErrorMsg(null)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Upload failed: ${res.status}`)
      }

      const data = await res.json()
      setJobId(data.job_id)
      setState('processing')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }, [])

  const handleComplete = useCallback(async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases?status=pending_verification`)
      if (!res.ok) throw new Error('Failed to fetch case')
      const data = await res.json()
      const found = data.cases?.find((c: Case) => c.id === caseId)
      if (found) {
        setCaseData(found)
        setState('complete')
      } else {
        setState('complete')
      }
    } catch {
      setState('complete')
    }
  }, [])

  const handleError = useCallback((error: string) => {
    setErrorMsg(error)
    setState('error')
  }, [])

  const reset = () => {
    setState('idle')
    setJobId(null)
    setCaseData(null)
    setErrorMsg(null)
    setFileName(null)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Upload Judgment</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload a Karnataka High Court judgment PDF. The AI pipeline will extract, analyze, and queue it for officer verification.
        </p>
      </div>

      {state === 'idle' && (
        <UploadZone onUpload={handleUpload} />
      )}

      {state === 'uploading' && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="inline-flex w-10 h-10 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Uploading {fileName}…</p>
          <p className="text-xs text-slate-400 mt-1">Sending to secure storage</p>
        </div>
      )}

      {state === 'processing' && jobId && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-sm text-slate-600 flex items-center gap-2">
            <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span><strong>{fileName}</strong> uploaded successfully. AI pipeline running…</span>
          </div>
          <PipelineProgress jobId={jobId} onComplete={handleComplete} onError={handleError} />
        </div>
      )}

      {state === 'complete' && (
        <div className="space-y-4">
          {caseData ? (
            <ExtractionResult caseData={caseData} />
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
              <div className="text-green-700 font-semibold mb-1">Processing complete</div>
              <p className="text-sm text-green-600">Case queued for verification. Go to the Verify page.</p>
            </div>
          )}
          <button
            onClick={reset}
            className="text-sm text-slate-500 hover:text-slate-800 underline"
          >
            Upload another judgment
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <p className="font-semibold text-red-700 mb-1">Processing failed</p>
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
          <button
            onClick={reset}
            className="text-sm text-slate-500 hover:text-slate-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Info callout */}
      <div className="bg-white border border-slate-100 rounded-lg p-4 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">What happens after upload?</p>
        <ol className="space-y-0.5 list-decimal list-inside">
          <li>PDF is stored securely in Supabase Storage</li>
          <li>AI pipeline extracts case details, directives, and deadlines</li>
          <li>Confidence scores are computed for each field</li>
          <li>Action plan is generated with compliance checklist</li>
          <li>Case is queued for officer verification — nothing is auto-approved</li>
        </ol>
      </div>
    </div>
  )
}
