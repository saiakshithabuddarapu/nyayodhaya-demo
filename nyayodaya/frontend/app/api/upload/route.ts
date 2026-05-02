import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { triggerPipeline } from '@/lib/api/pipeline'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds 50MB limit (received ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()
    const fileUuid = randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `judgments/${fileUuid}/${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('judgments')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from('judgments')
      .getPublicUrl(storagePath)

    const fileUrl = urlData?.publicUrl

    // Trigger the AI pipeline
    const { job_id } = await triggerPipeline(storagePath, fileUrl)

    return NextResponse.json({
      job_id,
      file_id: storagePath,
      file_url: fileUrl,
      file_name: file.name,
    })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
