/* eslint-disable camelcase */
import { Currencies, Saving, SavingType, SavingUser } from '../interfaces';
import { supabaseService } from '../services/Supabase/SupabaseService';
import { calculateSavingsSummary, getLatestSavingsByAccount } from './savings';

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: jest.fn() }),
}));

const from = supabaseService.getClient().from as jest.Mock;

beforeEach(() => {
  from.mockReset();
});

test('normalizes stored currencies and account names before prefilling Kari accounts', async () => {
  const order = jest.fn().mockResolvedValue({
    data: [
      { id: 1, created_at: '2026-10-01T12:00:00Z', user: ' Kari ', type: 'Deel Card', amount: 120, currency: ' usd ' },
      { id: 2, created_at: '2026-10-01T12:00:00Z', user: 'Kari', type: 'Ocean Bank', amount: 300, currency: 'eur' },
    ],
    error: null,
  });
  from.mockReturnValue({ select: () => ({ order }) });

  const savings = await supabaseService.getAllSavings();
  const accounts = getLatestSavingsByAccount(savings);
  expect(accounts.get(`${SavingUser.KARI}-${SavingType.DEEL_CARD}`)).toMatchObject({ amount: 120, currency: 'USD' });
  expect(accounts.get(`${SavingUser.KARI}-${SavingType.OCEAN_BANK}`)).toMatchObject({ amount: 300, currency: 'EUR' });
  expect(calculateSavingsSummary(savings, { USD: 1.2, EUR: 1 }).kari).toBe(400);
});

test('retains the latest balance per account when the newest snapshot is incomplete', () => {
  const record = (id: number, date: string, type: SavingType, amount: number): Saving => ({
    id,
    created_at: `${date}T12:00:00Z`,
    user: SavingUser.KARI,
    type,
    amount,
    currency: Currencies.USD,
  });
  const savings = [
    record(1, '2026-10-01', SavingType.DEEL_CARD, 50),
    record(3, '2026-10-02', SavingType.CASH, 10),
    record(2, '2026-10-01', SavingType.OCEAN_BANK, 100),
    record(4, '2026-10-01', SavingType.DEEL_CARD, 0),
  ];
  const accounts = getLatestSavingsByAccount(savings);

  expect(accounts.get('kari-deel card')?.amount).toBe(0);
  expect(accounts.get('kari-ocean bank')?.amount).toBe(100);
  expect(accounts.get('kari-cash')?.amount).toBe(10);
  expect(savings.map((saving) => saving.id)).toEqual([1, 3, 2, 4]);
});

test('saves currencies in uppercase and surfaces rejected writes', async () => {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const query = {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    upsert,
  };
  from.mockReturnValue(query);
  const entry = {
    created_at: '2026-10-02T12:00:00Z',
    user: SavingUser.KARI,
    type: SavingType.DEEL_CARD,
    amount: 75,
    currency: 'usd' as Currencies,
  };

  await supabaseService.saveSavingsSnapshot([entry]);
  expect(upsert).toHaveBeenCalledWith([{ ...entry, currency: 'USD' }], { onConflict: 'id', defaultToNull: false });
  upsert.mockResolvedValue({ error: { message: 'Insert denied' } });
  await expect(supabaseService.saveSavingsSnapshot([entry])).rejects.toThrow('Insert denied');
});

test('surfaces failed reads instead of returning an empty form', async () => {
  from.mockReturnValue({
    select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'Read denied' } }) }),
  });
  await expect(supabaseService.getAllSavings()).rejects.toThrow('Read denied');
});

test('replaces same-day balances by ID and inserts missing accounts without deleting historical accounts', async () => {
  const query = {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: [
        { id: 10, user: 'Kari', type: 'Ocean Bank' },
        { id: 11, user: 'adolfo', type: 'facebank' },
      ],
      error: null,
    }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  };
  from.mockReturnValue(query);
  const entries = [
    {
      created_at: '2026-10-06T12:00:00Z',
      user: SavingUser.KARI,
      type: SavingType.OCEAN_BANK,
      amount: 500,
      currency: Currencies.USD,
    },
    {
      created_at: '2026-10-06T12:00:00Z',
      user: SavingUser.KARI,
      type: SavingType.DEEL_CARD,
      amount: 200,
      currency: Currencies.USD,
    },
  ];

  await supabaseService.saveSavingsSnapshot(entries);

  expect(query.gte).toHaveBeenCalledWith('created_at', '2026-10-06T00:00:00.000Z');
  expect(query.lt).toHaveBeenCalledWith('created_at', '2026-10-07T00:00:00.000Z');
  expect(query.upsert).toHaveBeenCalledWith([{ ...entries[0], id: 10 }, entries[1]], {
    onConflict: 'id',
    defaultToNull: false,
  });
});

test('does not write if reading the existing snapshot fails', async () => {
  const query = {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Read denied' } }),
    upsert: jest.fn(),
  };
  from.mockReturnValue(query);
  await expect(
    supabaseService.saveSavingsSnapshot([
      {
        created_at: '2026-10-06T12:00:00Z',
        user: SavingUser.KARI,
        type: SavingType.CASH,
        amount: 10,
        currency: Currencies.USD,
      },
    ]),
  ).rejects.toThrow('Read denied');
  expect(query.upsert).not.toHaveBeenCalled();
});
