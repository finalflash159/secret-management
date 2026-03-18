/**
 * Cron utility functions for rotation scheduling
 */

/**
 * Validate cron expression (5 fields: minute hour day month weekday)
 */
export function isValidCronExpression(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }
  return true;
}

/**
 * Calculate next run time from cron expression
 */
export function calculateNextRunTime(cronExpression: string): Date {
  const now = new Date();
  const parts = cronExpression.split(/\s+/);

  if (parts.length !== 5) {
    // Default to 24 hours
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const [minute, hour] = parts;

  // Daily at midnight - "0 0 * * *"
  if (cronExpression === '0 0 * * *') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // Every hour - "0 * * * *"
  if (cronExpression === '0 * * * *') {
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    return nextHour;
  }

  // Weekly on Sunday - "0 0 * * 0"
  if (cronExpression === '0 0 * * 0') {
    const nextWeek = new Date(now);
    const daysUntilSunday = (7 - nextWeek.getDay()) % 7 || 7;
    nextWeek.setDate(nextWeek.getDate() + daysUntilSunday);
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek;
  }

  // Monthly on 1st - "0 0 1 * *"
  if (cronExpression === '0 0 1 * *') {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }

  // Custom time - parse hour and minute
  const hourNum = parseInt(hour);
  const minuteNum = parseInt(minute);

  if (!isNaN(hourNum) && !isNaN(minuteNum)) {
    const next = new Date(now);
    if (hourNum > now.getHours() || (hourNum === now.getHours() && minuteNum > now.getMinutes())) {
      // Today at specified time
      next.setHours(hourNum, minuteNum, 0, 0);
    } else {
      // Tomorrow at specified time
      next.setDate(next.getDate() + 1);
      next.setHours(hourNum, minuteNum, 0, 0);
    }
    return next;
  }

  // Default: 24 hours
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}
