export type JobCategory = 'work' | 'task';

export interface Job {
  id: string;
  title:string;
  category: JobCategory;
  description?: string;
  notes?: string;
  date: string; // YYYY-MM-DD (Start date for recurring jobs)
  deadline?: string; // YYYY-MM-DDTHH:mm
  grossIncome: number;
  expenses: number;
  completed: boolean; // For non-recurring jobs
  isRecurring?: boolean;
  completions?: Record<string, boolean>; // For recurring jobs, e.g., { '2023-10-27': true }
  exceptions?: string[]; // For recurring jobs, dates to skip, e.g., ['2023-11-03']
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