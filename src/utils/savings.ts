import { Currencies, Saving, SavingUser } from '../interfaces';
import { CurrencyRateMap, convertToEuro } from './currency';
import { roundToDecimals } from './number';
import { getDateKey } from './date';

export type SavingsGroup = {
  dateKey: string;
  timestamp: number;
  savings: Saving[];
};

export type SavingsSummary = {
  kari: number;
  adolfo: number;
  total: number;
  kariPercentage: number;
  adolfoPercentage: number;
};

export const groupSavingsByDate = (savings: Saving[]): SavingsGroup[] => {
  if (!savings.length) {
    return [];
  }

  const groups = new Map<string, SavingsGroup>();

  for (const saving of savings) {
    const { key, timestamp } = getDateKey(saving.created_at ?? '');
    const existing = groups.get(key);

    if (existing) {
      existing.savings.push(saving);
      existing.timestamp = Math.max(existing.timestamp, timestamp);
    } else {
      groups.set(key, {
        dateKey: key,
        timestamp,
        savings: [saving],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
};

export const getLatestSavingsGroup = (groups: SavingsGroup[]): SavingsGroup | null =>
  groups.length ? groups[0] : null;

export const calculateSavingsSummary = (savings: Saving[], rates: CurrencyRateMap): SavingsSummary => {
  if (!savings.length) {
    return {
      kari: 0,
      adolfo: 0,
      total: 0,
      kariPercentage: 0,
      adolfoPercentage: 0,
    };
  }

  let kariTotal = 0;
  let adolfoTotal = 0;

  for (const saving of savings) {
    if (!saving.user) {
      continue;
    }

    const amount = typeof saving.amount === 'number' ? saving.amount : Number(saving.amount ?? 0);
    const amountInEUR = convertToEuro(amount, saving.currency ?? Currencies.EUR, rates);

    if (saving.user === SavingUser.KARI) {
      kariTotal += amountInEUR;
    }

    if (saving.user === SavingUser.ADOLFO) {
      adolfoTotal += amountInEUR;
    }
  }

  const total = kariTotal + adolfoTotal;

  return {
    kari: roundToDecimals(kariTotal),
    adolfo: roundToDecimals(adolfoTotal),
    total: roundToDecimals(total),
    kariPercentage: total ? roundToDecimals((kariTotal / total) * 100) : 0,
    adolfoPercentage: total ? roundToDecimals((adolfoTotal / total) * 100) : 0,
  };
};
