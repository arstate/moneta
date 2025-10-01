
import React, { useState, useEffect, useCallback } from 'react';
import type { Business, Job, OtherIncome, Expense } from './types';
import InitialSetup from './components/InitialSetup';
import Dashboard from './components/Dashboard';
import BusinessDetail from './components/BusinessDetail';
import Login from './components/Login';
import { auth, db } from './firebaseConfig';
import firebase from 'firebase/compat/app';

const firebaseObjectToArray = (data: any) => {
    if (!data) return [];
    return Object.keys(data).map(key => ({
        ...data[key],
        id: key,
        jobs: data[key].jobs ? Object.values(data[key].jobs) : [],
        otherIncomes: data[key].otherIncomes ? Object.values(data[key].otherIncomes) : [],
        otherExpenses: data[key].otherExpenses ? Object.values(data[key].otherExpenses) : [],
    }));
};

const guestUser = {
  uid: 'guest',
  displayName: 'Pengguna Tamu',
  email: 'guest@example.com',
};

const App: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setIsGuestMode(false);
      }
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isGuestMode) {
      const storedBusinesses = localStorage.getItem('guest_businesses');
      if (storedBusinesses) {
        setBusinesses(JSON.parse(storedBusinesses));
      } else {
        setBusinesses([]);
      }
      return;
    }

    if (!currentUser) {
      setBusinesses([]);
      return;
    }

    const businessesRef = db.ref(`users/${currentUser.uid}/businesses`);
    const listener = businessesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const businessesArray = firebaseObjectToArray(data);
        const compatibleBusinesses = businessesArray.map(b => ({
            ...b,
            jobs: (b.jobs || []).map(j => ({ ...j, completed: j.completed || false, description: j.description || '', notes: j.notes || '' })),
            otherIncomes: b.otherIncomes || [],
            otherExpenses: b.otherExpenses || [],
        }));
        setBusinesses(compatibleBusinesses);
    });
    
    return () => businessesRef.off('value', listener);
  }, [currentUser, isGuestMode]);
  
  useEffect(() => {
    if (isGuestMode) {
        localStorage.setItem('guest_businesses', JSON.stringify(businesses));
    }
  }, [businesses, isGuestMode]);

  const handleGuestLogin = () => {
    setIsGuestMode(true);
    setCurrentUser(guestUser as firebase.User);
  };

  const handleAddBusiness = useCallback((name: string) => {
    if (isGuestMode) {
      const newBusiness = { id: `guest_${Date.now()}`, name, jobs: [], otherIncomes: [], otherExpenses: [] };
      setBusinesses(prev => [...prev, newBusiness]);
      return;
    }
    if (!currentUser) return;
    const businessesRef = db.ref(`users/${currentUser.uid}/businesses`);
    const newBusinessRef = businessesRef.push();
    newBusinessRef.set({ id: newBusinessRef.key, name, jobs: {}, otherIncomes: {}, otherExpenses: {} });
  }, [currentUser, isGuestMode]);

  const handleDeleteBusiness = useCallback((id: string) => {
    if (isGuestMode) {
      setBusinesses(prev => prev.filter(b => b.id !== id));
      return;
    }
    if (!currentUser) return;
    const businessRef = db.ref(`users/${currentUser.uid}/businesses/${id}`);
    businessRef.remove();
  }, [currentUser, isGuestMode]);

  const handleRenameBusiness = useCallback((id: string, newName: string) => {
    if (isGuestMode) {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b));
      return;
    }
    if (!currentUser) return;
    const businessRef = db.ref(`users/${currentUser.uid}/businesses/${id}`);
    businessRef.update({ name: newName });
  }, [currentUser, isGuestMode]);

  const handleSelectBusiness = useCallback((id: string) => { setSelectedBusinessId(id); }, []);
  const handleBackToDashboard = useCallback(() => { setSelectedBusinessId(null); }, []);

  const handleAddJob = useCallback((businessId: string, job: Omit<Job, 'id' | 'completed'>) => {
    const newJob = { ...job, id: `guest_job_${Date.now()}`, completed: false };
    if (isGuestMode) {
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, jobs: [...b.jobs, newJob] } : b));
      return;
    }
    if (!currentUser) return;
    const jobsRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/jobs`);
    const newJobRef = jobsRef.push();
    newJobRef.set({ ...job, id: newJobRef.key, completed: false });
  }, [currentUser, isGuestMode]);

  const handleEditJob = useCallback((businessId: string, updatedJob: Job) => {
    if (isGuestMode) {
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, jobs: b.jobs.map(j => j.id === updatedJob.id ? updatedJob : j) } : b));
      return;
    }
    if (!currentUser) return;
    const { id, ...jobData } = updatedJob;
    const jobRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/jobs/${id}`);
    jobRef.update(jobData);
  }, [currentUser, isGuestMode]);

  const handleDeleteJob = useCallback((businessId: string, jobId: string) => {
    if (isGuestMode) {
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, jobs: b.jobs.filter(j => j.id !== jobId) } : b));
      return;
    }
    if (!currentUser) return;
    const jobRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/jobs/${jobId}`);
    jobRef.remove();
  }, [currentUser, isGuestMode]);
  
  const handleToggleJobStatus = useCallback((businessId: string, jobId: string) => {
    if (isGuestMode) {
      setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, jobs: b.jobs.map(j => j.id === jobId ? { ...j, completed: !j.completed } : j) } : b));
      return;
    }
    if (!currentUser) return;
    const job = businesses.find(b => b.id === businessId)?.jobs.find(j => j.id === jobId);
    if (job) {
      const jobRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/jobs/${jobId}`);
      jobRef.update({ completed: !job.completed });
    }
  }, [currentUser, businesses, isGuestMode]);

  const handleAddOtherIncome = useCallback((businessId: string, income: Omit<OtherIncome, 'id'>) => {
    const newIncome = { ...income, id: `guest_income_${Date.now()}` };
    if(isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, otherIncomes: [...b.otherIncomes, newIncome] } : b));
        return;
    }
    if(!currentUser) return;
    const incomesRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/otherIncomes`);
    const newIncomeRef = incomesRef.push();
    newIncomeRef.set({ ...income, id: newIncomeRef.key });
  }, [currentUser, isGuestMode]);

  const handleEditOtherIncome = useCallback((businessId: string, updatedIncome: OtherIncome) => {
    if(isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, otherIncomes: b.otherIncomes.map(i => i.id === updatedIncome.id ? updatedIncome : i) } : b));
        return;
    }
    if(!currentUser) return;
    const { id, ...incomeData } = updatedIncome;
    const incomeRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/otherIncomes/${id}`);
    incomeRef.update(incomeData);
  }, [currentUser, isGuestMode]);

  const handleDeleteOtherIncome = useCallback((businessId: string, incomeId: string) => {
    if(isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, otherIncomes: b.otherIncomes.filter(i => i.id !== incomeId) } : b));
        return;
    }
    if(!currentUser) return;
    const incomeRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/otherIncomes/${incomeId}`);
    incomeRef.remove();
  }, [currentUser, isGuestMode]);

  const handleAddOtherExpense = useCallback((businessId: string, expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: `guest_expense_${Date.now()}` };
    if(isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, otherExpenses: [...b.otherExpenses, newExpense] } : b));
        return;
    }
    if(!currentUser) return;
    const expensesRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/otherExpenses`);
    const newExpenseRef = expensesRef.push();
    newExpenseRef.set({ ...expense, id: newExpenseRef.key });
  }, [currentUser, isGuestMode]);

  const handleEditOtherExpense = useCallback((businessId: string, updatedExpense: Expense) => {
    if(isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, otherExpenses: b.otherExpenses.map(e => e.id === updatedExpense.id ? updatedExpense : e) } : b));
        return;
    }
    if(!currentUser) return;
    const { id, ...expenseData } = updatedExpense;
    const expenseRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/otherExpenses/${id}`);
    expenseRef.update(expenseData);
  }, [currentUser, isGuestMode]);

  const handleDeleteOtherExpense = useCallback((businessId: string, expenseId: string) => {
    if(isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, otherExpenses: b.otherExpenses.filter(e => e.id !== expenseId) } : b));
        return;
    }
    if(!currentUser) return;
    const expenseRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/otherExpenses/${expenseId}`);
    expenseRef.remove();
  }, [currentUser, isGuestMode]);

  const handleSignOut = useCallback(() => {
    if (isGuestMode) {
        setIsGuestMode(false);
        setCurrentUser(null);
        setBusinesses([]);
        setSelectedBusinessId(null);
    } else {
        auth.signOut();
    }
  }, [isGuestMode]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-lg font-semibold text-primary-700">Memuat Aplikasi...</div>;
  }
  
  if (!currentUser) {
    return <Login onGuestLogin={handleGuestLogin} />;
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
    user={currentUser}
    businesses={businesses} 
    onSelectBusiness={handleSelectBusiness}
    onAddBusiness={handleAddBusiness}
    onDeleteBusiness={handleDeleteBusiness}
    onRenameBusiness={handleRenameBusiness}
    onSignOut={handleSignOut}
  />;
};

export default App;
