import { SavingType, SavingUser } from '../interfaces';

export const SAVING_TYPE_LABELS: Record<SavingType, string> = {
  [SavingType.CASH]: 'Cash',
  [SavingType.OCEAN_BANK]: 'Ocean Bank',
  [SavingType.WISE]: 'Wise',
  [SavingType.FACEBANK]: 'Facebank',
  [SavingType.SABADELL]: 'Sabadell',
  [SavingType.N26]: 'N26',
};

export const SAVING_USER_LABELS: Record<SavingUser, string> = {
  [SavingUser.ADOLFO]: 'Adolfo',
  [SavingUser.KARI]: 'Kari',
};
