export interface Job {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  date: string; // YYYY-MM-DD
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