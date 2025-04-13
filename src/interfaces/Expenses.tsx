export enum ExpenseCategory {
  RENT = 'rent',
  CELLPHONE = 'cellphone',
  SUBSCRIPTIONS = 'subscriptions',
  PHARMACY = 'pharmacy',
  PET = 'pet',
  SUPERMARKET = 'supermarket',
  PURCHASES = 'purchases',
  FOOD = 'food',
  HEALTH_INSURANCE = 'health insurance',
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
}

export interface TotalExpenses {
  total: number;
  adolfo: number;
  kari: number;
}
