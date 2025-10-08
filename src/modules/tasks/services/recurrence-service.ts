/**
 * @fileoverview Service responsible for normalizing recurrence rules and
 * generating TaskInstance schedules using the `rrule` library. The service
 * centralizes conversion logic so both creation and update flows can generate
 * deterministic instance plans from user-provided recurrence metadata.
 */
import {
  RRule,
  type Frequency,
  type RRuleInstance,
  type RRuleOptions,
  type Weekday,
} from 'rrule';

import type {
  RecurrencePlan,
  RecurrenceRuleInput,
  RecurrenceRulePersisted,
  RecurrenceScheduleEntry,
} from '../types/recurrence';
import { recurrenceRuleSchema } from '../types/recurrence';

/** Maximum number of future instances generated during planning. */
const DEFAULT_INSTANCE_LIMIT = 10;

type RecurrenceWeekday = NonNullable<RecurrenceRuleInput['byWeekday']>[number];

const WEEKDAY_CODES: RecurrenceWeekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

const FREQUENCY_TO_STRING: Record<number, RecurrenceRuleInput['frequency']> = {
  [RRule.DAILY]: 'DAILY',
  [RRule.WEEKLY]: 'WEEKLY',
  [RRule.MONTHLY]: 'MONTHLY',
  [RRule.YEARLY]: 'YEARLY',
};

const cloneDate = (value: Date) => new Date(value.getTime());

const WEEKDAY_LOOKUP: Record<RecurrenceWeekday, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
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

    const { instances, rruleString } = this.generateSchedule(
      dueDate,
      normalizedRule,
      limit
    );

    return {
      recurrenceRule: this.persistRule(normalizedRule, dueDate, rruleString),
      instances,
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
      try {
        const parsed = RRule.fromString(rule);
        return this.fromOptions(parsed.origOptions);
      } catch (_error) {
        throw new RecurrenceServiceError(
          'Unsupported recurrence string. Expected an RFC 5545 RRULE.'
        );
      }
    }

    if (typeof rule !== 'object') {
      throw new RecurrenceServiceError('Unsupported recurrence payload.');
    }

    const candidate = this.extractRuleObject(rule as Record<string, unknown>);
    return recurrenceRuleSchema.parse(candidate);
  }

  private extractRuleObject(raw: Record<string, unknown>): unknown {
    if (typeof raw.frequency === 'string') {
      return raw;
    }

    if (raw.rule && typeof raw.rule === 'object') {
      return raw.rule;
    }

    if (raw.options && typeof raw.options === 'object') {
      return raw.options;
    }

    if (raw.rrule && typeof raw.rrule === 'string') {
      return this.normalizeRule(raw.rrule);
    }

    return raw;
  }

  private generateSchedule(
    startDate: Date,
    rule: RecurrenceRuleInput,
    limit: number
  ): { instances: RecurrenceScheduleEntry[]; rruleString: string } {
    const { rrule, occurrences } = this.buildRRule(startDate, rule, limit);

    const schedule = occurrences.length > 0 ? occurrences : [startDate];

    return {
      instances: schedule.map(date => ({
        dueDate: cloneDate(date),
        scheduledDate: cloneDate(date),
      })),
      rruleString: rrule.toString(),
    };
  }

  private buildRRule(
    startDate: Date,
    rule: RecurrenceRuleInput,
    limit: number
  ): { rrule: RRuleInstance; occurrences: Date[] } {
    const options: RRuleOptions = {
      freq: this.toFrequency(rule.frequency),
      interval: rule.interval ?? 1,
      dtstart: startDate,
    };

    if (rule.count !== undefined) {
      options.count = rule.count;
    }

    if (rule.until) {
      options.until = new Date(rule.until);
    }

    if (!options.count && !options.until) {
      options.count = limit;
    }

    if (rule.byWeekday) {
      options.byweekday = rule.byWeekday.map(
        weekday => WEEKDAY_LOOKUP[weekday]
      );
    }

    if (rule.byMonthDay) {
      options.bymonthday = [...rule.byMonthDay];
    }

    if (rule.bySetPosition) {
      options.bysetpos = [...rule.bySetPosition];
    }

    if (rule.weekStart) {
      options.wkst = WEEKDAY_LOOKUP[rule.weekStart];
    }

    if (rule.timezone) {
      (options as RRuleOptions & { tzid?: string }).tzid = rule.timezone;
    }

    const rrule = new RRule(options);
    const occurrences = rrule.all(
      (_date: Date, occurrenceIndex: number) => occurrenceIndex < limit
    );

    return { rrule, occurrences };
  }

  private toFrequency(frequency: RecurrenceRuleInput['frequency']): Frequency {
    switch (frequency) {
      case 'DAILY':
        return RRule.DAILY;
      case 'WEEKLY':
        return RRule.WEEKLY;
      case 'MONTHLY':
        return RRule.MONTHLY;
      case 'YEARLY':
        return RRule.YEARLY;
      default: {
        const exhaustiveCheck: never = frequency;
        throw new RecurrenceServiceError(
          `Unsupported recurrence frequency: ${exhaustiveCheck}`
        );
      }
    }
  }

  private persistRule(
    rule: RecurrenceRuleInput,
    startDate: Date,
    rruleString: string
  ): RecurrenceRulePersisted {
    return {
      ...rule,
      interval: rule.interval ?? 1,
      startDate: startDate.toISOString(),
      rrule: rruleString,
    };
  }

  private fromOptions(options: Partial<RRuleOptions>): RecurrenceRuleInput {
    const frequency =
      options.freq !== undefined
        ? FREQUENCY_TO_STRING[options.freq]
        : undefined;

    if (!frequency) {
      throw new RecurrenceServiceError(
        'Unable to determine recurrence frequency from RRULE options.'
      );
    }

    const normalized: Record<string, unknown> = {
      frequency,
      interval: options.interval ?? 1,
    };

    if (options.count !== undefined) {
      normalized.count = options.count;
    }

    if (options.until instanceof Date) {
      normalized.until = options.until.toISOString();
    }

    const weekdays = this.normalizeWeekdays(options.byweekday);
    if (weekdays && weekdays.length > 0) {
      normalized.byWeekday = weekdays;
    }

    const monthDays = this.normalizeNumericArray(options.bymonthday);
    if (monthDays) {
      normalized.byMonthDay = monthDays;
    }

    const setPositions = this.normalizeNumericArray(options.bysetpos);
    if (setPositions) {
      normalized.bySetPosition = setPositions;
    }

    const weekStart = this.normalizeWeekday(options.wkst);
    if (weekStart) {
      normalized.weekStart = weekStart;
    }

    const tzid = (options as { tzid?: string }).tzid;
    if (tzid) {
      normalized.timezone = tzid;
    }

    return recurrenceRuleSchema.parse(normalized);
  }

  private normalizeWeekdays(
    input?: Weekday | number | (Weekday | number)[]
  ): RecurrenceWeekday[] | undefined {
    if (input === undefined) {
      return undefined;
    }

    const values = Array.isArray(input) ? input : [input];
    return values.map(value => this.weekdayToCode(value));
  }

  private normalizeWeekday(
    value?: Weekday | number
  ): RecurrenceWeekday | undefined {
    if (value === undefined) {
      return undefined;
    }

    return this.weekdayToCode(value);
  }

  private normalizeNumericArray(
    value?: number | number[] | null
  ): number[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const values = Array.isArray(value) ? value : [value];
    return values.length > 0 ? [...values] : undefined;
  }

  private weekdayToCode(value: Weekday | number): RecurrenceWeekday {
    const weekdayIndex =
      typeof value === 'number' ? value : (value as Weekday).weekday;
    const normalizedIndex = ((weekdayIndex % 7) + 7) % 7;
    const code = WEEKDAY_CODES[normalizedIndex];

    if (!code) {
      throw new RecurrenceServiceError(
        `Unsupported weekday index: ${weekdayIndex}`
      );
    }

    return code;
  }
}
