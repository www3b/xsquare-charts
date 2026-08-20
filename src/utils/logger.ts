/**
 * Logger — централизованный логгер, обёртка над console.
 * Уровни: debug < info < warn < error. Адресуется всем модулям проекта
 * через `Logger` (единый экземпляр) или `createLogger(namespace)`.
 *
 * В проде позволяет подменить источник (sink) без правки потребителей
 * и отфильтровать уровни через `setLevel`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export type LogSink = {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

export interface LoggerApi {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  /** Уровень логирования для данного инстанса */
  setLevel(level: LogLevel): void
  /** Флаг активности уровня */
  isEnabled(level: LogLevel): boolean
  /** Временная метка для сообщений */
  timestamp(): string
  namespace: string
}

export class Logger implements LoggerApi {
  readonly namespace: string;
  private level: LogLevel;
  private sink: () => LogSink;

  constructor(namespace = 'xsquare', level: LogLevel = 'info', sink?: () => LogSink) {
    this.namespace = namespace;
    this.level = level;
    this.sink = sink ?? (() => console as unknown as LogSink);
  }

  get enabled(): boolean {
    return this.level !== 'silent';
  }

  private format(...args: unknown[]): unknown[] {
    return [`[${this.namespace}]`, ...args];
  }

  isEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.level];
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  timestamp(): string {
    return new Date().toISOString();
  }

  debug(...args: unknown[]): void {
    if (this.isEnabled('debug')) {
      this.sink().debug(...this.format(...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.isEnabled('info')) {
      this.sink().info(...this.format(...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.isEnabled('warn')) {
      this.sink().warn(...this.format(...args));
    }
  }

  error(...args: unknown[]): void {
    if (this.isEnabled('error')) {
      this.sink().error(...this.format(...args));
    }
  }
}

/** Единый логгер процесса. Можно заменить в run/тестах. */
export let logger: Logger = new Logger('xworkflow', 'info');

export function setGlobalLogger(instance: Logger): void {
  logger = instance;
}

/** Создать дочерний логгер с подпространством имён. */
export function createLogger(namespace: string, level?: LogLevel): Logger {
  return new Logger(`${logger.namespace}.${namespace}`, level ?? logger.getLevel());
}

export default logger;
