import React, { useState, useEffect, useCallback } from 'react';
import type { Business, Job, OtherIncome, Expense } from './types';
import InitialSetup from './components/InitialSetup';
import Dashboard from './components/Dashboard';
import BusinessDetail from './components/BusinessDetail';

const App: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedBusinesses = localStorage.getItem('businesses');
      if (savedBusinesses) {
        const parsedBusinesses: Business[] = JSON.parse(savedBusinesses);
        // Ensure backward compatibility for older data structures
        const compatibleBusinesses = parsedBusinesses.map(b => ({
            ...b,
            jobs: b.jobs.map(j => ({ ...j, completed: j.completed || false, description: j.description || '', notes: j.notes || '' })),
            otherIncomes: b.otherIncomes || [],
            otherExpenses: b.otherExpenses || [],
        }));
        setBusinesses(compatibleBusinesses);
      }
    } catch (error) {
      console.error("Failed to load businesses from localStorage", error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if(isLoaded) {
      try {
        localStorage.setItem('businesses', JSON.stringify(businesses));
      } catch (error) {
        console.error("Failed to save businesses to localStorage", error);
      }
    }
  }, [businesses, isLoaded]);
  
  const handleAddBusiness = useCallback((name: string) => {
    const newBusiness: Business = {
      id: Date.now().toString(),
      name,
      jobs: [],
      otherIncomes: [],
      otherExpenses: [],
    };
    setBusinesses(prev => [...prev, newBusiness]);
  }, []);

  const handleDeleteBusiness = useCallback((id: string) => {
    setBusinesses(prev => prev.filter(business => business.id !== id));
  }, []);

  const handleRenameBusiness = useCallback((id: string, newName: string) => {
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b));
  }, []);

  const handleSelectBusiness = useCallback((id: string) => {
    setSelectedBusinessId(id);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setSelectedBusinessId(null);
  }, []);

  // Job Handlers
  const handleAddJob = useCallback((businessId: string, job: Omit<Job, 'id' | 'completed'>) => {
    const newJob: Job = { ...job, id: Date.now().toString(), completed: false };
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId ? { ...b, jobs: [...b.jobs, newJob] } : b
      )
    );
  }, []);

   const handleEditJob = useCallback((businessId: string, updatedJob: Job) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? { ...b, jobs: b.jobs.map(j => j.id === updatedJob.id ? updatedJob : j) }
          : b
      )
    );
  }, []);

  const handleDeleteJob = useCallback((businessId: string, jobId: string) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? { ...b, jobs: b.jobs.filter(j => j.id !== jobId) }
          : b
      )
    );
  }, []);
  
  const handleToggleJobStatus = useCallback((businessId: string, jobId: string) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? { ...b, jobs: b.jobs.map(j => j.id === jobId ? { ...j, completed: !j.completed } : j) }
          : b
      )
    );
  }, []);

  // Other Income Handlers
  const handleAddOtherIncome = useCallback((businessId: string, income: Omit<OtherIncome, 'id'>) => {
    const newIncome: OtherIncome = { ...income, id: Date.now().toString() };
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId ? { ...b, otherIncomes: [...b.otherIncomes, newIncome] } : b
      )
    );
  }, []);

  const handleEditOtherIncome = useCallback((businessId: string, updatedIncome: OtherIncome) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? { ...b, otherIncomes: b.otherIncomes.map(i => i.id === updatedIncome.id ? updatedIncome : i) }
          : b
      )
    );
  }, []);

  const handleDeleteOtherIncome = useCallback((businessId: string, incomeId: string) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? { ...b, otherIncomes: b.otherIncomes.filter(i => i.id !== incomeId) }
          : b
      )
    );
  }, []);

  // Other Expense Handlers
  const handleAddOtherExpense = useCallback((businessId: string, expense: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...expense, id: Date.now().toString() };
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId ? { ...b, otherExpenses: [...b.otherExpenses, newExpense] } : b
      )
    );
  }, []);

  const handleEditOtherExpense = useCallback((businessId: string, updatedExpense: Expense) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? { ...b, otherExpenses: b.otherExpenses.map(e => e.id === updatedExpense.id ? updatedExpense : e) }
          : b
      )
    );
  }, []);

  const handleDeleteOtherExpense = useCallback((businessId: string, expenseId: string) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? { ...b, otherExpenses: b.otherExpenses.filter(e => e.id !== expenseId) }
          : b
      )
    );
  }, []);


  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Memuat data...</div>;
  }

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  if (selectedBusiness) {
    return (
      <BusinessDetail
        business={selectedBusiness}
        onBack={handleBackToDashboard}
        onAddJob={handleAddJob}
        onEditJob={handleEditJob}
        onDeleteJob={handleDeleteJob}
        onToggleJobStatus={handleToggleJobStatus}
        onAddOtherIncome={handleAddOtherIncome}
        onEditOtherIncome={handleEditOtherIncome}
        onDeleteOtherIncome={handleDeleteOtherIncome}
        onAddOtherExpense={handleAddOtherExpense}
        onEditOtherExpense={handleEditOtherExpense}
        onDeleteOtherExpense={handleDeleteOtherExpense}
      />
    );
  }

  if (businesses.length === 0) {
    return <InitialSetup onCreateBusiness={handleAddBusiness} />;
  }

  return <Dashboard 
    businesses={businesses} 
    onSelectBusiness={handleSelectBusiness}
    onAddBusiness={handleAddBusiness}
    onDeleteBusiness={handleDeleteBusiness}
    onRenameBusiness={handleRenameBusiness}
  />;
};

export default App;