import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Transaction } from '../../types';
import {
  Wallet,
  Eye,
  EyeOff,
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  CreditCard,
  Plus,
  Minus,
  ShoppingBag,
  Briefcase,
  Gift,
  Calendar,
  PieChart,
  Trophy,
  Edit3,
  Trash2,
  Maximize2,
  X,
  Car,
  Tv,
  Home,
  HeartPulse,
  PiggyBank,
} from 'lucide-react';

type Period = 'Jour' | 'Semaine' | 'Mois' | 'Année';

const SHORT_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const DONUT_COLORS = [
  { stroke: '#10b981', dot: 'bg-emerald-500' },
  { stroke: '#f59e0b', dot: 'bg-amber-500' },
  { stroke: '#a855f7', dot: 'bg-purple-500' },
  { stroke: '#06b6d4', dot: 'bg-cyan-500' },
];

const DONUT_RADIUS = 35;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function parseTransactionDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // DD/MM/YYYY
  const frMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (frMatch) {
    const day = Number(frMatch[1]);
    const month = Number(frMatch[2]);
    const year = Number(frMatch[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return d;
    }
    return null;
  }

  // YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
  }
  return null;
}

function getMondayStart(d: Date): Date {
  const dayOffset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOffset, 12, 0, 0, 0);
}

function isDateInPeriod(txDate: Date | null, period: Period, ref: Date, offset = 0): boolean {
  if (!txDate) return false;

  if (period === 'Jour') {
    const target = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - offset, 12, 0, 0, 0);
    return (
      txDate.getFullYear() === target.getFullYear() &&
      txDate.getMonth() === target.getMonth() &&
      txDate.getDate() === target.getDate()
    );
  }

  if (period === 'Semaine') {
    const refMonday = getMondayStart(ref);
    const targetMonday = new Date(refMonday.getFullYear(), refMonday.getMonth(), refMonday.getDate() - offset * 7, 12, 0, 0, 0);
    const txMonday = getMondayStart(txDate);
    return txMonday.getTime() === targetMonday.getTime();
  }

  if (period === 'Mois') {
    const target = new Date(ref.getFullYear(), ref.getMonth() - offset, 1, 12, 0, 0, 0);
    return txDate.getFullYear() === target.getFullYear() && txDate.getMonth() === target.getMonth();
  }

  // Année
  return txDate.getFullYear() === ref.getFullYear() - offset;
}

function isRevenueTx(t: Transaction): boolean {
  return t.type === 'Revenu' || t.amount > 0;
}

function isExpenseTx(t: Transaction): boolean {
  return t.type === 'Dépense' || t.amount < 0;
}

function formatAxisAmount(value: number): string {
  if (value <= 0) return '0 Ar';
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M Ar`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k Ar`;
  }
  return `${Math.round(value)} Ar`;
}

function computeNiceMax(rawMax: number): number {
  const safeMax = Math.max(rawMax, 100_000);
  const magnitude = Math.pow(10, Math.floor(Math.log10(safeMax)));
  const normalized = safeMax / magnitude;
  let niceNormalized = 10;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 1.2) niceNormalized = 1.2;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 4) niceNormalized = 4;
  else if (normalized <= 5) niceNormalized = 5;
  else if (normalized <= 8) niceNormalized = 8;
  return niceNormalized * magnitude;
}

function computeDelta(current: number, previous: number): { label: string; isPositive: boolean; hasChange: boolean } {
  if (previous === 0 && current === 0) {
    return { label: '0%', isPositive: true, hasChange: false };
  }
  if (previous === 0 && current > 0) {
    return { label: '+100%', isPositive: true, hasChange: true };
  }
  const diffPct = Math.round(((current - previous) / previous) * 1000) / 10;
  return {
    label: `${diffPct > 0 ? '+' : ''}${diffPct}%`,
    isPositive: diffPct >= 0,
    hasChange: true,
  };
}

export const FinancesScreen: React.FC = () => {
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    currentBalance,
    balanceVisible,
    setBalanceVisible,
    financeSettings,
    updateFinanceSettings,
  } = useApp();

  const [period, setPeriod] = useState<Period>('Mois');
  const [txFilter, setTxFilter] = useState<'Toutes' | 'Revenus' | 'Dépenses'>('Toutes');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Modals & Interactive states
  const [showAddTxModal, setShowAddTxModal] = useState<null | 'Revenu' | 'Dépense'>(null);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Alimentation');
  const [txSource, setTxSource] = useState('Carte bancaire');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [hoveredBucketIdx, setHoveredBucketIdx] = useState<number | null>(null);

  // Budget & Savings Modals
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetError, setBudgetError] = useState('');

  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [savingsCurrentInput, setSavingsCurrentInput] = useState('');
  const [savingsTargetInput, setSavingsTargetInput] = useState('');
  const [savingsAdjustInput, setSavingsAdjustInput] = useState('');
  const [savingsError, setSavingsError] = useState('');

  // Determine anchor reference date: current year if transactions exist in current year, else latest tx date
  const referenceDate = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    const parsedDates = transactions
      .map(t => parseTransactionDate(t.date))
      .filter((d): d is Date => d !== null);

    if (parsedDates.length === 0) return today;
    const hasCurrentYearTx = parsedDates.some(d => d.getFullYear() === today.getFullYear());
    if (hasCurrentYearTx) return today;

    parsedDates.sort((a, b) => b.getTime() - a.getTime());
    return parsedDates[0];
  }, [transactions]);

  // Period transactions & metrics
  const periodTransactions = useMemo(() => {
    return transactions.filter(t => isDateInPeriod(parseTransactionDate(t.date), period, referenceDate, 0));
  }, [transactions, period, referenceDate]);

  const prevPeriodTransactions = useMemo(() => {
    return transactions.filter(t => isDateInPeriod(parseTransactionDate(t.date), period, referenceDate, 1));
  }, [transactions, period, referenceDate]);

  const periodRevenue = useMemo(
    () => periodTransactions.filter(isRevenueTx).reduce((acc, t) => acc + Math.abs(t.amount), 0),
    [periodTransactions]
  );

  const periodExpense = useMemo(
    () => periodTransactions.filter(isExpenseTx).reduce((acc, t) => acc + Math.abs(t.amount), 0),
    [periodTransactions]
  );

  const prevPeriodRevenue = useMemo(
    () => prevPeriodTransactions.filter(isRevenueTx).reduce((acc, t) => acc + Math.abs(t.amount), 0),
    [prevPeriodTransactions]
  );

  const prevPeriodExpense = useMemo(
    () => prevPeriodTransactions.filter(isExpenseTx).reduce((acc, t) => acc + Math.abs(t.amount), 0),
    [prevPeriodTransactions]
  );

  const revenueDelta = useMemo(() => computeDelta(periodRevenue, prevPeriodRevenue), [periodRevenue, prevPeriodRevenue]);
  const expenseDelta = useMemo(() => computeDelta(periodExpense, prevPeriodExpense), [periodExpense, prevPeriodExpense]);

  // Visible transaction history (period-filtered unless "Voir tout" is toggled)
  const filteredTransactions = useMemo(() => {
    const baseList = showAllTransactions ? transactions : periodTransactions;
    return baseList.filter(t => {
      if (txFilter === 'Revenus') return isRevenueTx(t);
      if (txFilter === 'Dépenses') return isExpenseTx(t);
      return true;
    });
  }, [showAllTransactions, transactions, periodTransactions, txFilter]);

  // Dynamic Monthly Budget (always based on expenses of the reference month)
  const monthlyBudgetSpent = useMemo(() => {
    return transactions
      .filter(t => isExpenseTx(t) && isDateInPeriod(parseTransactionDate(t.date), 'Mois', referenceDate, 0))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  }, [transactions, referenceDate]);

  const monthlyBudgetMax = financeSettings.monthlyBudgetMax;
  const budgetPct = monthlyBudgetMax > 0 ? Math.round((monthlyBudgetSpent / monthlyBudgetMax) * 100) : 0;
  const budgetBarWidth = monthlyBudgetMax > 0 ? Math.min(100, Math.max(0, budgetPct)) : 0;

  // Dynamic Savings Goal (persisted in SQLite)
  const savingsCurrent = financeSettings.savingsGoalCurrent;
  const savingsTarget = financeSettings.savingsGoalTarget;
  const savingsPct = savingsTarget > 0 ? Math.round((savingsCurrent / savingsTarget) * 100) : 0;
  const savingsBarWidth = Math.min(100, Math.max(0, savingsPct));

  // Dynamic Chart Buckets for active period
  const chartData = useMemo(() => {
    const xCoords = [60, 160, 260, 360, 460];
    const buckets: { label: string; fullLabel: string; revenue: number; expense: number }[] = [];

    for (let i = 4; i >= 0; i--) {
      let label = '';
      let fullLabel = '';

      if (period === 'Jour') {
        const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - i, 12, 0, 0, 0);
        label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        fullLabel = d.toLocaleDateString('fr-FR');
      } else if (period === 'Semaine') {
        const monday = getMondayStart(referenceDate);
        const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7, 12, 0, 0, 0);
        label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
        fullLabel = `Sem. du ${start.toLocaleDateString('fr-FR')}`;
      } else if (period === 'Mois') {
        const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1, 12, 0, 0, 0);
        label = SHORT_MONTHS[d.getMonth()];
        fullLabel = `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        const yr = referenceDate.getFullYear() - i;
        label = String(yr);
        fullLabel = `Année ${yr}`;
      }

      const matching = transactions.filter(t => isDateInPeriod(parseTransactionDate(t.date), period, referenceDate, i));
      const rev = matching.filter(isRevenueTx).reduce((acc, t) => acc + Math.abs(t.amount), 0);
      const exp = matching.filter(isExpenseTx).reduce((acc, t) => acc + Math.abs(t.amount), 0);

      buckets.push({ label, fullLabel, revenue: rev, expense: exp });
    }

    const rawMax = Math.max(...buckets.flatMap(b => [b.revenue, b.expense]), 0);
    const yMax = computeNiceMax(rawMax);
    const topY = 15;
    const bottomY = 190;
    const toY = (val: number) => bottomY - (Math.min(yMax, Math.max(0, val)) / yMax) * (bottomY - topY);

    const points = buckets.map((b, idx) => ({
      ...b,
      cx: xCoords[idx],
      revY: toY(b.revenue),
      expY: toY(b.expense),
    }));

    const revPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.cx} ${p.revY}`).join(' ');
    const expPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.cx} ${p.expY}`).join(' ');

    const yTicks = [1, 0.75, 0.5, 0.25, 0].map(ratio => ({
      label: formatAxisAmount(yMax * ratio),
      y: ratio === 0 ? 195 : Math.round(bottomY - ratio * (bottomY - topY)) + 4,
    }));

    return { points, revPath, expPath, yTicks };
  }, [transactions, period, referenceDate]);

  // Dynamic Expense Categories Breakdown (Donut)
  const expenseCategories = useMemo(() => {
    const expenses = periodTransactions.filter(isExpenseTx);
    const total = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    if (total <= 0) {
      return { total: 0, segments: [] as { name: string; amount: number; pct: number; color: typeof DONUT_COLORS[number]; dashArray: string; dashOffset: number }[] };
    }

    const byCat = new Map<string, number>();
    for (const tx of expenses) {
      const key = tx.category || 'Autre';
      byCat.set(key, (byCat.get(key) || 0) + Math.abs(tx.amount));
    }

    const sorted = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
    let grouped = sorted;
    if (sorted.length > 4) {
      const top3 = sorted.slice(0, 3);
      const othersSum = sorted.slice(3).reduce((acc, [, v]) => acc + v, 0);
      grouped = [...top3, ['Autres', othersSum]];
    }

    let offset = 0;
    const segments = grouped.map(([name, amount], idx) => {
      const fraction = amount / total;
      const pct = Math.round(fraction * 100);
      const arcLength = fraction * DONUT_CIRCUMFERENCE;
      const segment = {
        name,
        amount,
        pct,
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
        dashArray: `${arcLength} ${DONUT_CIRCUMFERENCE}`,
        dashOffset: -offset,
      };
      offset += arcLength;
      return segment;
    });

    return { total, segments };
  }, [periodTransactions]);

  const openAddTxModal = (type: 'Revenu' | 'Dépense') => {
    setTxTitle('');
    setTxAmount('');
    setTxCategory(type === 'Revenu' ? 'Emploi' : 'Alimentation');
    setTxSource(type === 'Revenu' ? 'Virement bancaire' : 'Carte bancaire');
    setShowAddTxModal(type);
  };

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount);
    if (!txTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const finalAmount = showAddTxModal === 'Dépense' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    addTransaction({
      title: txTitle.trim(),
      type: showAddTxModal!,
      category: txCategory,
      amount: finalAmount,
      date: new Date().toLocaleDateString('fr-FR'),
      source: txSource.trim() || 'Espèces',
    });

    setTxTitle('');
    setTxAmount('');
    setShowAddTxModal(null);
  };

  const openBudgetModal = () => {
    setBudgetInput(String(monthlyBudgetMax > 0 ? monthlyBudgetMax : 2000000));
    setBudgetError('');
    setShowBudgetModal(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(budgetInput, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setBudgetError('Veuillez saisir un plafond valide supérieur à 0 Ar.');
      return;
    }
    updateFinanceSettings({ monthlyBudgetMax: parsed });
    setShowBudgetModal(false);
  };

  const openSavingsModal = () => {
    setSavingsCurrentInput(String(savingsCurrent));
    setSavingsTargetInput(String(savingsTarget));
    setSavingsAdjustInput('');
    setSavingsError('');
    setShowSavingsModal(true);
  };

  const handleAdjustSavings = (deltaSign: 1 | -1) => {
    const amount = parseInt(savingsAdjustInput, 10);
    if (isNaN(amount) || amount <= 0) {
      setSavingsError('Saisissez un montant positif pour effectuer un versement ou un retrait.');
      return;
    }
    const baseCurrent = Math.max(0, parseInt(savingsCurrentInput, 10) || 0);
    const nextCurrent = Math.max(0, baseCurrent + deltaSign * amount);
    setSavingsCurrentInput(String(nextCurrent));
    setSavingsAdjustInput('');
    setSavingsError('');
  };

  const handleSaveSavings = (e: React.FormEvent) => {
    e.preventDefault();
    const nextCurrent = parseInt(savingsCurrentInput, 10);
    const nextTarget = parseInt(savingsTargetInput, 10);
    if (isNaN(nextCurrent) || nextCurrent < 0 || isNaN(nextTarget) || nextTarget <= 0) {
      setSavingsError("Veuillez saisir des montants valides (objectif supérieur à 0 Ar).");
      return;
    }
    updateFinanceSettings({
      savingsGoalCurrent: nextCurrent,
      savingsGoalTarget: nextTarget,
    });
    setShowSavingsModal(false);
  };

  const getTxIcon = (category: string) => {
    switch (category) {
      case 'Alimentation': return ShoppingBag;
      case 'Freelance': return Gift;
      case 'Transport': return Car;
      case 'Loisirs': return Tv;
      case 'Logement': return Home;
      case 'Santé': return HeartPulse;
      default: return Briefcase;
    }
  };

  const activeBucket = hoveredBucketIdx !== null ? chartData.points[hoveredBucketIdx] : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">

      {/* 1. Period Selectors Header */}
      <div className="flex items-center justify-end">
        {/* Period Segmented Pills: Jour, Semaine, Mois, Année */}
        <div className="flex items-center p-1 rounded-2xl bg-emerald-950/70 border border-emerald-500/25">
          {(['Jour', 'Semaine', 'Mois', 'Année'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setHoveredBucketIdx(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(0,230,118,0.5)] font-bold'
                  : 'text-emerald-300/70 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Solde Total Main Card (Matching page 8) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-emerald-300/80 uppercase font-bold tracking-wider">Solde total</p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {balanceVisible
                    ? `${currentBalance.toLocaleString('fr-FR')} Ar`
                    : '•••••••• Ar'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setBalanceVisible(!balanceVisible)}
            className="p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/25 text-emerald-300 hover:text-white hover:border-emerald-400 transition-all"
            title={balanceVisible ? 'Masquer le solde' : 'Afficher le solde'}
          >
            {balanceVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 3. Three Metric Indicators (Matching page 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total des revenus */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-medium">Total des revenus ({period})</p>
            <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
              <span className="text-lg sm:text-xl font-extrabold text-white">
                {balanceVisible ? `${periodRevenue.toLocaleString('fr-FR')} Ar` : '•••• Ar'}
              </span>
              <span className={`text-[10px] font-bold ${revenueDelta.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {revenueDelta.hasChange ? (revenueDelta.isPositive ? `↑ ${revenueDelta.label}` : `↓ ${revenueDelta.label}`) : '— 0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Total des dépenses */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-medium">Total des dépenses ({period})</p>
            <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
              <span className="text-lg sm:text-xl font-extrabold text-white">
                {balanceVisible ? `${periodExpense.toLocaleString('fr-FR')} Ar` : '•••• Ar'}
              </span>
              <span className={`text-[10px] font-bold ${expenseDelta.isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
                {expenseDelta.hasChange ? (expenseDelta.isPositive ? `↑ ${expenseDelta.label}` : `↓ ${expenseDelta.label}`) : '— 0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Solde disponible */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-medium">Solde disponible</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-extrabold text-white">
                {balanceVisible ? `${currentBalance.toLocaleString('fr-FR')} Ar` : '•••• Ar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive 2-Column Split: Interactive Chart & Transactions vs Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Chart & Transactions */}
        <div className="lg:col-span-7 space-y-6">

          {/* 4. Line Chart: Revenus et Dépenses (Matching page 8) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Revenus et Dépenses</h3>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Revenus
                </span>
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                  Dépenses
                </span>
                <button
                  onClick={() => setIsChartExpanded(true)}
                  className="text-emerald-400/60 hover:text-white p-1 transition-colors"
                  title="Agrandir le graphique"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Hover Tooltip */}
            {activeBucket && (
              <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/30 flex items-center justify-between text-xs animate-in fade-in duration-150">
                <span className="font-bold text-emerald-200">{activeBucket.fullLabel}</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">
                    +{activeBucket.revenue.toLocaleString('fr-FR')} Ar
                  </span>
                  <span className="text-amber-400 font-bold">
                    -{activeBucket.expense.toLocaleString('fr-FR')} Ar
                  </span>
                </div>
              </div>
            )}

            {/* Custom Interactive SVG Line Chart */}
            <div className="relative w-full h-56 pt-2">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[15, 59, 102, 146, 190].map((y, idx) => (
                  <line
                    key={idx}
                    x1="45"
                    y1={y}
                    x2="480"
                    y2={y}
                    stroke="rgba(16, 185, 129, 0.12)"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Dynamic Y Axis Labels */}
                {chartData.yTicks.map((tick, idx) => (
                  <text key={idx} x="2" y={tick.y} fill="rgba(52, 211, 153, 0.7)" fontSize="10">
                    {tick.label}
                  </text>
                ))}

                {/* Dynamic Revenue Line */}
                <path
                  d={chartData.revPath}
                  fill="none"
                  stroke="#00e676"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(0,230,118,0.7)]"
                />

                {/* Dynamic Expense Line */}
                <path
                  d={chartData.expPath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                />

                {/* Data Points - Revenue (Green Circles) */}
                {chartData.points.map((pt, i) => (
                  <circle
                    key={`rev-${i}`}
                    cx={pt.cx}
                    cy={pt.revY}
                    r={hoveredBucketIdx === i ? 7 : 5}
                    fill="#00e676"
                    stroke="#042f24"
                    strokeWidth="2"
                    className="transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredBucketIdx(i)}
                    onMouseLeave={() => setHoveredBucketIdx(null)}
                    onClick={() => setHoveredBucketIdx(hoveredBucketIdx === i ? null : i)}
                  />
                ))}

                {/* Data Points - Expenses (Amber Circles) */}
                {chartData.points.map((pt, i) => (
                  <circle
                    key={`exp-${i}`}
                    cx={pt.cx}
                    cy={pt.expY}
                    r={hoveredBucketIdx === i ? 7 : 5}
                    fill="#fbbf24"
                    stroke="#042f24"
                    strokeWidth="2"
                    className="transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredBucketIdx(i)}
                    onMouseLeave={() => setHoveredBucketIdx(null)}
                    onClick={() => setHoveredBucketIdx(hoveredBucketIdx === i ? null : i)}
                  />
                ))}
              </svg>

              {/* Dynamic X Axis Labels */}
              <div className="flex justify-between pl-12 pr-4 text-xs font-semibold text-emerald-300/80 mt-1">
                {chartData.points.map((pt, idx) => (
                  <span key={idx}>{pt.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Historique des transactions (Matching page 8) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">Historique des transactions</h3>
              <button
                onClick={() => setShowAllTransactions(prev => !prev)}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                {showAllTransactions ? `Filtrer (${period}) ↑` : 'Voir tout →'}
              </button>
            </div>

            {/* Segmented Filter: Toutes, Revenus, Dépenses */}
            <div className="flex items-center gap-2 mb-4">
              {(['Toutes', 'Revenus', 'Dépenses'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTxFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    txFilter === filter
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,230,118,0.4)]'
                      : 'glass-panel-subtle text-emerald-200/70 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/15 text-center space-y-2">
                  <p className="text-xs text-emerald-200/70">
                    Aucune transaction sur cette période ({period}).
                  </p>
                  {!showAllTransactions && transactions.length > 0 && (
                    <button
                      onClick={() => setShowAllTransactions(true)}
                      className="text-xs text-emerald-400 font-bold hover:underline"
                    >
                      Afficher toutes les transactions ({transactions.length})
                    </button>
                  )}
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const Icon = getTxIcon(tx.category);
                  const isPositive = tx.amount > 0;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 hover:border-emerald-400/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isPositive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{tx.title}</h4>
                          <p className="text-[11px] text-emerald-300/70">
                            {tx.type} · {tx.category} · {tx.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className={`font-extrabold text-sm sm:text-base ${
                            isPositive ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {balanceVisible
                              ? (isPositive ? `+${tx.amount.toLocaleString('fr-FR')} Ar` : `${tx.amount.toLocaleString('fr-FR')} Ar`)
                              : '•••• Ar'}
                          </span>
                        </div>
                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="p-1.5 text-emerald-400/40 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10"
                          title="Supprimer la transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Buttons: + Ajouter un revenu / - Ajouter une dépense (Matching page 8) */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-3 border-t border-emerald-500/20">
              <button
                onClick={() => openAddTxModal('Revenu')}
                className="py-2.5 px-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:text-white hover:bg-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Ajouter un revenu</span>
              </button>

              <button
                onClick={() => openAddTxModal('Dépense')}
                className="py-2.5 px-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:text-white hover:bg-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(244,63,94,0.2)]"
              >
                <Minus className="w-4 h-4 stroke-[3]" />
                <span>Ajouter une dépense</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Catégories, Objectifs & Budget (Matching page 8 right & bottom) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Catégories de dépenses (Dynamic Donut & Breakdown) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              Catégories de dépenses
            </h3>

            {expenseCategories.segments.length === 0 ? (
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="35" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="14" fill="transparent" />
                  </svg>
                </div>
                <p className="text-xs text-emerald-200/70">
                  Aucune dépense enregistrée sur cette période ({period}).
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                {/* Dynamic SVG Donut */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {expenseCategories.segments.map((seg) => (
                      <circle
                        key={seg.name}
                        cx="50"
                        cy="50"
                        r={DONUT_RADIUS}
                        stroke={seg.color.stroke}
                        strokeWidth="14"
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        fill="transparent"
                      />
                    ))}
                  </svg>
                </div>

                {/* Dynamic Legend with percentages */}
                <div className="space-y-1.5 flex-1 text-xs font-medium">
                  {expenseCategories.segments.map((seg) => (
                    <div key={seg.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-emerald-200 truncate">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.color.dot}`} />
                        <span className="truncate">{seg.name}</span>
                      </span>
                      <span className="font-bold text-white shrink-0">{seg.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Objectifs d'épargne (Trophy card matching page 8) */}
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Objectifs d'épargne
              </span>
              <button
                onClick={openSavingsModal}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                Voir les détails →
              </button>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-xl font-extrabold text-white">
                    {balanceVisible ? `${savingsCurrent.toLocaleString('fr-FR')} Ar` : '•••• Ar'}
                  </span>
                  <span className="text-xs text-emerald-300/80">
                    / {balanceVisible ? `${savingsTarget.toLocaleString('fr-FR')} Ar` : '•••• Ar'}
                  </span>
                </div>
                {/* Dynamic Progress bar */}
                <div className="w-full bg-emerald-950/80 rounded-full h-2 mt-2 overflow-hidden border border-emerald-500/20">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${savingsBarWidth}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-extrabold text-amber-300 shrink-0">{savingsPct}%</span>
            </div>
          </div>

          {/* Budget mensuel (Matching page 8) */}
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Budget mensuel
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={openBudgetModal}
                  className="px-2.5 py-1 rounded-lg glass-panel-subtle text-emerald-300 text-xs font-bold hover:text-white flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Modifier
                </button>
                <button
                  onClick={() => updateFinanceSettings({ monthlyBudgetMax: 0 })}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500 hover:text-white flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Supprimer
                </button>
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-baseline justify-between text-xs gap-2">
                <span className="text-base font-extrabold text-white">
                  {balanceVisible ? `${monthlyBudgetSpent.toLocaleString('fr-FR')} Ar` : '•••• Ar'} /{' '}
                  {monthlyBudgetMax > 0
                    ? (balanceVisible ? `${monthlyBudgetMax.toLocaleString('fr-FR')} Ar` : '•••• Ar')
                    : 'Non défini'}
                </span>
                <span className={`font-extrabold ${budgetPct > 100 ? 'text-rose-400' : 'text-emerald-300'}`}>
                  {budgetPct}%
                </span>
              </div>
              <div className="w-full bg-emerald-950/80 rounded-full h-2.5 mt-2 overflow-hidden border border-emerald-500/20">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    budgetPct > 100
                      ? 'bg-gradient-to-r from-amber-400 to-rose-500 shadow-[0_0_8px_#f43f5e]'
                      : 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_8px_#34d399]'
                  }`}
                  style={{ width: `${budgetBarWidth}%` }}
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Ajouter un revenu ou une dépense */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                {showAddTxModal === 'Revenu' ? 'Ajouter un nouveau revenu' : 'Enregistrer une nouvelle dépense'}
              </h3>
              <button
                onClick={() => setShowAddTxModal(null)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Description / Libellé *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Salaire, Facture, Mission freelance"
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Montant en Ariary (Ar) *
                </label>
                <input
                  type="number"
                  step="100"
                  min="1"
                  required
                  placeholder="ex: 150000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm bg-emerald-950"
                  >
                    <option value="Emploi">Emploi / Salaire</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Alimentation">Alimentation</option>
                    <option value="Transport">Transport</option>
                    <option value="Loisirs">Loisirs</option>
                    <option value="Logement">Logement</option>
                    <option value="Santé">Santé</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Moyen de paiement
                  </label>
                  <input
                    type="text"
                    value={txSource}
                    onChange={(e) => setTxSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(null)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Enregistrer la transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmation suppression transaction */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Supprimer la transaction
              </h3>
              <button onClick={() => setTxToDelete(null)} className="text-emerald-400/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              Voulez-vous vraiment supprimer <span className="font-bold text-white">« {txToDelete.title} »</span> ({Math.abs(txToDelete.amount).toLocaleString('fr-FR')} Ar) ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  deleteTransaction(txToDelete.id);
                  setTxToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-[0_0_12px_rgba(244,63,94,0.4)]"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Modifier le Budget mensuel */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Modifier le budget mensuel
              </h3>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 mt-4">
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-between text-xs">
                <span className="text-emerald-200/80">Dépenses réelles du mois :</span>
                <span className="font-extrabold text-white">{monthlyBudgetSpent.toLocaleString('fr-FR')} Ar</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Plafond mensuel (Ar) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  required
                  value={budgetInput}
                  onChange={(e) => {
                    setBudgetInput(e.target.value);
                    setBudgetError('');
                  }}
                  placeholder="ex: 2000000"
                  className="w-full px-4 py-2.5 rounded-2xl glass-input text-sm font-bold"
                />
                {budgetError && <p className="text-xs text-rose-400 mt-1">{budgetError}</p>}
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Détails et gestion des Objectifs d'épargne */}
      {showSavingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-amber-400" />
                Objectifs d'épargne
              </h3>
              <button
                onClick={() => setShowSavingsModal(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSavings} className="space-y-4 mt-4">
              {(() => {
                const previewCurr = Math.max(0, parseInt(savingsCurrentInput, 10) || 0);
                const previewTarget = Math.max(0, parseInt(savingsTargetInput, 10) || 0);
                const previewPct = previewTarget > 0 ? Math.round((previewCurr / previewTarget) * 100) : 0;
                const remaining = Math.max(0, previewTarget - previewCurr);
                return (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-200/80">Progression</span>
                      <span className="font-extrabold text-amber-300">{previewPct}%</span>
                    </div>
                    <div className="w-full bg-emerald-950/90 rounded-full h-2 overflow-hidden border border-emerald-500/20">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, previewPct))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-emerald-300/80">
                      Reste à épargner : <span className="font-bold text-white">{remaining.toLocaleString('fr-FR')} Ar</span>
                    </p>
                  </div>
                );
              })()}

              {/* Quick deposit / withdrawal */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                  Versement / Retrait rapide (Ar)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={savingsAdjustInput}
                    onChange={(e) => {
                      setSavingsAdjustInput(e.target.value);
                      setSavingsError('');
                    }}
                    placeholder="ex: 100000"
                    className="flex-1 px-3 py-2 rounded-2xl glass-input text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustSavings(1)}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 text-xs font-bold"
                  >
                    + Verser
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustSavings(-1)}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-bold"
                  >
                    - Retirer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Épargne actuelle (Ar)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={savingsCurrentInput}
                    onChange={(e) => {
                      setSavingsCurrentInput(e.target.value);
                      setSavingsError('');
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Objectif cible (Ar)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    required
                    value={savingsTargetInput}
                    onChange={(e) => {
                      setSavingsTargetInput(e.target.value);
                      setSavingsError('');
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl glass-input text-sm font-bold"
                  />
                </div>
              </div>

              {savingsError && <p className="text-xs text-rose-400">{savingsError}</p>}

              <div className="pt-3 border-t border-emerald-500/20 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSavingsModal(false)}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-emerald-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,230,118,0.5)]"
                >
                  Enregistrer l'objectif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vue agrandie du graphique Revenus et Dépenses */}
      {isChartExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 border border-emerald-400/50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Revenus et Dépenses — Vue détaillée ({period})
                </h3>
              </div>
              <button
                onClick={() => setIsChartExpanded(false)}
                className="text-emerald-400/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full h-72 pt-2">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {[15, 59, 102, 146, 190].map((y, idx) => (
                  <line
                    key={idx}
                    x1="45"
                    y1={y}
                    x2="480"
                    y2={y}
                    stroke="rgba(16, 185, 129, 0.14)"
                    strokeDasharray="3 3"
                  />
                ))}
                {chartData.yTicks.map((tick, idx) => (
                  <text key={idx} x="2" y={tick.y} fill="rgba(52, 211, 153, 0.8)" fontSize="10">
                    {tick.label}
                  </text>
                ))}
                <path
                  d={chartData.revPath}
                  fill="none"
                  stroke="#00e676"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(0,230,118,0.7)]"
                />
                <path
                  d={chartData.expPath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                />
                {chartData.points.map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.cx} cy={pt.revY} r="5.5" fill="#00e676" stroke="#042f24" strokeWidth="2" />
                    <circle cx={pt.cx} cy={pt.expY} r="5.5" fill="#fbbf24" stroke="#042f24" strokeWidth="2" />
                  </g>
                ))}
              </svg>
              <div className="flex justify-between pl-12 pr-4 text-xs font-semibold text-emerald-300/80 mt-1">
                {chartData.points.map((pt, idx) => (
                  <span key={idx}>{pt.label}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-emerald-500/20">
              {chartData.points.map((pt, idx) => (
                <div key={idx} className="p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 text-xs">
                  <p className="font-bold text-emerald-200 truncate">{pt.fullLabel}</p>
                  <p className="text-emerald-400 font-bold mt-1">+{pt.revenue.toLocaleString('fr-FR')} Ar</p>
                  <p className="text-amber-400 font-bold">-{pt.expense.toLocaleString('fr-FR')} Ar</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
