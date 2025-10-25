import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database/schema.types'
import * as taskDb from '@/lib/database/tasks'

export class TaskService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new task and optionally assign it to clients
   */
  async createTaskAndAssign(
    taskData: {
      coachId: string
      title: string
      description?: string
      categoryId?: string
      isTemplate?: boolean
    },
    clientIds?: string[],
    dueDate?: string
  ) {
    // Create the task
    const task = await taskDb.createTask(this.supabase, taskData)

    // Assign to clients if provided
    if (clientIds && clientIds.length > 0 && dueDate) {
      const instances = await taskDb.bulkAssignTask(
        this.supabase,
        task.id,
        clientIds,
        dueDate
      )
      return { task, instances }
    }

    return { task, instances: [] }
  }

  /**
   * Get coach's task dashboard with stats
   */
  async getCoachDashboard(coachId: string) {
    const tasks = await taskDb.getTasksByCoachId(this.supabase, coachId)
    const categories = await taskDb.getCategoriesByCoachId(this.supabase, coachId)

    // Get all instances for these tasks
    const instancesPromises = tasks.map((task) =>
      this.supabase
        .from('task_instances')
        .select('*')
        .eq('task_id', task.id)
    )

    const instanceResults = await Promise.all(instancesPromises)
    const allInstances = instanceResults.flatMap((result) => result.data || [])

    return {
      tasks,
      categories,
      instances: allInstances,
      stats: {
        totalTasks: tasks.length,
        totalTemplates: tasks.filter((t) => t.is_template).length,
        totalAssignments: allInstances.length,
        completedAssignments: allInstances.filter((i) => i.status === 'completed')
          .length,
      },
    }
  }

  /**
   * Get client's task dashboard with progress
   */
  async getClientDashboard(clientId: string) {
    const instances = await taskDb.getTaskInstancesByClientId(
      this.supabase,
      clientId
    )

    // Group by status
    const byStatus = {
      pending: instances.filter((i) => i.status === 'pending'),
      in_progress: instances.filter((i) => i.status === 'in_progress'),
      completed: instances.filter((i) => i.status === 'completed'),
    }

    return {
      instances,
      byStatus,
      stats: {
        total: instances.length,
        pending: byStatus.pending.length,
        inProgress: byStatus.in_progress.length,
        completed: byStatus.completed.length,
        completionRate:
          instances.length > 0
            ? Math.round(
                (byStatus.completed.length / instances.length) * 100
              )
            : 0,
      },
    }
  }

  /**
   * Bulk assign task to multiple clients
   */
  async bulkAssignTask(
    taskId: string,
    clientIds: string[],
    dueDate: string
  ) {
    if (!clientIds.length) {
      throw new Error('At least one client must be selected')
    }

    if (new Date(dueDate) <= new Date()) {
      throw new Error('Due date must be in the future')
    }

    const instances = await taskDb.bulkAssignTask(
      this.supabase,
      taskId,
      clientIds,
      dueDate
    )

    return {
      created: instances.length,
      failed: 0,
      instances,
    }
  }

  /**
   * Update task with validation
   */
  async updateTaskWithValidation(
    taskId: string,
    updates: {
      title?: string
      description?: string
      categoryId?: string
      isTemplate?: boolean
    }
  ) {
    // Validate title if provided
    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        throw new Error('Title cannot be empty')
      }
      if (updates.title.length > 255) {
        throw new Error('Title must be 255 characters or less')
      }
    }

    // Validate description if provided
    if (updates.description !== undefined && updates.description.length > 5000) {
      throw new Error('Description must be 5000 characters or less')
    }

    return taskDb.updateTask(this.supabase, taskId, updates)
  }

  /**
   * Validate that user has access to task
   */
  async validateTaskAccess(
    taskId: string,
    userId: string,
    role: 'coach' | 'client'
  ): Promise<boolean> {
    const task = await taskDb.getTaskById(this.supabase, taskId)

    if (role === 'coach') {
      return task.coach_id === userId
    } else if (role === 'client') {
      // Check if client is assigned to this task
      const instance = await this.supabase
        .from('task_instances')
        .select('id')
        .eq('task_id', taskId)
        .eq('client_id', userId)
        .single()

      return !instance.error
    }

    return false
  }

  /**
   * Get task with full details including progress history
   */
  async getTaskWithProgress(instanceId: string) {
    return taskDb.getTaskInstanceById(this.supabase, instanceId)
  }

  /**
   * Log progress update for task instance
   */
  async logProgress(
    instanceId: string,
    update: {
      progressPercentage: number
      notes?: string
      attachments?: Array<{
        id: string
        url: string
        filename: string
        size: number
      }>
    }
  ) {
    // Validate progress percentage
    if (update.progressPercentage < 0 || update.progressPercentage > 100) {
      throw new Error('Progress percentage must be between 0 and 100')
    }

    return taskDb.createProgressUpdate(this.supabase, {
      instanceId,
      ...update,
    })
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(coachId: string) {
    const categories = await taskDb.getCategoriesByCoachId(
      this.supabase,
      coachId
    )

    const stats = await Promise.all(
      categories.map(async (category) => {
        const tasks = await this.supabase
          .from('tasks')
          .select('id')
          .eq('category_id', category.id)

        return {
          ...category,
          taskCount: tasks.data?.length || 0,
        }
      })
    )

    return stats
  }
}
