'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2 } from 'lucide-react'

interface FileUploaderProps {
  taskId: string
  onUploadSuccess: () => void
}

export function FileUploader({ taskId, onUploadSuccess }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${taskId}/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Save attachment record in DB
      const { error: dbError } = await supabase.from('task_attachments').insert({
        task_id: taskId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user?.id
      })

      if (dbError) throw dbError

      // Log history
      await supabase.from('task_history').insert({
        task_id: taskId,
        action: 'FILE_UPLOADED',
        user_id: user?.id,
        metadata: { file_name: file.name }
      })

      onUploadSuccess()
    } catch (error: any) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file: ' + error.message)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = '' // Reset input
    }
  }

  return (
    <div>
      <input
        type="file"
        id={`file-upload-${taskId}`}
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        className="gap-2"
        onClick={() => document.getElementById(`file-upload-${taskId}`)?.click()}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        {uploading ? 'Uploading...' : 'Attach File'}
      </Button>
    </div>
  )
}
