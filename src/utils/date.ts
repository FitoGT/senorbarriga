import dayjs, { Dayjs } from 'dayjs';

export const DATE_DISPLAY_FORMAT = 'YYYY-MM-DD';
export const TIME_DISPLAY_FORMAT = 'HH:mm';

export type DateLike = string | number | Date | Dayjs | null | undefined;

const toDayjs = (value: DateLike): Dayjs | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (dayjs.isDayjs(value)) {
    return value;
  }

  if (value instanceof Date || typeof value === 'number') {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }

  if (typeof value === 'string') {
    const strictParsed = dayjs(value, DATE_DISPLAY_FORMAT, true);
    if (strictParsed.isValid()) {
      return strictParsed;
    }

    const fallback = dayjs(value);
    return fallback.isValid() ? fallback : null;
  }

  return null;
};

export const formatDate = (value: DateLike, format: string = DATE_DISPLAY_FORMAT): string => {
  const parsed = toDayjs(value);
  return parsed ? parsed.format(format) : '';
};

export const formatTime = (value: DateLike, format: string = TIME_DISPLAY_FORMAT): string => {
  const parsed = toDayjs(value);
  return parsed ? parsed.format(format) : '';
};

export const parseForDateInput = (value: DateLike): Dayjs | null => toDayjs(value);

export const isValidDateString = (value: string, format: string = DATE_DISPLAY_FORMAT): boolean =>
  Boolean(value) && dayjs(value, format, true).isValid();

export const today = (): string => dayjs().format(DATE_DISPLAY_FORMAT);

export const getDateKey = (value: DateLike): { key: string; timestamp: number } => {
  const parsed = toDayjs(value);
  if (!parsed) {
    const key = typeof value === 'string' ? value : '';
    return {
      key,
      timestamp: 0,
    };
  }

  return {
    key: parsed.format(DATE_DISPLAY_FORMAT),
    timestamp: parsed.valueOf(),
  };
};

export const formatDateWithFallback = (value: DateLike, fallback = ''): string => {
  const formatted = formatDate(value);
  return formatted || fallback;
};

export const formatTimeWithFallback = (value: DateLike, fallback = ''): string => {
  const formatted = formatTime(value);
  return formatted || fallback;
};

export const dateUtils = {
  formatDate,
  formatDateWithFallback,
  formatTime,
  formatTimeWithFallback,
  isValidDateString,
  parseForDateInput,
  today,
  getDateKey,
};
