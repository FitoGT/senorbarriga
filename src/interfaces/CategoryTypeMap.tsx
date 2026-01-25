import { ExpenseType } from './';

export const CategoryTypeMap = {
  cellphone: ExpenseType.SHARED,
  food: ExpenseType.SHARED,
  'health insurance': ExpenseType.SHARED,
  pet: ExpenseType.PERCENTAGE,
  pharmacy: ExpenseType.PERCENTAGE,
  purchases: ExpenseType.SHARED,
  rent: ExpenseType.PERCENTAGE,
  subscriptions: ExpenseType.PERCENTAGE,
  supermarket: ExpenseType.PERCENTAGE,
  transportation: ExpenseType.SHARED,
  other: ExpenseType.SHARED,
};
