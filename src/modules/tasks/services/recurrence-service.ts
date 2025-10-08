/**
 * @fileoverview Service responsible for normalizing recurrence rules and
 * generating task-instance schedules. The implementation purposefully avoids
 * heavy third-party dependencies so it can run in constrained environments
 * (e.g., sandboxes without npm registry access) while still covering the
 * recurrence scenarios required by the Action Items & Homework roadmap.
 */

import {
  recurrenceRuleSchema,
  type RecurrenceRuleInput,
  type RecurrenceRulePersisted,
  type RecurrencePlan,
} from '../types/recurrence';

/** Maximum number of future instances generated during planning. */
const DEFAULT_INSTANCE_LIMIT = 10;

type RecurrenceWeekday = NonNullable<RecurrenceRuleInput['byWeekday']>[number];

const WEEKDAY_INDEX: Record<RecurrenceWeekday, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 0,
};

const INDEX_WEEKDAY: Record<number, RecurrenceWeekday> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
};

const cloneDate = (value: Date) => new Date(value.getTime());

const startOfWeek = (date: Date, weekStart: RecurrenceWeekday): Date => {
  const result = cloneDate(date);
  const current = result.getUTCDay();
  const target = WEEKDAY_INDEX[weekStart];
  const diff = (current - target + 7) % 7 || 0;
  result.setUTCDate(result.getUTCDate() - diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = cloneDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = cloneDate(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const monthLength = new Date(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  ).getUTCDate();
  result.setUTCDate(Math.min(day, monthLength));
  return result;
};

const addYears = (date: Date, years: number): Date => {
  const result = cloneDate(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
};

const sortAndDeduplicate = (dates: Date[]): Date[] => {
  const seen = new Set<number>();
  return dates
    .sort((a, b) => a.getTime() - b.getTime())
    .filter(date => {
      const time = date.getTime();
      if (seen.has(time)) {
        return false;
      }
      seen.add(time);
      return true;
    });
};

/**
 * Error thrown when recurrence parsing or schedule generation fails.
 */
export class RecurrenceServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecurrenceServiceError';
  }
}

/**
 * Service that converts recurrence metadata into deterministic instance plans.
 */
export class RecurrenceService {
  constructor(
    private readonly instanceLimit: number = DEFAULT_INSTANCE_LIMIT
  ) {}

  /** Exposes the maximum number of generated instances for external callers. */
  public get maxInstances(): number {
    return this.instanceLimit;
  }

  /**
   * Creates a schedule plan for task creation/update flows.
   */
  public planInstances({
    dueDate,
    recurrenceRule,
    maxInstances,
  }: {
    dueDate: Date | null;
    recurrenceRule?: unknown;
    maxInstances?: number;
  }): RecurrencePlan {
    const limit = Math.min(
      maxInstances ?? this.instanceLimit,
      this.instanceLimit
    );

    if (!dueDate) {
      if (recurrenceRule) {
        throw new RecurrenceServiceError(
          'A due date is required when specifying a recurrence rule.'
        );
      }

      return { recurrenceRule: null, instances: [] };
    }

    const normalizedRule = this.normalizeRule(recurrenceRule);

    if (!normalizedRule) {
      return {
        recurrenceRule: null,
        instances: [
          {
            dueDate: cloneDate(dueDate),
            scheduledDate: cloneDate(dueDate),
          },
        ],
      };
    }

    const occurrences = this.generateOccurrences(
      dueDate,
      normalizedRule,
      limit
    );

    return {
      recurrenceRule: this.persistRule(normalizedRule, dueDate, occurrences),
      instances: occurrences.map(date => ({
        dueDate: cloneDate(date),
        scheduledDate: cloneDate(date),
      })),
    };
  }

  /**
   * Normalizes arbitrary recurrence payloads into the strict schema.
   */
  public normalizeRule(rule: unknown): RecurrenceRuleInput | null {
    if (rule === null || rule === undefined) {
      return null;
    }

    if (typeof rule === 'string') {
      throw new RecurrenceServiceError(
        'String-based recurrence rules are not supported in this environment.'
      );
    }

    if (typeof rule !== 'object') {
      throw new RecurrenceServiceError('Unsupported recurrence payload.');
    }

    return recurrenceRuleSchema.parse(
      this.extractRuleObject(rule as Record<string, unknown>)
    );
  }

  private extractRuleObject(raw: Record<string, unknown>): unknown {
    if (raw.rule && typeof raw.rule === 'object') {
      return raw.rule;
    }

    if (raw.options && typeof raw.options === 'object') {
      return raw.options;
    }

    return raw;
  }

  private generateOccurrences(
    startDate: Date,
    rule: RecurrenceRuleInput,
    limit: number
  ): Date[] {
    const occurrences: Date[] = [];
    const until = rule.until ? new Date(rule.until) : null;
    const targetCount = rule.count ? Math.min(rule.count, limit) : limit;

    const pushIfValid = (candidate: Date) => {
      // Guard against inserting dates that fall before the provided start date.
      // This is especially important for weekly recurrences with multiple
      // weekdays where the rule might otherwise re-introduce days earlier in
      // the same week (e.g., starting on Wednesday with BYDAY=MO,WE).
      if (candidate < startDate) {
        return;
      }

      if (until && candidate > until) {
        return;
      }

      occurrences.push(candidate);
    };

    switch (rule.frequency) {
      case 'DAILY': {
        let current = cloneDate(startDate);
        while (occurrences.length < targetCount) {
          pushIfValid(cloneDate(current));
          current = addDays(current, rule.interval);
          if (until && current > until && occurrences.length >= targetCount) {
            break;
          }
        }
        break;
      }
      case 'WEEKLY': {
        const weekStart = rule.weekStart ?? 'MO';
        const weekdays =
          rule.byWeekday && rule.byWeekday.length > 0
            ? (Array.from(new Set(rule.byWeekday)) as RecurrenceWeekday[])
            : [INDEX_WEEKDAY[startDate.getUTCDay()] as RecurrenceWeekday];

        const applyStartTime = (date: Date) => {
          const withTime = cloneDate(date);
          withTime.setUTCHours(
            startDate.getUTCHours(),
            startDate.getUTCMinutes(),
            startDate.getUTCSeconds(),
            startDate.getUTCMilliseconds()
          );
          return withTime;
        };

        pushIfValid(cloneDate(startDate));

        const weekCursor = startOfWeek(startDate, weekStart);
        let weeksGenerated = 0;

        while (occurrences.length < targetCount) {
          const candidateWeek =
            weeksGenerated === 0
              ? startOfWeek(startDate, weekStart)
              : addDays(weekCursor, weeksGenerated * rule.interval * 7);

          for (const weekday of weekdays) {
            const dayIndex = WEEKDAY_INDEX[weekday];
            const candidate = applyStartTime(
              addDays(
                candidateWeek,
                (dayIndex - candidateWeek.getUTCDay() + 7) % 7
              )
            );
            if (
              weeksGenerated === 0 &&
              candidate.getTime() === startDate.getTime()
            ) {
              continue;
            }
            if (occurrences.length >= targetCount) {
              break;
            }
            pushIfValid(candidate);
          }

          weeksGenerated += 1;
          if (until && addDays(candidateWeek, rule.interval * 7) > until) {
            break;
          }
        }
        break;
      }
      case 'MONTHLY': {
        const monthDays =
          rule.byMonthDay && rule.byMonthDay.length > 0
            ? sortAndDeduplicate(
                rule.byMonthDay.map(
                  day =>
                    new Date(
                      Date.UTC(
                        startDate.getUTCFullYear(),
                        startDate.getUTCMonth(),
                        day
                      )
                    )
                )
              ).map(date => date.getUTCDate())
            : [startDate.getUTCDate()];

        let cursor = cloneDate(startDate);
        while (occurrences.length < targetCount) {
          for (const day of monthDays) {
            const candidate = new Date(
              Date.UTC(
                cursor.getUTCFullYear(),
                cursor.getUTCMonth(),
                day,
                cursor.getUTCHours(),
                cursor.getUTCMinutes(),
                cursor.getUTCSeconds(),
                cursor.getUTCMilliseconds()
              )
            );
            if (candidate.getUTCMonth() !== cursor.getUTCMonth()) {
              continue;
            }
            pushIfValid(candidate);
            if (occurrences.length >= targetCount) {
              break;
            }
          }
          cursor = addMonths(cursor, rule.interval);
          if (until && cursor > until) {
            break;
          }
        }
        break;
      }
      case 'YEARLY': {
        let cursor = cloneDate(startDate);
        while (occurrences.length < targetCount) {
          pushIfValid(cloneDate(cursor));
          cursor = addYears(cursor, rule.interval);
          if (until && cursor > until) {
            break;
          }
        }
        break;
      }
      default: {
        throw new RecurrenceServiceError('Unsupported recurrence frequency.');
      }
    }

    return sortAndDeduplicate(occurrences).slice(0, targetCount);
  }

  private persistRule(
    rule: RecurrenceRuleInput,
    startDate: Date,
    occurrences: Date[]
  ): RecurrenceRulePersisted {
    const firstOccurrence = occurrences[0] ?? startDate;
    return {
      ...rule,
      startDate: firstOccurrence.toISOString(),
      rrule: this.toRRuleLikeString(rule, firstOccurrence),
    };
  }

  private toRRuleLikeString(
    rule: RecurrenceRuleInput,
    startDate: Date
  ): string {
    const components: string[] = [`FREQ=${rule.frequency}`];

    if (rule.interval && rule.interval !== 1) {
      components.push(`INTERVAL=${rule.interval}`);
    }

    if (rule.count) {
      components.push(`COUNT=${rule.count}`);
    }

    if (rule.until) {
      components.push(
        `UNTIL=${rule.until.replace(/[-:]/g, '').replace('.000', '')}`
      );
    }

    if (rule.byWeekday && rule.byWeekday.length > 0) {
      components.push(`BYDAY=${rule.byWeekday.join(',')}`);
    }

    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      components.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
    }

    components.push(
      `DTSTART=${startDate.toISOString().replace(/[-:]/g, '').replace('.000', '')}`
    );

    return components.join(';');
  }
}
