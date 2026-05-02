import { JobStatus } from '@/types'

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

export async function triggerPipeline(fileId: string, fileUrl?: string): Promise<{ job_id: string }> {
  const params = new URLSearchParams({ file_id: fileId })
  if (fileUrl) params.set('file_url', fileUrl)

  const response = await fetch(`${FASTAPI_URL}/api/process-judgment?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `Pipeline trigger failed: ${response.status}`)
  }

  return response.json()
}

export function pollJobStatus(
  jobId: string,
  onProgress: (status: JobStatus) => void,
  onComplete: (caseId: string) => void,
  onError: (error: string) => void
): () => void {
  const POLL_INTERVAL_MS = 2000
  const TIMEOUT_MS = 600_000 // 10 minutes
  let intervalId: ReturnType<typeof setInterval> | null = null
  let elapsed = 0
  let stopped = false

  const stop = () => {
    stopped = true
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const poll = async () => {
    if (stopped) return

    elapsed += POLL_INTERVAL_MS
    if (elapsed >= TIMEOUT_MS) {
      stop()
      onError('Processing timed out after 10 minutes. Please try again.')
      return
    }

    try {
      const response = await fetch(`${FASTAPI_URL}/api/status/${jobId}`)

      if (!response.ok) {
        if (response.status === 404) {
          stop()
          onError('Job not found. The server may have restarted.')
          return
        }
        throw new Error(`Status check failed: ${response.status}`)
      }

      const status: JobStatus = await response.json()

      onProgress(status)

      if (status.status === 'complete' && status.case_id) {
        stop()
        onComplete(status.case_id)
      } else if (status.status === 'failed') {
        stop()
        onError(status.error || 'Processing failed. Please check the PDF and try again.')
      }
    } catch (err) {
      // Network error — keep polling, don't abort
      console.warn('Poll error (will retry):', err)
    }
  }

  // Start polling immediately then on interval
  poll()
  intervalId = setInterval(poll, POLL_INTERVAL_MS)

  return stop
}
