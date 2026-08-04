export interface Debt {
  id: number;
  created_at: string;
  month: string;
  month_key: string;
  kari_debt: number;
  adolfo_debt: number;
}

export interface RequestDebtDto {
  month: string;
  kari_debt: number;
  adolfo_debt: number;
}

export interface TotalDebt {
  kari: number;
  adolfo: number;
}

export interface DebtPayment {
  id: number;
  created_at: string;
  paid_at: string;
  payer: 'kari' | 'adolfo';
  recipient: 'kari' | 'adolfo';
  amount: number;
  note: string | null;
}
