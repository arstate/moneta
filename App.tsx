import React, { useState, useEffect, useCallback } from 'react';
import type { Business, Job, OtherIncome, Expense, Label } from './types';
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
        labels: data[key].labels ? Object.values(data[key].labels) : [],
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
  const [isCreatingFirstBusiness, setIsCreatingFirstBusiness] = useState(false);

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
            jobs: (b.jobs || []).map(j => ({ 
                ...j, 
                category: j.category || 'work',
                completed: j.completed || false, 
                description: j.description || '', 
                notes: j.notes || '',
                deadline: j.deadline || undefined,
                isRecurring: j.isRecurring || false,
                completions: j.completions || {},
                exceptions: j.exceptions || [],
                remindForDeadline: j.remindForDeadline || false,
                notificationEmail: j.notificationEmail || undefined,
                labelId: j.labelId || undefined,
            })),
            otherIncomes: b.otherIncomes || [],
            otherExpenses: b.otherExpenses || [],
            labels: b.labels || [],
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
    if (businesses.length === 0) {
        setIsCreatingFirstBusiness(true);
    }
    const newBusinessData = { name, jobs: [], otherIncomes: [], otherExpenses: [], labels: [] };
    if (isGuestMode) {
      const newBusiness = { ...newBusinessData, id: `guest_${Date.now()}` };
      setBusinesses(prev => [...prev, newBusiness]);
      return;
    }
    if (!currentUser) return;
    const businessesRef = db.ref(`users/${currentUser.uid}/businesses`);
    const newBusinessRef = businessesRef.push();
    newBusinessRef.set({ ...newBusinessData, id: newBusinessRef.key });
  }, [currentUser, isGuestMode, businesses]);

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

  const handleAddJob = useCallback((businessId: string, job: Omit<Job, 'id' | 'completed' | 'completions'>) => {
    let jobToSave: Omit<Job, 'id'>;

    if (job.isRecurring) {
        jobToSave = { ...job, completed: false, completions: {} };
    } else {
        jobToSave = { ...job, completed: false };
        delete (jobToSave as Partial<Job>).completions;
    }

    if (isGuestMode) {
        const newJobWithId = { ...jobToSave, id: `guest_job_${Date.now()}` } as Job;
        setBusinesses(prev => prev.map(b => 
            b.id === businessId 
                ? { ...b, jobs: [...b.jobs, newJobWithId] } 
                : b
        ));
        return;
    }
    if (!currentUser) return;
    const jobsRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/jobs`);
    const newJobRef = jobsRef.push();
    newJobRef.set({ ...jobToSave, id: newJobRef.key });
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
  
  const handleToggleJobStatus = useCallback((businessId: string, jobId: string, occurrenceDate: string) => {
    const business = businesses.find(b => b.id === businessId);
    const job = business?.jobs.find(j => j.id === jobId);
    if (!job) return;

    let updatedJob: Job;
    if (job.isRecurring) {
        const newCompletions = { ...(job.completions || {}) };
        if (newCompletions[occurrenceDate]) {
            delete newCompletions[occurrenceDate];
        } else {
            newCompletions[occurrenceDate] = true;
        }
        updatedJob = { ...job, completions: newCompletions };
    } else {
        updatedJob = { ...job, completed: !job.completed };
    }
    handleEditJob(businessId, updatedJob);
  }, [businesses, handleEditJob]);
  
  const handleDetachAndEditOccurrence = useCallback((businessId: string, originalJobId: string, occurrenceDate: string, newJobData: Omit<Job, 'id' | 'completed'>) => {
    if (isGuestMode) {
        setBusinesses(prevBusinesses => {
            const newBusinesses = JSON.parse(JSON.stringify(prevBusinesses));
            const business = newBusinesses.find((b: Business) => b.id === businessId);
            if (!business) return prevBusinesses;

            const originalJob = business.jobs.find((j: Job) => j.id === originalJobId);
            if (!originalJob) return prevBusinesses;

            originalJob.exceptions = [...(originalJob.exceptions || []), occurrenceDate];

            const newStandaloneJob = {
                ...newJobData,
                id: `guest_job_${Date.now()}`,
                completed: false,
            };
            business.jobs.push(newStandaloneJob);
            
            return newBusinesses;
        });
    } else {
        if (!currentUser) return;
        const business = businesses.find(b => b.id === businessId);
        const originalJob = business?.jobs.find(j => j.id === originalJobId);
        if (!originalJob) return;

        const updatedExceptions = [...(originalJob.exceptions || []), occurrenceDate];
        const originalJobRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/jobs/${originalJobId}`);
        originalJobRef.update({ exceptions: updatedExceptions });

        handleAddJob(businessId, newJobData);
    }
  }, [isGuestMode, currentUser, businesses, handleAddJob]);


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

  // --- LABEL MANAGEMENT ---
  const handleAddLabel = useCallback((businessId: string, label: Omit<Label, 'id'>) => {
    if (isGuestMode) {
        const newLabel = { ...label, id: `guest_label_${Date.now()}` };
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, labels: [...(b.labels || []), newLabel] } : b));
        return;
    }
    if (!currentUser) return;
    const labelsRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/labels`);
    const newLabelRef = labelsRef.push();
    newLabelRef.set({ ...label, id: newLabelRef.key });
  }, [currentUser, isGuestMode]);

  const handleEditLabel = useCallback((businessId: string, updatedLabel: Label) => {
    if (isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, labels: (b.labels || []).map(l => l.id === updatedLabel.id ? updatedLabel : l) } : b));
        return;
    }
    if (!currentUser) return;
    const { id, ...labelData } = updatedLabel;
    const labelRef = db.ref(`users/${currentUser.uid}/businesses/${businessId}/labels/${id}`);
    labelRef.update(labelData);
  }, [currentUser, isGuestMode]);

  const handleDeleteLabel = useCallback((businessId: string, labelId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;

    const updatedJobs = business.jobs.map(job => {
        if (job.labelId === labelId) {
            const { labelId: _, ...rest } = job;
            return rest as Job;
        }
        return job;
    });

    if (isGuestMode) {
        setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, jobs: updatedJobs, labels: (b.labels || []).filter(l => l.id !== labelId) } : b));
        return;
    }

    if (!currentUser) return;

    const updates: { [key: string]: any } = {};
    business.jobs.forEach(job => {
        if (job.labelId === labelId) {
            updates[`/users/${currentUser.uid}/businesses/${businessId}/jobs/${job.id}/labelId`] = null;
        }
    });
    updates[`/users/${currentUser.uid}/businesses/${businessId}/labels/${labelId}`] = null;
    db.ref().update(updates);
  }, [currentUser, isGuestMode, businesses]);


    // --- DEADLINE NOTIFICATION FEATURE ---
    const formatDateToYMD = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (!businesses || businesses.length === 0 || (!currentUser && !isGuestMode)) return;

        const checkDeadlinesAndNotify = () => {
            const now = new Date();
            const oneDay = 1000 * 60 * 60 * 24;

            businesses.forEach(business => {
                business.jobs?.forEach(job => {
                    if (!job.deadline || !job.remindForDeadline) return;

                    const checkAndSendNotification = (occurrenceDateStr: string, deadlineStr: string, isCompleted: boolean) => {
                        if (isCompleted) return;

                        const deadline = new Date(deadlineStr);
                        if (isNaN(deadline.getTime()) || deadline <= now) return;

                        const notificationId = `notified-${job.id}-${occurrenceDateStr}`;
                        if (localStorage.getItem(notificationId)) return;

                        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / oneDay);

                        if (daysUntilDeadline > 0 && daysUntilDeadline <= 3) {
                            // Browser Notification
                            if ('Notification' in window && Notification.permission === 'granted') {
                                const notification = new Notification('Tenggat Waktu Mendekat', {
                                    body: `"${job.title}" di usaha "${business.name}" akan berakhir dalam ${daysUntilDeadline} hari.`,
                                });
                                
                                notification.onclick = () => {
                                    window.focus();
                                    handleSelectBusiness(business.id);
                                };
                            }

                            // Email Notification
                            if (job.notificationEmail) {
                                fetch('/api/send-email', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        to: job.notificationEmail,
                                        subject: `Pengingat Tenggat Waktu: ${job.title}`,
                                        html: `<p>Halo,</p><p>Ini adalah pengingat bahwa tugas/pekerjaan Anda <strong>"${job.title}"</strong> untuk usaha <strong>"${business.name}"</strong> akan berakhir dalam <strong>${daysUntilDeadline} hari</strong>.</p><p>Tenggat waktu: ${new Date(deadline).toLocaleString('id-ID')}</p><p>Terima kasih.</p>`
                                    })
                                }).catch(err => console.error("Failed to send email notification:", err));
                            }
                            
                            localStorage.setItem(notificationId, 'true');
                        }
                    };

                    // Handle non-recurring jobs
                    if (!job.isRecurring) {
                        checkAndSendNotification(job.date, job.deadline, job.completed);
                    } 
                    // Handle recurring jobs
                    else {
                        const deadlineTime = job.deadline.split('T')[1];
                        if (!deadlineTime) return;

                        const startDate = new Date(`${job.date}T00:00:00`);
                        if (isNaN(startDate.getTime())) return;
                        const jobDayOfWeek = startDate.getDay();
                        
                        for (let i = 0; i <= 3; i++) {
                            const checkDate = new Date();
                            checkDate.setDate(now.getDate() + i);
                            checkDate.setHours(0, 0, 0, 0);

                            if (checkDate >= startDate && checkDate.getDay() === jobDayOfWeek) {
                                const occurrenceDateStr = formatDateToYMD(checkDate);
                                
                                const isException = job.exceptions?.includes(occurrenceDateStr);
                                const isCompleted = job.completions && job.completions[occurrenceDateStr];

                                if (!isException) {
                                    const occurrenceDeadlineStr = `${occurrenceDateStr}T${deadlineTime}`;
                                    checkAndSendNotification(occurrenceDateStr, occurrenceDeadlineStr, !!isCompleted);
                                }
                            }
                        }
                    }
                });
            });
        };

        const timerId = setTimeout(checkDeadlinesAndNotify, 2000); // Delay to prevent blocking render
        return () => clearTimeout(timerId);

    }, [businesses, currentUser, isGuestMode, handleSelectBusiness]);
    // --- END DEADLINE NOTIFICATION FEATURE ---

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
        onDetachAndEditOccurrence={handleDetachAndEditOccurrence}
        onAddLabel={handleAddLabel}
        onEditLabel={handleEditLabel}
        onDeleteLabel={handleDeleteLabel}
      />
    );
  }

  if (businesses.length === 0) {
    if (isCreatingFirstBusiness) {
        return <div className="flex items-center justify-center min-h-screen text-lg font-semibold text-primary-700">Membuat Usaha Anda...</div>;
    }
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