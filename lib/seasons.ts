/**
 * Season system — deterministic date math, no DB calls.
 * Season 0 = February 2026. Each subsequent month is +1.
 * seasonNumber = (year - 2026) * 12 + (month - 2)
 *   where month is 0-indexed (January = 0, February = 1)
 */

const SEASON_EPOCH_YEAR = 2026;
const SEASON_EPOCH_MONTH = 1; // 0-indexed: February = 1

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface SeasonInfo {
  number: number;
  startDate: Date; // inclusive (1st of month 00:00 UTC)
  endDate: Date; // exclusive (1st of next month 00:00 UTC)
  name: string;
}

/**
 * Get the current season based on UTC date.
 */
export function getCurrentSeason(now: Date = new Date()): SeasonInfo {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed
  const seasonNumber =
    (year - SEASON_EPOCH_YEAR) * 12 + (month - SEASON_EPOCH_MONTH);
  return getSeasonByNumber(seasonNumber);
}

/**
 * Get season info for a specific season number.
 */
export function getSeasonByNumber(seasonNumber: number): SeasonInfo {
  const totalMonths = SEASON_EPOCH_MONTH + seasonNumber;
  const year = SEASON_EPOCH_YEAR + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12; // handle negative seasons

  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  return {
    number: seasonNumber,
    startDate,
    endDate,
    name: `Season ${seasonNumber} · ${MONTH_NAMES[month]} ${year}`,
  };
}

/**
 * Get the season number for a given date.
 */
export function getSeasonForDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return (year - SEASON_EPOCH_YEAR) * 12 + (month - SEASON_EPOCH_MONTH);
}
