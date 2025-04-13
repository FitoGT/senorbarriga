export interface Debt {
  id: number;
  created_at: string;
  month: string;
  kari_debt: number;
  adolfo_debt: number;
}

export interface RequestDebtDto {
  month: string;
  kari_debt: number;
  adolfo_debt: number;
}
