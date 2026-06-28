import { SupabaseClient } from '@supabase/supabase-js'

export async function recalculateTaskProgress(supabase: SupabaseClient, taskId: string): Promise<number | null> {
  try {
    // 1. Fetch all checklist items for the task
    const { data: checklists, error: checklistError } = await supabase
      .from('task_checklists')
      .select('is_completed')
      .eq('task_id', taskId)

    if (checklistError) throw checklistError

    // 2. Fetch the current task status and progress
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('status, progress')
      .eq('id', taskId)
      .single()

    if (taskError) throw taskError

    let newProgress = task.progress || 0

    if (checklists && checklists.length > 0) {
      const completed = checklists.filter((c: any) => c.is_completed).length
      newProgress = Math.round((completed / checklists.length) * 100)
    } else {
      // If no checklists exist, set progress according to status
      if (task.status === 'Completed') {
        newProgress = 100
      } else if (task.status === 'Draft' || task.status === 'Pending') {
        newProgress = 0
      }
    }

    // 3. Update the tasks table if progress has changed (or to be safe, always update)
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ progress: newProgress })
      .eq('id', taskId)

    if (updateError) throw updateError

    return newProgress
  } catch (error) {
    console.error('Error in recalculateTaskProgress:', error)
    return null
  }
}
