import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './schema.types'

/**
 * Query Functions - Read operations for tasks
 */

export async function getTasksByCoachId(
  supabase: SupabaseClient<Database>,
  coachId: string,
  options?: { templatesOnly?: boolean }
) {
  let query = supabase
    .from('tasks')
    .select('*, task_categories(*)')
    .eq('coach_id', coachId)

  if (options?.templatesOnly) {
    query = query.eq('is_template', true)
  } else {
    query = query.eq('is_template', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTaskById(
  supabase: SupabaseClient<Database>,
  taskId: string
) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_categories(*)')
    .eq('id', taskId)
    .single()

  if (error) throw error
  return data
}

export async function getTemplatesByCoachId(
  supabase: SupabaseClient<Database>,
  coachId: string
) {
  return getTasksByCoachId(supabase, coachId, { templatesOnly: true })
}

export async function getTaskInstancesByClientId(
  supabase: SupabaseClient<Database>,
  clientId: string,
  options?: { status?: 'pending' | 'in_progress' | 'completed' }
) {
  let query = supabase
    .from('task_instances')
    .select(`
      *,
      tasks(
        id,
        title,
        description,
        is_template,
        task_categories(*)
      )
    `)
    .eq('client_id', clientId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query.order('due_date', { ascending: true })
  if (error) throw error
  return data
}

export async function getTaskInstanceById(
  supabase: SupabaseClient<Database>,
  instanceId: string
) {
  const { data, error } = await supabase
    .from('task_instances')
    .select(`
      *,
      tasks(
        id,
        title,
        description,
        is_template,
        task_categories(*)
      ),
      task_progress_updates(*)
    `)
    .eq('id', instanceId)
    .single()

  if (error) throw error
  return data
}

export async function getProgressUpdates(
  supabase: SupabaseClient<Database>,
  instanceId: string
) {
  const { data, error } = await supabase
    .from('task_progress_updates')
    .select('*')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getCategoriesByCoachId(
  supabase: SupabaseClient<Database>,
  coachId: string
) {
  const { data, error } = await supabase
    .from('task_categories')
    .select('*')
    .eq('coach_id', coachId)
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Mutation Functions - Write operations for tasks
 */

export async function createTask(
  supabase: SupabaseClient<Database>,
  task: {
    coachId: string
    title: string
    description?: string
    categoryId?: string
    isTemplate?: boolean
  }
) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      coach_id: task.coachId,
      title: task.title,
      description: task.description,
      category_id: task.categoryId,
      is_template: task.isTemplate || false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(
  supabase: SupabaseClient<Database>,
  taskId: string,
  updates: {
    title?: string
    description?: string
    categoryId?: string
    isTemplate?: boolean
  }
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: updates.title,
      description: updates.description,
      category_id: updates.categoryId,
      is_template: updates.isTemplate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(
  supabase: SupabaseClient<Database>,
  taskId: string
) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

/**
 * Task Categories
 */

export async function createTaskCategory(
  supabase: SupabaseClient<Database>,
  category: {
    coachId: string
    name: string
    color: string
  }
) {
  const { data, error } = await supabase
    .from('task_categories')
    .insert({
      coach_id: category.coachId,
      name: category.name,
      color: category.color,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTaskCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  updates: {
    name?: string
    color?: string
  }
) {
  const { data, error } = await supabase
    .from('task_categories')
    .update({
      name: updates.name,
      color: updates.color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTaskCategory(
  supabase: SupabaseClient<Database>,
  categoryId: string
) {
  const { error } = await supabase
    .from('task_categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw error
}

/**
 * Task Instances - Assignment and tracking
 */

export async function assignTaskToClient(
  supabase: SupabaseClient<Database>,
  assignment: {
    taskId: string
    clientId: string
    dueDate: string
  }
) {
  const { data, error } = await supabase
    .from('task_instances')
    .insert({
      task_id: assignment.taskId,
      client_id: assignment.clientId,
      due_date: assignment.dueDate,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function bulkAssignTask(
  supabase: SupabaseClient<Database>,
  taskId: string,
  clientIds: string[],
  dueDate: string
) {
  const instances = clientIds.map((clientId) => ({
    task_id: taskId,
    client_id: clientId,
    due_date: dueDate,
    status: 'pending' as const,
  }))

  const { data, error } = await supabase
    .from('task_instances')
    .insert(instances)
    .select()

  if (error) throw error
  return data
}

export async function updateTaskInstance(
  supabase: SupabaseClient<Database>,
  instanceId: string,
  updates: {
    status?: 'pending' | 'in_progress' | 'completed'
    dueDate?: string
  }
) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.status) updateData.status = updates.status
  if (updates.dueDate) updateData.due_date = updates.dueDate
  if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('task_instances')
    .update(updateData)
    .eq('id', instanceId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function completeTaskInstance(
  supabase: SupabaseClient<Database>,
  instanceId: string
) {
  return updateTaskInstance(supabase, instanceId, {
    status: 'completed',
  })
}

/**
 * Task Progress Updates
 */

export async function createProgressUpdate(
  supabase: SupabaseClient<Database>,
  progressUpdate: {
    instanceId: string
    progressPercentage: number
    notes?: string
    attachments?: Array<{ id: string; url: string; filename: string; size: number }>
  }
) {
  const { data, error } = await supabase
    .from('task_progress_updates')
    .insert({
      instance_id: progressUpdate.instanceId,
      progress_percentage: progressUpdate.progressPercentage,
      notes: progressUpdate.notes,
      attachments: progressUpdate.attachments || [],
    })
    .select()
    .single()

  if (error) throw error

  // Auto-complete if progress is 100%
  if (progressUpdate.progressPercentage === 100) {
    await updateTaskInstance(supabase, progressUpdate.instanceId, {
      status: 'completed',
    })
  }

  return data
}

export async function updateProgressUpdate(
  supabase: SupabaseClient<Database>,
  updateId: string,
  updates: {
    progressPercentage?: number
    notes?: string
    attachments?: Array<{ id: string; url: string; filename: string; size: number }>
  }
) {
  const { data, error } = await supabase
    .from('task_progress_updates')
    .update({
      progress_percentage: updates.progressPercentage,
      notes: updates.notes,
      attachments: updates.attachments,
    })
    .eq('id', updateId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProgressUpdate(
  supabase: SupabaseClient<Database>,
  updateId: string
) {
  const { error } = await supabase
    .from('task_progress_updates')
    .delete()
    .eq('id', updateId)

  if (error) throw error
}
