/**
 * Mathiyon AI - Real-Time Date & Time Tool
 * Provides real-time system clock resolution, timezone conversions, and deterministic date calculations.
 * NEVER hardcodes static dates.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

const TIMEZONE_MAP = {
  london: 'Europe/London',
  uk: 'Europe/London',
  japan: 'Asia/Tokyo',
  tokyo: 'Asia/Tokyo',
  'new york': 'America/New_York',
  ny: 'America/New_York',
  us: 'America/New_York',
  est: 'America/New_York',
  pst: 'America/Los_Angeles',
  california: 'America/Los_Angeles',
  india: 'Asia/Kolkata',
  chennai: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  mumbai: 'Asia/Kolkata',
  kolkata: 'Asia/Kolkata',
  singapore: 'Asia/Singapore',
  sydney: 'Australia/Sydney',
  paris: 'Europe/Paris',
  germany: 'Europe/Berlin',
  utc: 'UTC',
  gmt: 'UTC'
};

function resolveTimezone(text, fallbackTz = DEFAULT_TIMEZONE) {
  if (!text || typeof text !== 'string') return fallbackTz;
  const lower = text.toLowerCase();
  for (const [key, tz] of Object.entries(TIMEZONE_MAP)) {
    if (lower.includes(key)) return tz;
  }
  return fallbackTz;
}

function parseTargetDate(str, currentYear = new Date().getFullYear()) {
  const months = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
    may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8,
    october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11
  };

  const match = str.toLowerCase().match(/([a-z]+)\s*(\d{1,2})/);
  if (match && months[match[1]] !== undefined) {
    const month = months[match[1]];
    const day = parseInt(match[2], 10);
    return new Date(currentYear, month, day);
  }
  return null;
}

const timeDateTool = {
  name: 'TimeDateEngine',
  description: 'Real-time system time, date, timezone conversion, and deterministic date calculation service.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Time or date question' },
      userTimezone: { type: 'string', description: 'User preferred timezone' }
    },
    required: ['query']
  },

  async execute({ query, userTimezone = DEFAULT_TIMEZONE }) {
    const startTime = Date.now();
    const qLower = (query || '').toLowerCase().trim();
    const now = new Date();

    const targetTz = resolveTimezone(qLower, userTimezone);

    try {
      // 1. Date Calculation Checks
      if (qLower.includes('days until') || qLower.includes('how many days until')) {
        const targetDate = parseTargetDate(qLower, now.getFullYear());
        if (targetDate) {
          // If date has passed this year, look at next year
          if (targetDate < now) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
          const diffMs = targetDate.getTime() - now.getTime();
          const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const targetStr = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

          return {
            success: true,
            tool: 'TimeDateEngine',
            data: {
              type: 'DATE_CALCULATION',
              query,
              result: `${daysUntil} days until ${targetStr}`,
              days: daysUntil,
              targetDate: targetStr,
              formatted: `There are **${daysUntil} days** remaining until **${targetStr}**.`
            },
            metadata: { latencyMs: Date.now() - startTime, verified: true }
          };
        }
      }

      if (qLower.includes('days between') || qLower.includes('how many days between')) {
        const dates = [];
        const matches = [...qLower.matchAll(/([a-z]+)\s*(\d{1,2})/gi)];
        matches.forEach(m => {
          const parsed = parseTargetDate(m[0], now.getFullYear());
          if (parsed) dates.push({ str: m[0], date: parsed });
        });

        if (dates.length >= 2) {
          const d1 = dates[0].date;
          const d2 = dates[1].date;
          const diffMs = Math.abs(d2.getTime() - d1.getTime());
          const daysBetween = Math.round(diffMs / (1000 * 60 * 60 * 24));

          return {
            success: true,
            tool: 'TimeDateEngine',
            data: {
              type: 'DATE_CALCULATION',
              query,
              result: `${daysBetween} days between ${dates[0].str} and ${dates[1].str}`,
              days: daysBetween,
              formatted: `There are **${daysBetween} days** between ${dates[0].date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} and ${dates[1].date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`
            },
            metadata: { latencyMs: Date.now() - startTime, verified: true }
          };
        }
      }

      if (qLower.includes('days from today') || qLower.includes('days from now')) {
        const numMatch = qLower.match(/(\d+)\s*days/);
        if (numMatch) {
          const daysAdd = parseInt(numMatch[1], 10);
          const futureDate = new Date(now.getTime() + daysAdd * 24 * 60 * 60 * 1000);
          const formattedFuture = futureDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: targetTz
          });

          return {
            success: true,
            tool: 'TimeDateEngine',
            data: {
              type: 'DATE_CALCULATION',
              query,
              result: formattedFuture,
              daysAdded: daysAdd,
              formatted: `**${daysAdd} days from today** will be **${formattedFuture}**.`
            },
            metadata: { latencyMs: Date.now() - startTime, verified: true }
          };
        }
      }

      // 2. Real-Time Date/Time Information Retrieval
      const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: targetTz };
      const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: targetTz };

      const currentDateStr = now.toLocaleDateString('en-US', optionsDate);
      const currentTimeStr = now.toLocaleTimeString('en-US', optionsTime);
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: targetTz });
      const monthName = now.toLocaleDateString('en-US', { month: 'long', timeZone: targetTz });
      const currentYear = now.toLocaleDateString('en-US', { year: 'numeric', timeZone: targetTz });

      let formattedOutput = '';
      if (qLower.includes('time') || qLower.includes('நேரம்') || qLower.includes('clock') || targetTz !== userTimezone || /^(in\s+[a-zA-Z\s]+|[a-zA-Z\s]+\s*\?)$/i.test(qLower.trim())) {
        formattedOutput = `The current time in **${targetTz}** is **${currentTimeStr}** (${currentDateStr}).`;
      } else if (qLower.includes('day') || qLower.includes('நாள்')) {
        formattedOutput = `Today is **${dayOfWeek}**, ${currentDateStr}.`;
      } else if (qLower.includes('year') || qLower.includes('வருடம்')) {
        formattedOutput = `The current year is **${currentYear}**.`;
      } else if (qLower.includes('month') || qLower.includes('மாதம்')) {
        formattedOutput = `The current month is **${monthName}**.`;
      } else {
        formattedOutput = `Today's date in **${targetTz}** is **${currentDateStr}** (Time: ${currentTimeStr}).`;
      }

      return {
        success: true,
        tool: 'TimeDateEngine',
        data: {
          type: 'TIME_DATE',
          query,
          timezone: targetTz,
          currentDate: currentDateStr,
          currentTime: currentTimeStr,
          dayOfWeek,
          monthName,
          currentYear,
          formatted: formattedOutput,
          timestamp: now.toISOString()
        },
        metadata: { latencyMs: Date.now() - startTime, verified: true }
      };
    } catch (err) {
      return {
        success: false,
        tool: 'TimeDateEngine',
        data: null,
        error: { code: 'TIMEDATE_EXECUTION_ERROR', message: err.message },
        metadata: { latencyMs: Date.now() - startTime }
      };
    }
  }
};

module.exports = timeDateTool;
