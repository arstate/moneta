import React, { useState, useMemo, useEffect } from 'react';
import type { Business, Job, OtherIncome, Expense, JobCategory } from '../types';
import IncomeChart from './IncomeChart';
import { ChevronLeftIcon, PlusIcon, TrashIcon, CalendarDaysIcon, ChartBarIcon, PencilIcon, Bars3Icon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, PresentationChartLineIcon, HomeIcon, ChevronRightIcon } from './Icons';

// This function is timezone-safe and prevents off-by-one day errors.
const formatDateToYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

type JobOccurrence = Job & {
    occurrenceDate: string;
    isComplete: boolean;
    occurrenceId: string;
};

const generateJobOccurrencesForDate = (jobs: Job[], targetDate: string): JobOccurrence[] => {
    const occurrences: JobOccurrence[] = [];
    const target = new Date(`${targetDate}T00:00:00`);
    if (isNaN(target.getTime())) return [];
    const targetDayOfWeek = target.getDay();

    for (const job of jobs) {
        const jobStartDate = new Date(`${job.date}T00:00:00`);
        if (isNaN(jobStartDate.getTime())) continue;

        if (job.isRecurring) {
            if (target >= jobStartDate && targetDayOfWeek === jobStartDate.getDay()) {
                occurrences.push({
                    ...job,
                    occurrenceDate: targetDate,
                    isComplete: !!(job.completions && job.completions[targetDate]),
                    occurrenceId: `${job.id}-${targetDate}`,
                });
            }
        } else {
            if (job.date === targetDate) {
                occurrences.push({
                    ...job,
                    occurrenceDate: job.date,
                    isComplete: job.completed,
                    occurrenceId: job.id,
                });
            }
        }
    }
    return occurrences.sort((a, b) => a.title.localeCompare(b.title));
};


interface DeadlineCountdownProps {
  deadline: string;
}

const DeadlineCountdown: React.FC<DeadlineCountdownProps> = ({ deadline }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(deadline) - +new Date();
    let timeLeft: { days?: number, hours?: number, minutes?: number, seconds?: number } = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return { difference, timeLeft };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft().timeLeft);
  const [isOverdue, setIsOverdue] = useState(calculateTimeLeft().difference <= 0);
  
  useEffect(() => {
    if (isOverdue) return;

    const timer = setInterval(() => {
      const { difference, timeLeft: newTimeLeft } = calculateTimeLeft();
      if (difference > 0) {
        setTimeLeft(newTimeLeft);
      } else {
        setIsOverdue(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, isOverdue]);

  if (isOverdue) {
    return <span className="text-sm font-medium text-red-600 animate-pulse">Tenggat waktu terlewat</span>;
  }
  
  const timerComponents: string[] = [];
  
  if (timeLeft.days && timeLeft.days > 0) timerComponents.push(`${timeLeft.days}hri`);
  if (timeLeft.hours && timeLeft.hours > 0) timerComponents.push(`${timeLeft.hours}jm`);
  if (timeLeft.minutes && timeLeft.minutes > 0) timerComponents.push(`${timeLeft.minutes}mnt`);
  if(timeLeft.days === 0 && timeLeft.hours === 0) {
      if (timeLeft.seconds !== undefined) timerComponents.push(`${timeLeft.seconds}dtk`);
  }

  return (
    <div className="flex items-center gap-1">
        <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span className="text-xs font-medium text-gray-600">
            {timerComponents.join(' ')}
        </span>
    </div>
  );
};


interface BusinessDetailProps {
  business: Business;
  onBack: () => void;
  onAddJob: (businessId: string, job: Omit<Job, 'id' | 'completed'>) => void;
  onEditJob: (businessId: string, job: Job) => void;
  onDeleteJob: (businessId: string, jobId: string) => void;
  onToggleJobStatus: (businessId: string, jobId: string, occurrenceDate: string) => void;
  onAddOtherIncome: (businessId: string, income: Omit<OtherIncome, 'id'>) => void;
  onEditOtherIncome: (businessId: string, income: OtherIncome) => void;
  onDeleteOtherIncome: (businessId: string, incomeId: string) => void;
  onAddOtherExpense: (businessId: string, expense: Omit<Expense, 'id'>) => void;
  onEditOtherExpense: (businessId: string, expense: Expense) => void;
  onDeleteOtherExpense: (businessId: string, expenseId: string) => void;
}

type View = 'schedule' | 'report';
type ReportPeriod = 'daily' | 'monthly' | 'yearly';
type ChartType = 'bar' | 'line';

const BusinessDetail: React.FC<BusinessDetailProps> = ({ 
    business, onBack, onAddJob, onEditJob, onDeleteJob, onToggleJobStatus,
    onAddOtherIncome, onEditOtherIncome, onDeleteOtherIncome,
    onAddOtherExpense, onEditOtherExpense, onDeleteOtherExpense
}) => {
  const [view, setView] = useState<View>('schedule');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [startMonth, setStartMonth] = useState<string>('1');
  const [endMonth, setEndMonth] = useState<string>('12');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState(new Date()); // For calendar month/year
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // For filtering jobs


  // State for Job Modal
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [jobFormData, setJobFormData] = useState({ title: '', description: '', notes: '', date: '', deadline: '', grossIncome: '', expenses: '', category: 'work' as JobCategory, isRecurring: false });

  // State for Other Income Modal
  const [isOtherIncomeModalOpen, setIsOtherIncomeModalOpen] = useState(false);
  const [editingOtherIncome, setEditingOtherIncome] = useState<OtherIncome | null>(null);
  const [otherIncomeFormData, setOtherIncomeFormData] = useState({ title: '', date: '', amount: ''});

  // State for Other Expense Modal
  const [isOtherExpenseModalOpen, setIsOtherExpenseModalOpen] = useState(false);
  const [editingOtherExpense, setEditingOtherExpense] = useState<Expense | null>(null);
  const [otherExpenseFormData, setOtherExpenseFormData] = useState({ title: '', date: '', amount: ''});

  useEffect(() => {
    if (isJobModalOpen) {
      if (editingJob) {
        setJobFormData({
          title: editingJob.title,
          description: editingJob.description || '',
          notes: editingJob.notes || '',
          date: editingJob.date,
          deadline: editingJob.deadline ? editingJob.deadline.split('T')[1]?.substring(0, 5) : '',
          grossIncome: String(editingJob.grossIncome),
          expenses: String(editingJob.expenses),
          category: editingJob.category || 'work',
          isRecurring: editingJob.isRecurring || false,
        });
      } else {
        setJobFormData({ title: '', description: '', notes: '', date: '', deadline: '', grossIncome: '', expenses: '', category: 'work', isRecurring: false });
      }
    }
  }, [editingJob, isJobModalOpen]);

  useEffect(() => {
    if (isOtherIncomeModalOpen) {
      if (editingOtherIncome) {
        setOtherIncomeFormData({
            title: editingOtherIncome.title,
            date: editingOtherIncome.date,
            amount: String(editingOtherIncome.amount)
        });
      } else {
        setOtherIncomeFormData({ title: '', date: '', amount: '' });
      }
    }
  }, [editingOtherIncome, isOtherIncomeModalOpen]);

  useEffect(() => {
    if (isOtherExpenseModalOpen) {
        if (editingOtherExpense) {
            setOtherExpenseFormData({
                title: editingOtherExpense.title,
                date: editingOtherExpense.date,
                amount: String(editingOtherExpense.amount)
            });
        } else {
            setOtherExpenseFormData({ title: '', date: '', amount: '' });
        }
    }
  }, [editingOtherExpense, isOtherExpenseModalOpen]);


  const jobOccurrences = useMemo(() => {
    if (selectedDate) {
        return generateJobOccurrencesForDate(business.jobs, selectedDate);
    }
    // When no date is selected, we show a list of job "templates"
    const sorted = [...business.jobs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted.map(job => ({
        ...job,
        occurrenceDate: job.date,
        // For the main list, 'isComplete' is based on the non-recurring flag, 
        // or for recurring jobs, it's just false as it's a template.
        isComplete: job.isRecurring ? false : job.completed, 
        occurrenceId: job.id, 
    }));
  }, [business.jobs, selectedDate]);


  const sortedOtherIncomes = useMemo(() => {
    return [...business.otherIncomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [business.otherIncomes]);

  const sortedOtherExpenses = useMemo(() => {
    return [...business.otherExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [business.otherExpenses]);


  const handleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const jobData: Omit<Job, 'id' | 'completed'> = {
      title: jobFormData.title,
      description: jobFormData.description,
      notes: jobFormData.notes,
      date: jobFormData.date,
      deadline: jobFormData.date && jobFormData.deadline ? `${jobFormData.date}T${jobFormData.deadline}` : undefined,
      category: jobFormData.category,
      grossIncome: jobFormData.category === 'work' ? parseFloat(jobFormData.grossIncome) || 0 : 0,
      expenses: jobFormData.category === 'work' ? parseFloat(jobFormData.expenses) || 0 : 0,
      isRecurring: jobFormData.isRecurring,
    };

    if (editingJob) {
      onEditJob(business.id, { 
        ...editingJob, 
        ...jobData,
      });
    } else {
      onAddJob(business.id, { ...jobData, completions: jobData.isRecurring ? {} : undefined });
    }
    setIsJobModalOpen(false);
    setEditingJob(null);
  };

  const handleOtherIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeData = {
        title: otherIncomeFormData.title,
        date: otherIncomeFormData.date,
        amount: parseFloat(otherIncomeFormData.amount) || 0,
    };
    if(editingOtherIncome) {
        onEditOtherIncome(business.id, { ...incomeData, id: editingOtherIncome.id });
    } else {
        onAddOtherIncome(business.id, incomeData);
    }
    setIsOtherIncomeModalOpen(false);
    setEditingOtherIncome(null);
  }

  const handleOtherExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expenseData = {
      title: otherExpenseFormData.title,
      date: otherExpenseFormData.date,
      amount: parseFloat(otherExpenseFormData.amount) || 0,
    };
    if (editingOtherExpense) {
      onEditOtherExpense(business.id, { ...expenseData, id: editingOtherExpense.id });
    } else {
      onAddOtherExpense(business.id, expenseData);
    }
    setIsOtherExpenseModalOpen(false);
    setEditingOtherExpense(null);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const allDates = [
        ...business.jobs.map(j => j.date),
        ...business.otherIncomes.map(i => i.date),
        ...business.otherExpenses.map(e => e.date)
    ];
    allDates.forEach(dateStr => {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            years.add(date.getFullYear().toString());
        }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [business.jobs, business.otherIncomes, business.otherExpenses]);

  const incomeData = useMemo(() => {
    const dataMap = new Map<string, { gross: number; expenses: number }>();

    const processTransaction = (dateStr: string, gross: number, expenses: number) => {
        const itemDate = new Date(`${dateStr}T00:00:00`);
        if (isNaN(itemDate.getTime())) return;

        const yearMatch = filterYear === 'all' || itemDate.getFullYear().toString() === filterYear;
        const itemMonth = itemDate.getMonth() + 1;
        const startM = parseInt(startMonth);
        const endM = parseInt(endMonth);
        const monthMatch = itemMonth >= startM && itemMonth <= endM;

        if (yearMatch && monthMatch) {
            let key: string;
            if (reportPeriod === 'daily') key = dateStr;
            else if (reportPeriod === 'monthly') key = `${itemDate.getFullYear()}-${String(itemMonth).padStart(2, '0')}`;
            else key = `${itemDate.getFullYear()}`;
            
            const existing = dataMap.get(key) || { gross: 0, expenses: 0 };
            existing.gross += gross;
            existing.expenses += expenses;
            dataMap.set(key, existing);
        }
    };
    
    business.jobs.forEach(job => {
        if (job.isRecurring && job.completions) {
            Object.keys(job.completions).forEach(completionDate => {
                processTransaction(completionDate, job.grossIncome, job.expenses);
            });
        } else if (!job.isRecurring && job.completed) {
            processTransaction(job.date, job.grossIncome, job.expenses);
        }
    });

    business.otherIncomes.forEach(i => processTransaction(i.date, i.amount, 0));
    business.otherExpenses.forEach(e => processTransaction(e.date, 0, e.amount));
    
    return Array.from(dataMap.entries())
      .map(([name, data]) => ({
        name,
        "Pendapatan Kotor": data.gross,
        "Pendapatan Bersih": data.gross - data.expenses,
        "Pengeluaran": data.expenses
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

  }, [business, reportPeriod, startMonth, endMonth, filterYear]);

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(jobId)) {
            newSet.delete(jobId);
        } else {
            newSet.add(jobId);
        }
        return newSet;
    });
  };

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); 
    const grid = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      grid.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    const gridEndIndex = grid.length % 7;
    if (gridEndIndex !== 0) {
      for (let i = 1; i <= 7 - gridEndIndex; i++) {
        grid.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
      }
    }
    return { grid, monthName: firstDayOfMonth.toLocaleString('id-ID', { month: 'long' }), year, };
  }, [currentDate]);

  const jobCountsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    business.jobs.forEach(job => {
        if (!job.date) return;
        const startDate = new Date(`${job.date}T00:00:00`);
        if (isNaN(startDate.getTime())) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        if (job.isRecurring) {
            const dayOfWeek = startDate.getDay();
            let current = new Date(firstDay);
            while (current <= lastDay) {
                if (current.getDay() === dayOfWeek && current >= startDate) {
                    const dateYMD = formatDateToYMD(current);
                    counts.set(dateYMD, (counts.get(dateYMD) || 0) + 1);
                }
                current.setDate(current.getDate() + 1);
            }
        } else {
            const jobDate = new Date(`${job.date}T00:00:00`);
            if (jobDate.getFullYear() === year && jobDate.getMonth() === month) {
                counts.set(job.date, (counts.get(job.date) || 0) + 1);
            }
        }
    });
    return counts;
  }, [business.jobs, currentDate]);


  const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const upcoming: (Job & { occurrenceDate: string; deadline: string; })[] = [];
    const checkRangeDays = 60; // Check for occurrences in the next 60 days.

    business.jobs.forEach(job => {
        if (!job.deadline) return;

        const deadlineTime = job.deadline.split('T')[1];
        if (!deadlineTime) return;

        if (job.isRecurring) {
            const startDate = new Date(`${job.date}T00:00:00`);
            if (isNaN(startDate.getTime())) return;
            
            const jobDayOfWeek = startDate.getDay();
            
            let currentDate = new Date(now);
            currentDate.setHours(0, 0, 0, 0);

            for (let i = 0; i < checkRangeDays; i++) {
                if (currentDate >= startDate && currentDate.getDay() === jobDayOfWeek) {
                    const checkDateYMD = formatDateToYMD(currentDate);
                    const occurrenceDeadline = new Date(`${checkDateYMD}T${deadlineTime}`);

                    if (occurrenceDeadline > now) {
                        const isCompleted = job.completions && job.completions[checkDateYMD];
                        if (!isCompleted) {
                            upcoming.push({
                                ...job,
                                deadline: occurrenceDeadline.toISOString(),
                                occurrenceDate: checkDateYMD,
                            });
                        }
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            const jobDeadline = new Date(job.deadline);
            if (!job.completed && jobDeadline > now) {
                upcoming.push({
                    ...job,
                    occurrenceDate: job.date,
                    deadline: job.deadline, // Keep original
                });
            }
        }
    });

    return upcoming
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [business.jobs]);

  const months = [
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
    { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
  ];
  
  const handleStartMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStartMonth = e.target.value;
    setStartMonth(newStartMonth);
    if (parseInt(newStartMonth) > parseInt(endMonth)) {
        setEndMonth(newStartMonth);
    }
  };

  const handleEndMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEndMonth = e.target.value;
    setEndMonth(newEndMonth);
    if (parseInt(newEndMonth) < parseInt(startMonth)) {
        setStartMonth(newEndMonth);
    }
  };


  const NavLink: React.FC<{ isActive: boolean, onClick: () => void, children: React.ReactNode, title: string }> = ({ isActive, onClick, children, title }) => (
    <li>
      <button 
        onClick={() => {
          onClick();
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
        title={title}
      >
        {children}
      </button>
    </li>
  );
  
  const SidebarContent = () => (
    <>
        <div className={`px-4 pt-4 pb-4 flex items-center gap-3 border-b border-gray-700 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <button 
                onClick={() => { onBack(); setIsSidebarOpen(false); }} 
                className="p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white flex-shrink-0"
                aria-label="Kembali ke Dasbor"
                title="Kembali ke Dasbor"
            >
                <HomeIcon />
            </button>
            <h2 className={`text-xl font-bold tracking-tight text-white truncate transition-all duration-200 ease-in-out ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 delay-100'}`}>{business.name}</h2>
            <button onClick={() => setIsSidebarOpen(false)} className={`md:hidden p-1 text-gray-400 hover:text-white ml-auto ${isSidebarCollapsed ? 'hidden' : ''}`}>
                <XMarkIcon />
            </button>
        </div>

        <nav className="flex-grow mt-4 px-2">
            <ul className="space-y-2">
                <NavLink isActive={view === 'schedule'} onClick={() => setView('schedule')} title="Jadwal">
                    <CalendarDaysIcon />
                    <span className={`whitespace-nowrap transition-opacity ${isSidebarCollapsed ? 'hidden' : 'opacity-100 delay-100'}`}>Jadwal</span>
                </NavLink>
                <NavLink isActive={view === 'report'} onClick={() => setView('report')} title="Laporan Pendapatan">
                    <ChartBarIcon />
                    <span className={`whitespace-nowrap transition-opacity ${isSidebarCollapsed ? 'hidden' : 'opacity-100 delay-100'}`}>Laporan Pendapatan</span>
                </NavLink>
            </ul>
        </nav>
    </>
  );
  
  return (
    <div className="min-h-screen bg-primary-50">
      {isSidebarOpen && (
          <div 
              className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
          ></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 bg-gray-800 text-white transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="relative flex flex-col h-full">
            <SidebarContent />
            <div className="absolute top-1/2 -translate-y-1/2 -right-3.5 hidden md:block">
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-1 bg-gray-700 text-white rounded-full border-2 border-gray-800 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label={isSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
                >
                    {isSidebarCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                </button>
            </div>
        </div>
      </aside>

      <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="md:hidden flex items-center mb-4">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600">
                    <Bars3Icon />
                </button>
                <h1 className="ml-4 text-xl font-bold text-gray-800">{view === 'schedule' ? 'Jadwal' : 'Laporan Pendapatan'}</h1>
            </header>

            {view === 'schedule' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={() => { setEditingJob(null); setIsJobModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 font-semibold text-white rounded-lg shadow-sm bg-primary-600 hover:bg-primary-700">
                            <PlusIcon /> <span className="hidden sm:inline">Tambah Pekerjaan/Tugas</span><span className="sm:hidden">Baru</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="p-4 bg-white rounded-lg shadow lg:col-span-3">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={handlePrevMonth} className="p-2 text-primary-600 rounded-full hover:bg-primary-100">
                                <ChevronLeftIcon className="w-5 h-5 text-primary-600" />
                                </button>
                                <h3 className="text-lg font-semibold text-gray-800">{calendarData.monthName} {calendarData.year}</h3>
                                <button onClick={handleNextMonth} className="p-2 text-primary-600 rounded-full hover:bg-primary-100">
                                <ChevronRightIcon className="w-5 h-5 text-primary-600" />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 font-semibold">
                                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => <div key={day}>{day}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1 mt-2">
                                {calendarData.grid.map((dayInfo, index) => {
                                const dateYMD = formatDateToYMD(dayInfo.date);
                                const jobCount = dayInfo.isCurrentMonth ? (jobCountsByDate.get(dateYMD) || 0) : 0;
                                const isToday = dayInfo.isCurrentMonth && dateYMD === formatDateToYMD(new Date());
                                const isSelected = selectedDate === dateYMD;
                                return (
                                    <div key={index} className="flex justify-center">
                                    <button
                                        onClick={() => dayInfo.isCurrentMonth && setSelectedDate(isSelected ? null : dateYMD)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full text-sm relative transition-colors
                                        ${isSelected
                                            ? 'bg-primary-600 text-white font-bold'
                                            : !dayInfo.isCurrentMonth
                                            ? 'text-gray-300 cursor-default'
                                            : isToday
                                            ? 'font-bold text-orange-500 hover:bg-orange-100'
                                            : 'text-primary-700 hover:bg-primary-100'
                                        }`}
                                        disabled={!dayInfo.isCurrentMonth}
                                    >
                                        {dayInfo.day}
                                        {jobCount > 0 && (
                                            <span className={`absolute -bottom-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold text-white ${isSelected ? 'bg-orange-500' : 'bg-primary-500'} rounded-full border-2 border-white`}>
                                                {jobCount}
                                            </span>
                                        )}
                                    </button>
                                    </div>
                                );
                                })}
                            </div>
                        </div>
                        <div className="p-4 bg-white rounded-lg shadow lg:col-span-2 h-full">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tenggat Waktu Terdekat</h3>
                            {upcomingDeadlines.length > 0 ? (
                                <ul className="space-y-3">
                                {upcomingDeadlines.map(job => (
                                    <li key={`${job.id}-${job.occurrenceDate}`} className="p-3 bg-gray-50 rounded-lg">
                                        <p className="font-semibold text-gray-700 truncate">{job.title}</p>
                                        <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                                            <span>{new Date(job.deadline!).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            <DeadlineCountdown deadline={job.deadline!} />
                                        </div>
                                    </li>
                                ))}
                                </ul>
                            ) : (
                                <div className="flex items-center justify-center h-full -mt-8">
                                    <p className="text-sm text-gray-500 text-center py-8">Tidak ada tenggat waktu terdekat.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                             <h2 className="text-2xl font-bold text-gray-800">Daftar Jadwal</h2>
                            {selectedDate && (
                                <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-600">
                                    Menampilkan untuk: <span className="font-semibold text-primary-700">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </p>
                                <button onClick={() => setSelectedDate(null)} className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full hover:bg-red-200">
                                    <XMarkIcon className="w-3 h-3"/>
                                    <span>Hapus Filter</span>
                                </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {jobOccurrences.length > 0 ? jobOccurrences.map(job => {
                                const isExpanded = expandedJobIds.has(job.occurrenceId);
                                const isExpandable = !!job.description || !!job.notes;
                                const isCompleted = job.isComplete;
                                const today = formatDateToYMD(new Date());
                                const isFuture = job.occurrenceDate > today;
                                const isCheckboxDisabled = (selectedDate || job.isRecurring) ? isFuture : false;
                                
                                let occurrenceDeadline = job.deadline;
                                if (job.deadline && job.isRecurring) {
                                    const timePart = job.deadline.split('T')[1];
                                    if (timePart) {
                                        occurrenceDeadline = `${job.occurrenceDate}T${timePart}`;
                                    }
                                }

                                return (
                                    <div key={job.occurrenceId} className="grid grid-cols-1 md:grid-cols-6 items-start gap-4 p-4 bg-white rounded-lg shadow">
                                        <div className={`flex items-start gap-3 ${job.category === 'work' ? 'md:col-span-3' : 'md:col-span-5'}`}>
                                            <input 
                                                type="checkbox"
                                                checked={isCompleted}
                                                onChange={() => onToggleJobStatus(business.id, job.id, job.occurrenceDate)}
                                                disabled={isCheckboxDisabled}
                                                className={`h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1 flex-shrink-0 ${isCheckboxDisabled ? 'cursor-not-allowed bg-gray-200' : ''}`}
                                                title={isCheckboxDisabled ? 'Hanya dapat diselesaikan pada atau setelah tanggal jadwal' : ''}
                                            />
                                            <div className="flex-grow">
                                                <p className={`font-bold text-gray-800 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                                                    {job.category === 'task' && <span className="align-middle text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full mr-2">TUGAS</span>}
                                                    {job.isRecurring && <span className="align-middle text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full mr-2">MINGGUAN</span>}
                                                    {job.title}
                                                </p>
                                                
                                                {occurrenceDeadline && !isCompleted && (
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                        <span className="flex items-center bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                            <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {new Date(occurrenceDeadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <DeadlineCountdown deadline={occurrenceDeadline} />
                                                    </div>
                                                )}

                                                <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${isExpandable && !isExpanded ? 'max-h-20' : 'max-h-[1000px]'}`}>
                                                    {job.description && <p className={`text-sm text-gray-600 mt-1 whitespace-pre-wrap ${isCompleted ? 'line-through text-gray-400' : ''}`}>{job.description}</p>}
                                                    {job.notes && (
                                                        <div className={`mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md ${isCompleted ? 'opacity-60' : ''}`}>
                                                            <p className="text-xs font-semibold text-yellow-800">Catatan:</p>
                                                            <p className={`text-sm text-yellow-700 whitespace-pre-wrap ${isCompleted ? 'line-through' : ''}`}>{job.notes}</p>
                                                        </div>
                                                    )}
                                                    {isExpandable && !isExpanded && (
                                                        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-center mt-2">
                                                    <p className={`text-sm text-gray-500 ${isCompleted ? 'line-through text-gray-400' : ''}`}>{new Date(`${job.occurrenceDate}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                    
                                                    {isExpandable && (
                                                        <button onClick={() => toggleJobExpansion(job.occurrenceId)} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-semibold z-10">
                                                            <span>{isExpanded ? 'Sembunyikan' : 'Lihat Detail'}</span>
                                                            {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {job.category === 'work' && (
                                            <>
                                                <div className="pt-1">
                                                    <p className="text-sm text-gray-500">Pdt. Kotor</p>
                                                    <p className="font-semibold text-green-600">{formatCurrency(job.grossIncome)}</p>
                                                </div>
                                                <div className="pt-1">
                                                    <p className="text-sm text-gray-500">Pengeluaran</p>
                                                    <p className="font-semibold text-red-600">{formatCurrency(job.expenses)}</p>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex justify-end gap-2 pt-1 self-start">
                                            <button onClick={() => { setEditingJob(job); setIsJobModalOpen(true); }} className="p-2 text-gray-400 rounded-full hover:bg-blue-100 hover:text-blue-600">
                                                <PencilIcon />
                                            </button>
                                            <button onClick={() => onDeleteJob(business.id, job.id)} className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <div className="py-12 text-center text-gray-500 bg-white rounded-lg shadow">
                                    <p>{selectedDate ? 'Tidak ada pekerjaan pada tanggal ini.' : 'Belum ada pekerjaan atau tugas yang ditambahkan.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {view === 'report' && (
                 <div className="space-y-6">
                    <div className="p-4 bg-white rounded-lg shadow">
                        <div className="grid grid-cols-1 gap-4 items-center md:grid-cols-2">
                            <div className="flex flex-wrap items-center gap-4">
                               <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Dari:</label>
                                    <select value={startMonth} onChange={handleStartMonthChange} className="px-2 py-1 text-sm text-white bg-primary-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                        {months.map(month => <option key={month.value} value={month.value} className="text-black bg-white">{month.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Sampai:</label>
                                    <select value={endMonth} onChange={handleEndMonthChange} className="px-2 py-1 text-sm text-white bg-primary-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                        {months.map(month => <option key={month.value} value={month.value} className="text-black bg-white">{month.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="filter-year" className="text-sm font-medium text-gray-700">Tahun:</label>
                                    <select id="filter-year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-2 py-1 text-sm text-white bg-primary-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                        <option value="all" className="text-black bg-white">Semua Tahun</option>
                                        {availableYears.map(year => <option key={year} value={year} className="text-black bg-white">{year}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-start gap-4 md:justify-end">
                                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                                    <button onClick={() => setReportPeriod('daily')} className={`px-3 py-1 text-sm rounded-md transition-colors ${reportPeriod === 'daily' ? 'bg-white text-primary-600 shadow-sm font-semibold' : 'text-gray-500 hover:bg-gray-200'}`}>Harian</button>
                                    <button onClick={() => setReportPeriod('monthly')} className={`px-3 py-1 text-sm rounded-md transition-colors ${reportPeriod === 'monthly' ? 'bg-white text-primary-600 shadow-sm font-semibold' : 'text-gray-500 hover:bg-gray-200'}`}>Bulanan</button>
                                    <button onClick={() => setReportPeriod('yearly')} className={`px-3 py-1 text-sm rounded-md transition-colors ${reportPeriod === 'yearly' ? 'bg-white text-primary-600 shadow-sm font-semibold' : 'text-gray-500 hover:bg-gray-200'}`}>Tahunan</button>
                                </div>
                                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                                    <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} aria-label="Tampilkan diagram batang">
                                        <ChartBarIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setChartType('line')} className={`p-1.5 rounded-md transition-colors ${chartType === 'line' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} aria-label="Tampilkan diagram garis">
                                        <PresentationChartLineIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {incomeData.length > 0 ? (
                        <>
                            <IncomeChart data={incomeData} chartType={chartType} />
                             <div className="overflow-x-auto bg-white rounded-lg shadow">
                                <table className="min-w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-primary-800 uppercase bg-primary-100">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Periode</th>
                                            <th scope="col" className="px-6 py-3">Pdt. Kotor</th>
                                            <th scope="col" className="px-6 py-3">Pengeluaran</th>
                                            <th scope="col" className="px-6 py-3">Pdt. Bersih</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incomeData.map(data => (
                                            <tr key={data.name} className="bg-white border-b">
                                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{data.name}</th>
                                                <td className="px-6 py-4 text-green-600">{formatCurrency(data['Pendapatan Kotor'])}</td>
                                                <td className="px-6 py-4 text-red-600">{formatCurrency(data['Pengeluaran'])}</td>
                                                <td className="px-6 py-4 font-semibold text-blue-600">{formatCurrency(data['Pendapatan Bersih'])}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="py-12 text-center text-gray-500 bg-white rounded-lg shadow">
                            <p>Tidak ada data pendapatan untuk ditampilkan sesuai filter yang dipilih.</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="p-6 bg-white rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold">Pendapatan Lain-lain</h3>
                                <button onClick={() => {setEditingOtherIncome(null); setIsOtherIncomeModalOpen(true)}} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm bg-primary-600 hover:bg-primary-700">
                                    <PlusIcon className="w-4 h-4" /> Tambah
                                </button>
                            </div>
                            <div className="mt-4 space-y-3">
                            {sortedOtherIncomes.length > 0 ? sortedOtherIncomes.map(income => (
                                <div key={income.id} className="grid grid-cols-3 items-center gap-4 p-3 border rounded-lg">
                                        <div className="col-span-1">
                                            <p className="font-semibold text-gray-800 truncate">{income.title}</p>
                                            <p className="text-sm text-gray-500">{new Date(income.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <p className="font-semibold text-green-600">{formatCurrency(income.amount)}</p>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => {setEditingOtherIncome(income); setIsOtherIncomeModalOpen(true)}} className="p-2 text-gray-400 rounded-full hover:bg-blue-100 hover:text-blue-600">
                                                <PencilIcon />
                                            </button>
                                            <button onClick={() => onDeleteOtherIncome(business.id, income.id)} className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                </div>
                            )) : <p className="text-center text-gray-500">Belum ada pendapatan lain.</p>}
                            </div>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold">Pengeluaran Lain-lain</h3>
                                <button onClick={() => {setEditingOtherExpense(null); setIsOtherExpenseModalOpen(true)}} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm bg-red-600 hover:bg-red-700">
                                    <PlusIcon className="w-4 h-4" /> Tambah
                                </button>
                            </div>
                            <div className="mt-4 space-y-3">
                            {sortedOtherExpenses.length > 0 ? sortedOtherExpenses.map(expense => (
                                <div key={expense.id} className="grid grid-cols-3 items-center gap-4 p-3 border rounded-lg">
                                        <div className="col-span-1">
                                            <p className="font-semibold text-gray-800 truncate">{expense.title}</p>
                                            <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <p className="font-semibold text-red-600">{formatCurrency(expense.amount)}</p>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => {setEditingOtherExpense(expense); setIsOtherExpenseModalOpen(true)}} className="p-2 text-gray-400 rounded-full hover:bg-blue-100 hover:text-blue-600">
                                                <PencilIcon />
                                            </button>
                                            <button onClick={() => onDeleteOtherExpense(business.id, expense.id)} className="p-2 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                </div>
                            )) : <p className="text-center text-gray-500">Belum ada pengeluaran lain.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>

      {isJobModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-screen">
            <h2 className="text-xl font-bold text-gray-900">{editingJob ? 'Edit Pekerjaan/Tugas' : 'Tambah Pekerjaan/Tugas Baru'}</h2>
            <form onSubmit={handleJobSubmit} className="mt-4 space-y-4">
               <div>
                 <label htmlFor="job-category" className="block text-sm font-medium text-gray-700">Kategori</label>
                 <select
                     id="job-category"
                     value={jobFormData.category}
                     onChange={e => setJobFormData({...jobFormData, category: e.target.value as JobCategory})}
                     className="mt-1 block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                 >
                     <option value="work">Pekerjaan (Dengan Pendapatan)</option>
                     <option value="task">Tugas (Tanpa Pendapatan)</option>
                 </select>
               </div>

              <input type="text" placeholder={jobFormData.category === 'work' ? 'Nama Pekerjaan' : 'Nama Tugas'} value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              <textarea placeholder="Deskripsi (opsional)" value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" rows={3}></textarea>
              <textarea placeholder="Catatan Tambahan (opsional)" value={jobFormData.notes} onChange={e => setJobFormData({...jobFormData, notes: e.target.value})} className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" rows={2}></textarea>
              <div>
                <label htmlFor="job-date" className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                <input id="job-date" type="date" value={jobFormData.date} onChange={e => setJobFormData({...jobFormData, date: e.target.value})} required className="mt-1 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label htmlFor="job-deadline" className="block text-sm font-medium text-gray-700">Tenggat Waktu (Opsional)</label>
                <input id="job-deadline" type="time" value={jobFormData.deadline} onChange={e => setJobFormData({...jobFormData, deadline: e.target.value})} className="mt-1 w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                        id="job-recurring"
                        type="checkbox"
                        checked={jobFormData.isRecurring}
                        onChange={e => setJobFormData({ ...jobFormData, isRecurring: e.target.checked })}
                        className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="job-recurring" className="block text-sm font-medium text-gray-700">Ulangi setiap minggu</label>
                </div>
              
              {jobFormData.category === 'work' && (
                <>
                    <input type="number" placeholder="Pendapatan Kotor (Rp)" value={jobFormData.grossIncome} onChange={e => setJobFormData({...jobFormData, grossIncome: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    <input type="number" placeholder="Pengeluaran (Rp)" value={jobFormData.expenses} onChange={e => setJobFormData({...jobFormData, expenses: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                <button type="submit" className="px-4 py-2 font-semibold text-white rounded-lg bg-primary-600 hover:bg-primary-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOtherIncomeModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">{editingOtherIncome ? 'Edit Pendapatan' : 'Tambah Pendapatan Lain'}</h2>
            <form onSubmit={handleOtherIncomeSubmit} className="mt-4 space-y-4">
              <input type="text" placeholder="Sumber Pendapatan" value={otherIncomeFormData.title} onChange={e => setOtherIncomeFormData({...otherIncomeFormData, title: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              <input type="date" value={otherIncomeFormData.date} onChange={e => setOtherIncomeFormData({...otherIncomeFormData, date: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              <input type="number" placeholder="Jumlah (Rp)" value={otherIncomeFormData.amount} onChange={e => setOtherIncomeFormData({...otherIncomeFormData, amount: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsOtherIncomeModalOpen(false)} className="px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                <button type="submit" className="px-4 py-2 font-semibold text-white rounded-lg bg-primary-600 hover:bg-primary-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOtherExpenseModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">{editingOtherExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Lain'}</h2>
            <form onSubmit={handleOtherExpenseSubmit} className="mt-4 space-y-4">
              <input type="text" placeholder="Sumber Pengeluaran" value={otherExpenseFormData.title} onChange={e => setOtherExpenseFormData({...otherExpenseFormData, title: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-red-500 focus:border-red-500" />
              <input type="date" value={otherExpenseFormData.date} onChange={e => setOtherExpenseFormData({...otherExpenseFormData, date: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-red-500 focus:border-red-500" />
              <input type="number" placeholder="Jumlah (Rp)" value={otherExpenseFormData.amount} onChange={e => setOtherExpenseFormData({...otherExpenseFormData, amount: e.target.value})} required className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-red-500 focus:border-red-500" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsOtherExpenseModalOpen(false)} className="px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Batal</button>
                <button type="submit" className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDetail;