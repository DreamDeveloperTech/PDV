/**
 * Structured logging utility.
 * Outputs JSON in production for log aggregation services.
 * Uses console methods in development for readability.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

function output(entry: LogEntry): void {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    console[entry.level === "debug" ? "log" : entry.level](JSON.stringify(entry));
  } else {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    console[entry.level === "debug" ? "log" : entry.level](`${prefix} ${entry.message}${contextStr}`);
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    output(formatEntry("debug", message, context));
  },
  info(message: string, context?: Record<string, unknown>): void {
    output(formatEntry("info", message, context));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    output(formatEntry("warn", message, context));
  },
  error(message: string, context?: Record<string, unknown>): void {
    output(formatEntry("error", message, context));
  },
};
