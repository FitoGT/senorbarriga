import { Currencies } from './Currencies';

export enum SavingUser {
  KARI = 'kari',
  ADOLFO = 'adolfo',
}

export enum SavingType {
  CASH = 'cash',
  OCEAN_BANK = 'ocean bank',
  WISE = 'wise',
  FACEBANK = 'facebank',
  SABADELL = 'sabadell',
  N26 = 'n26',
}

export interface Saving {
  id: number;
  created_at: string;
  user: SavingUser;
  type: SavingType;
  amount: number;
  currency: Currencies;
}
