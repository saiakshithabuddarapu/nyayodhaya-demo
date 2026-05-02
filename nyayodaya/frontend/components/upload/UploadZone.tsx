'use client'

import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onUpload: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (file: File): string | null => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return 'Only PDF files are accepted'
    }
    if (file.size > 50 * 1024 * 1024) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`
    }
    return null
  }

  const handleFile = useCallback((file: File) => {
    const err = validate(file)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onUpload(file)
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [disabled, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer',
          isDragging
            ? 'border-teal-500 bg-teal-50'
            : disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
            : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/30'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center',
            isDragging ? 'bg-teal-100' : 'bg-slate-100'
          )}>
            <svg
              className={cn('w-7 h-7', isDragging ? 'text-teal-600' : 'text-slate-400')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">
              {isDragging ? 'Drop the PDF here' : 'Drop judgment PDF here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or click to browse &mdash; PDF only, max 50MB
            </p>
          </div>

          {!disabled && (
            <Button size="sm" onClick={(e) => { e.stopPropagation() }}>
              Select PDF
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
