export enum ExpenseCategory {
    RENT = 'Rent',
    CELLPHONE = 'Cellphone',
    SUBSCRIPTIONS = 'Subscriptions',
    PHARMACY = 'Pharmacy',
    PET = 'Pet',
    SUPERMARKET = 'Supermarket',
    PURCHASES = 'Purchases',
    FOOD = 'Food',
    HEALTH_INSURANCE = 'Health Insurance',
    TRANSPORTATION = 'Transportation',
    OTHER = 'Other',
}

export enum ExpenseType {
    PERCENTAGE = 'Percentage',
    SHARED = 'Shared',
    KARI = 'Kari',
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
  