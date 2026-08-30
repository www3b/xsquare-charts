/**
 * @namespace Chart._adapters
 * @since 2.8.0
 * @private
 */

import type {AnyObject} from '../shared/types/basic.js';
import type {ChartOptions} from '../shared/types/index.js';

export type TimeUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DateAdapter<T extends AnyObject = AnyObject> {
  readonly options: T;
  /**
   * Will called with chart options after adapter creation.
   */
  init(this: DateAdapter<T>, chartOptions: ChartOptions): void;
  /**
   * Returns a map of time formats for the supported formatting units defined
   * in Unit as well as 'datetime' representing a detailed date/time string.
   */
  formats(this: DateAdapter<T>): Record<TimeUnit | 'datetime', string>;
  /**
   * Parses the given `value` and return the associated timestamp.
   * @param value - the value to parse (usually comes from the data)
   * @param [format] - the expected data format
   */
  parse(this: DateAdapter<T>, value: unknown, format?: string): number | null;
  /**
   * Returns the formatted date in the specified `format` for a given `timestamp`.
   * @param timestamp - the timestamp to format
   * @param format - the date/time token
   */
  format(this: DateAdapter<T>, timestamp: number, format: string): string;
  /**
   * Adds the specified `amount` of `unit` to the given `timestamp`.
   * @param timestamp - the input timestamp
   * @param amount - the amount to add
   * @param unit - the unit as string
   */
  add(this: DateAdapter<T>, timestamp: number, amount: number, unit: TimeUnit): number;
  /**
   * Returns the number of `unit` between the given timestamps.
   * @param a - the input timestamp (reference)
   * @param b - the timestamp to subtract
   * @param unit - the unit as string
   */
  diff(this: DateAdapter<T>, a: number, b: number, unit: TimeUnit): number;
  /**
   * Returns start of `unit` for the given `timestamp`.
   * @param timestamp - the input timestamp
   * @param unit - the unit as string
   * @param [weekday] - the ISO day of the week with 1 being Monday
   * and 7 being Sunday (only needed if param *unit* is `isoWeek`).
   */
  startOf(this: DateAdapter<T>, timestamp: number, unit: TimeUnit | 'isoWeek', weekday?: number | boolean): number;
  /**
   * Returns end of `unit` for the given `timestamp`.
   * @param timestamp - the input timestamp
   * @param unit - the unit as string
   */
  endOf(this: DateAdapter<T>, timestamp: number, unit: TimeUnit): number;
}

function abstract<T = void>(): T {
  throw new Error('This method is not implemented: Check that a complete date adapter is provided.');
}

const UNIT_SIZE: Record<string, number> = {
  millisecond: 1,
  second: 1e3,
  minute: 6e4,
  hour: 36e5,
  day: 864e5,
  week: 6048e5,
  month: 2592e6,
  quarter: 7776e6,
  year: 31536e6
};

/**
 * Date adapter (current used by the time scale)
 * @namespace Chart._adapters._date
 * @memberof Chart._adapters
 * @private
 */
class DateAdapterBase implements DateAdapter {

  /**
   * Override default date adapter methods.
   * Accepts type parameter to define options type.
   * @example
   * Chart._adapters._date.override<{myAdapterOption: string}>({
   *   init() {
   *     console.log(this.options.myAdapterOption);
   *   }
   * })
   */
  static override<T extends AnyObject = AnyObject>(
    members: Partial<Omit<DateAdapter<T>, 'options'>>
  ) {
    Object.assign(DateAdapterBase.prototype, members);
  }

  readonly options: AnyObject;

  constructor(options?: AnyObject) {
    this.options = options || {};
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  init() {}

  formats(): Record<TimeUnit | 'datetime', string> {
    return {
      datetime: 'datetime', millisecond: 'millisecond', second: 'second', minute: 'minute',
      hour: 'hour', day: 'day', week: 'week', month: 'month', quarter: 'quarter', year: 'year'
    };
  }

  parse(value: unknown): number | null {
    const parsed = value instanceof Date ? +value : typeof value === 'number' ? value : Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  format(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  add(timestamp: number, amount: number, unit: TimeUnit): number {
    return timestamp + amount * (UNIT_SIZE[unit] || 1);
  }

  diff(a: number, b: number, unit: TimeUnit): number {
    return (a - b) / (UNIT_SIZE[unit] || 1);
  }

  startOf(timestamp: number): number {
    return timestamp;
  }

  endOf(timestamp: number): number {
    return timestamp;
  }
}

export default {
  _date: DateAdapterBase as {
    new (options?: AnyObject): DateAdapter;
    override<T extends AnyObject = AnyObject>(
      members: Partial<Omit<DateAdapter<T>, 'options'>>
    ): void;
  }
};
