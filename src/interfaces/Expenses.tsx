export enum ExpenseCategory {
  CELLPHONE = 'cellphone',
  FOOD = 'food',
  HEALTH_INSURANCE = 'health insurance',
  PET = 'pet',
  PHARMACY = 'pharmacy',
  PURCHASES = 'purchases',
  RENT = 'rent',
  SUBSCRIPTIONS = 'subscriptions',
  SUPERMARKET = 'supermarket',
  TRANSPORTATION = 'transportation',
  OTHER = 'other',
}

export enum ExpenseType {
  PERCENTAGE = 'percentage',
  SHARED = 'shared',
  KARI = 'kari',
}

export interface Expense {
  id: number;
  created_at: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  type: ExpenseType;
  isPaidByKari: boolean;
  is_default: boolean;
}

export interface TotalExpenses {
  total: number;
  adolfo: number;
  kari: number;
}
