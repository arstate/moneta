export type JobCategory = 'work' | 'task';

export interface Job {
  id: string;
  title:string;
  category: JobCategory;
  description?: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  deadline?: string; // YYYY-MM-DDTHH:mm
  grossIncome: number;
  expenses: number;
  completed: boolean;
}

export interface OtherIncome {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface Expense {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface Business {
  id: string;
  name: string;
  jobs: Job[];
  otherIncomes: OtherIncome[];
  otherExpenses: Expense[];
}