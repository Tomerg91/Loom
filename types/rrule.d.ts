declare module 'rrule' {
  export type Frequency = number;

  export interface Weekday {
    weekday: number;
  }

  export interface RRuleOptions {
    freq: Frequency;
    interval?: number;
    dtstart?: Date;
    count?: number;
    until?: Date;
    byweekday?: Weekday | number | Array<Weekday | number>;
    bymonthday?: number | number[];
    bysetpos?: number | number[];
    wkst?: Weekday | number;
    tzid?: string;
  }

  export interface RRuleInstance {
    all(callback?: (date: Date, index: number) => boolean): Date[];
    toString(): string;
    readonly origOptions: RRuleOptions;
  }

  export interface RRuleStatic {
    new (options: RRuleOptions): RRuleInstance;
    readonly DAILY: Frequency;
    readonly WEEKLY: Frequency;
    readonly MONTHLY: Frequency;
    readonly YEARLY: Frequency;
    readonly MO: Weekday;
    readonly TU: Weekday;
    readonly WE: Weekday;
    readonly TH: Weekday;
    readonly FR: Weekday;
    readonly SA: Weekday;
    readonly SU: Weekday;
    fromString(rule: string): RRuleInstance;
  }

  export const RRule: RRuleStatic;
}
