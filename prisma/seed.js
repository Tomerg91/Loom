/**
 * Runtime JavaScript seed script executed by `npm run db:seed`.
 *
 * The logic mirrors `prisma/seed.ts`; update both files together to keep the
 * TypeScript definitions and runtime behavior aligned.
 */

const {
  NotificationJobStatus,
  NotificationJobType,
  PrismaClient,
  TaskPriority,
  TaskStatus,
} = require('@prisma/client');

/** @type {import('@prisma/client').PrismaClient} */
const prisma = new PrismaClient();

const DEFAULT_IDS = {
  coach: '11111111-1111-4111-8111-111111111111',
  client: '22222222-2222-4222-8222-222222222222',
};

/** @typedef {'habitFoundations' | 'wellnessRecovery' | 'accountability'} CategoryKey */

const CATEGORY_SEED = [
  {
    key: 'habitFoundations',
    id: '33333333-3333-4333-8333-333333333333',
    label: 'Habit Foundations',
    colorHex: '#1D7A85',
  },
  {
    key: 'wellnessRecovery',
    id: '44444444-4444-4444-8444-444444444444',
    label: 'Wellness & Recovery',
    colorHex: '#6BBF8E',
  },
  {
    key: 'accountability',
    id: '55555555-5555-4555-8555-555555555555',
    label: 'Accountability',
    colorHex: '#F76C5E',
  },
];

const TASK_SEED = [
  {
    id: '66666666-6666-4666-8666-666666666661',
    title: 'Daily Reflection Journal',
    description:
      'Capture three wins and one challenge each evening to reinforce accountability habits between coaching sessions.',
    priority: TaskPriority.MEDIUM,
    visibilityToCoach: true,
    dueOffsetDays: 1,
    recurrenceRule: {
      frequency: 'DAILY',
      interval: 1,
      count: 7,
    },
    categoryKey: 'accountability',
    instances: [
      {
        id: '77777777-7777-4777-8777-777777777771',
        dueOffsetDays: 1,
        scheduledOffsetDays: 0,
        status: TaskStatus.IN_PROGRESS,
        completionPercentage: 40,
        progressUpdates: [
          {
            id: '88888888-8888-4888-8888-888888888881',
            author: 'client',
            percentage: 40,
            isVisibleToCoach: true,
            note: 'Jotted down wins after dinner; planning to add more context tomorrow.',
            attachments: [
              {
                id: '99999999-9999-4999-8999-999999999991',
                fileName: 'day-one-reflection.pdf',
                fileUrl: 'https://example.com/demo/day-one-reflection.pdf',
                fileSize: 24576,
                mimeType: 'application/pdf',
                uploadedBy: 'client',
              },
            ],
          },
        ],
        notificationJobs: [
          {
            id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
            type: NotificationJobType.UPCOMING_DUE,
            scheduledOffsetHours: 12,
            status: NotificationJobStatus.SCHEDULED,
            payload: {
              template: 'tasks.upcomingDue',
              emphasis: 'reflection',
            },
          },
        ],
      },
      {
        id: '77777777-7777-4777-8777-777777777772',
        dueOffsetDays: 2,
        scheduledOffsetDays: 1,
        status: TaskStatus.PENDING,
        completionPercentage: 0,
        notificationJobs: [
          {
            id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
            type: NotificationJobType.UPCOMING_DUE,
            scheduledOffsetHours: 18,
            status: NotificationJobStatus.SCHEDULED,
            payload: {
              template: 'tasks.upcomingDue',
            },
          },
        ],
      },
      {
        id: '77777777-7777-4777-8777-777777777773',
        dueOffsetDays: 3,
        status: TaskStatus.PENDING,
        completionPercentage: 0,
      },
    ],
  },
  {
    id: '66666666-6666-4666-8666-666666666662',
    title: 'Mindful Movement Break',
    description:
      'Schedule 10-minute mobility sessions to break up sedentary work blocks and reduce tension before client meetings.',
    priority: TaskPriority.HIGH,
    visibilityToCoach: true,
    dueOffsetDays: 2,
    recurrenceRule: {
      frequency: 'WEEKLY',
      interval: 1,
      byWeekday: ['MO', 'WE', 'FR'],
    },
    categoryKey: 'wellnessRecovery',
    instances: [
      {
        id: '77777777-7777-4777-8777-777777777774',
        dueOffsetDays: -1,
        scheduledOffsetDays: -2,
        status: TaskStatus.OVERDUE,
        completionPercentage: 20,
        progressUpdates: [
          {
            id: '88888888-8888-4888-8888-888888888882',
            author: 'client',
            percentage: 20,
            isVisibleToCoach: false,
            note: 'Had to skip due to travel—rescheduling for tomorrow.',
          },
        ],
        notificationJobs: [
          {
            id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
            type: NotificationJobType.OVERDUE,
            scheduledOffsetHours: -6,
            status: NotificationJobStatus.PENDING,
          },
        ],
      },
      {
        id: '77777777-7777-4777-8777-777777777775',
        dueOffsetDays: 2,
        scheduledOffsetDays: 1,
        status: TaskStatus.PENDING,
        completionPercentage: 0,
        attachments: [
          {
            id: '99999999-9999-4999-8999-999999999992',
            fileName: 'mobility-sequence.png',
            fileUrl: 'https://example.com/demo/mobility-sequence.png',
            fileSize: 18240,
            mimeType: 'image/png',
            uploadedBy: 'coach',
          },
        ],
      },
      {
        id: '77777777-7777-4777-8777-777777777776',
        dueOffsetDays: 9,
        scheduledOffsetDays: 8,
        status: TaskStatus.PENDING,
        completionPercentage: 0,
      },
    ],
  },
  {
    id: '66666666-6666-4666-8666-666666666663',
    title: 'Weekly Accountability Prep',
    description:
      'Outline discussion points and submit outstanding wins ahead of the weekly accountability call with your coach.',
    priority: TaskPriority.MEDIUM,
    visibilityToCoach: true,
    dueOffsetDays: 5,
    recurrenceRule: {
      frequency: 'WEEKLY',
      interval: 1,
      byWeekday: ['TH'],
    },
    categoryKey: 'habitFoundations',
    instances: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        dueOffsetDays: 5,
        scheduledOffsetDays: 4,
        status: TaskStatus.PENDING,
        completionPercentage: 0,
        notificationJobs: [
          {
            id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
            type: NotificationJobType.ASSIGNMENT_CREATED,
            scheduledOffsetHours: 0,
            status: NotificationJobStatus.SENT,
            payload: {
              template: 'tasks.assignmentCreated',
            },
          },
        ],
      },
      {
        id: '77777777-7777-4777-8777-777777777778',
        dueOffsetDays: 12,
        scheduledOffsetDays: 11,
        status: TaskStatus.PENDING,
        completionPercentage: 0,
      },
      {
        id: '77777777-7777-4777-8777-777777777779',
        dueOffsetDays: 19,
        scheduledOffsetDays: 18,
        status: TaskStatus.PENDING,
        completionPercentage: 0,
      },
    ],
  },
];

const EXPORT_LOG_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// Anchor date (today at 17:00 UTC) used to generate deterministic offsets so the
// sample data remains relative to the current day while staying idempotent between
// successive seed executions.
const BASE_DATE = (() => {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      17,
      0,
      0,
      0
    )
  );
})();

// Calculates a future or past date relative to BASE_DATE using the provided day offset.
function dateFromOffset(days) {
  const date = new Date(BASE_DATE);
  date.setUTCDate(BASE_DATE.getUTCDate() + days);
  return date;
}

// Computes a timestamp offset by a number of hours from the supplied base date.
// Negative offsets move backwards (e.g., for overdue notifications).
function dateFromHoursOffset(base, hours) {
  return new Date(base.getTime() - hours * 60 * 60 * 1000);
}

// Ensures the demo task categories exist for the given coach, returning their identifiers.
async function seedCategories(coachId) {
  const results = {
    habitFoundations: { id: '' },
    wellnessRecovery: { id: '' },
    accountability: { id: '' },
  };

  for (const category of CATEGORY_SEED) {
    const record = await prisma.taskCategory.upsert({
      where: { id: category.id },
      update: {
        coachId,
        label: category.label,
        colorHex: category.colorHex,
      },
      create: {
        id: category.id,
        coachId,
        label: category.label,
        colorHex: category.colorHex,
      },
    });

    results[category.key] = { id: record.id };
  }

  return results;
}

// Upserts demo tasks and recreates their nested instances, progress updates, and notification jobs.
async function seedTasks(coachId, clientId, categories) {
  for (const task of TASK_SEED) {
    const dueDate =
      task.dueOffsetDays === null ? null : dateFromOffset(task.dueOffsetDays);

    await prisma.task.upsert({
      where: { id: task.id },
      update: {
        coachId,
        clientId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        visibilityToCoach: task.visibilityToCoach,
        dueDate,
        recurrenceRule: task.recurrenceRule,
        categoryId: categories[task.categoryKey].id,
        archivedAt: null,
      },
      create: {
        id: task.id,
        coachId,
        clientId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        visibilityToCoach: task.visibilityToCoach,
        dueDate,
        recurrenceRule: task.recurrenceRule,
        categoryId: categories[task.categoryKey].id,
      },
    });

    // Rebuild task instances so rerunning the seed keeps the dataset tidy and deterministic.
    await prisma.taskInstance.deleteMany({ where: { taskId: task.id } });

    for (const instance of task.instances) {
      const dueDateValue = dateFromOffset(instance.dueOffsetDays);
      const scheduledDateValue =
        instance.scheduledOffsetDays === undefined ||
        instance.scheduledOffsetDays === null
          ? null
          : dateFromOffset(instance.scheduledOffsetDays);
      const completedAtValue =
        instance.completedOffsetDays === undefined ||
        instance.completedOffsetDays === null
          ? null
          : dateFromOffset(instance.completedOffsetDays);

      await prisma.taskInstance.create({
        data: {
          id: instance.id,
          taskId: task.id,
          dueDate: dueDateValue,
          scheduledDate: scheduledDateValue,
          status: instance.status,
          completionPercentage: instance.completionPercentage,
          completedAt: completedAtValue,
          progressUpdates: instance.progressUpdates
            ? {
                create: instance.progressUpdates.map(update => ({
                  id: update.id,
                  authorId: update.author === 'coach' ? coachId : clientId,
                  percentage: update.percentage,
                  note: update.note,
                  isVisibleToCoach: update.isVisibleToCoach,
                  createdAt:
                    update.createdOffsetDays === undefined
                      ? undefined
                      : dateFromOffset(update.createdOffsetDays),
                  attachments: update.attachments
                    ? {
                        create: update.attachments.map(attachment => ({
                          id: attachment.id,
                          fileName: attachment.fileName,
                          fileUrl: attachment.fileUrl,
                          fileSize: attachment.fileSize,
                          mimeType: attachment.mimeType,
                          uploadedById:
                            attachment.uploadedBy === 'coach'
                              ? coachId
                              : clientId,
                        })),
                      }
                    : undefined,
                })),
              }
            : undefined,
          attachments: instance.attachments
            ? {
                create: instance.attachments.map(attachment => ({
                  id: attachment.id,
                  fileName: attachment.fileName,
                  fileUrl: attachment.fileUrl,
                  fileSize: attachment.fileSize,
                  mimeType: attachment.mimeType,
                  uploadedById:
                    attachment.uploadedBy === 'coach' ? coachId : clientId,
                })),
              }
            : undefined,
          notificationJobs: instance.notificationJobs
            ? {
                create: instance.notificationJobs.map(job => ({
                  id: job.id,
                  type: job.type,
                  status: job.status ?? NotificationJobStatus.PENDING,
                  scheduledAt: dateFromHoursOffset(
                    dueDateValue,
                    job.scheduledOffsetHours
                  ),
                  payload: job.payload,
                })),
              }
            : undefined,
        },
      });
    }
  }
}

// Seeds a representative export log entry for reporting screens.
async function seedExportLog(coachId, clientId) {
  await prisma.exportLog.upsert({
    where: { id: EXPORT_LOG_ID },
    update: {
      coachId,
      clientId,
      fileUrl: 'https://example.com/demo/client-progress.pdf',
      filters: {
        statuses: ['PENDING', 'OVERDUE'],
        includeAttachments: true,
      },
      completedAt: dateFromOffset(0),
    },
    create: {
      id: EXPORT_LOG_ID,
      coachId,
      clientId,
      fileUrl: 'https://example.com/demo/client-progress.pdf',
      filters: {
        statuses: ['PENDING', 'OVERDUE'],
        includeAttachments: true,
      },
      completedAt: dateFromOffset(0),
    },
  });
}

async function main() {
  const coachId = process.env.SEED_COACH_ID ?? DEFAULT_IDS.coach;
  const clientId = process.env.SEED_CLIENT_ID ?? DEFAULT_IDS.client;

  const categories = await seedCategories(coachId);
  await seedTasks(coachId, clientId, categories);
  await seedExportLog(coachId, clientId);

  console.info(
    '✅ Seeded demo categories, tasks, instances, progress updates, and export logs.'
  );
}

main()
  .catch(error => {
    console.error('❌ Failed to seed Action Items & Homework demo data.');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
