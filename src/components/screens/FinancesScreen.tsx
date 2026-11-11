import React, { useState } from 'react';
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
  ChevronRight, 
  Calendar, 
  PieChart, 
  Trophy, 
  Edit3, 
  Trash2, 
  Maximize2,
  X,
  Car,
  Tv
} from 'lucide-react';

export const FinancesScreen: React.FC = () => {
  const { 
    transactions, 
    addTransaction, 
    deleteTransaction,
    totalRevenue, 
    totalExpense, 
    currentBalance,
    balanceVisible,
    setBalanceVisible 
  } = useApp();

  const [period, setPeriod] = useState<'Jour' | 'Semaine' | 'Mois' | 'Année'>('Mois');
  const [txFilter, setTxFilter] = useState<'Toutes' | 'Revenus' | 'Dépenses'>('Toutes');
  
  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState<null | 'Revenu' | 'Dépense'>(null);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Alimentation');
  const [txSource, setTxSource] = useState('Carte bancaire');

  // Budget
  const [monthlyBudget, setMonthlyBudget] = useState({ spent: 1500000, max: 2000000 });
  const [savingsGoal, setSavingsGoal] = useState({ current: 2000000, target: 5000000 });

  const filteredTransactions = transactions.filter(t => {
    if (txFilter === 'Revenus') return t.type === 'Revenu' || t.amount > 0;
    if (txFilter === 'Dépenses') return t.type === 'Dépense' || t.amount < 0;
    return true;
  });

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount);
    if (!txTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const finalAmount = showAddTxModal === 'Dépense' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    addTransaction({
      title: txTitle,
      type: showAddTxModal!,
      category: txCategory,
      amount: finalAmount,
      date: new Date().toLocaleDateString('fr-FR'),
      source: txSource,
    });

    setTxTitle('');
    setTxAmount('');
    setShowAddTxModal(null);
  };

  const getTxIcon = (category: string) => {
    switch (category) {
      case 'Alimentation': return ShoppingBag;
      case 'Freelance': return Gift;
      case 'Transport': return Car;
      case 'Loisirs': return Tv;
      default: return Briefcase;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* 1. Period Selectors Header */}
      <div className="flex items-center justify-end">
        {/* Period Segmented Pills: Jour, Semaine, Mois, Année */}
        <div className="flex items-center p-1 rounded-2xl bg-emerald-950/70 border border-emerald-500/25">
          {(['Jour', 'Semaine', 'Mois', 'Année'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
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
            <p className="text-xs text-emerald-200/70 font-medium">Total des revenus</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-extrabold text-white">
                {balanceVisible ? `${totalRevenue.toLocaleString('fr-FR')} Ar` : '•••• Ar'}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">↑ +8.3%</span>
            </div>
          </div>
        </div>

        {/* Total des dépenses */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-medium">Total des dépenses</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-extrabold text-white">
                {balanceVisible ? `${totalExpense.toLocaleString('fr-FR')} Ar` : '•••• Ar'}
              </span>
              <span className="text-[10px] text-rose-400 font-bold">↑ +2.1%</span>
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
                <button className="text-emerald-400/60 hover:text-white p-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Interactive SVG Line Chart */}
            <div className="relative w-full h-56 pt-2">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0, 50, 100, 150, 190].map((y, idx) => (
                  <line 
                    key={idx} 
                    x1="40" 
                    y1={y} 
                    x2="480" 
                    y2={y} 
                    stroke="rgba(16, 185, 129, 0.12)" 
                    strokeDasharray="3 3" 
                  />
                ))}

                {/* Y Axis Labels */}
                <text x="5" y="15" fill="rgba(52, 211, 153, 0.7)" fontSize="10">4M Ar</text>
                <text x="5" y="65" fill="rgba(52, 211, 153, 0.7)" fontSize="10">3M Ar</text>
                <text x="5" y="115" fill="rgba(52, 211, 153, 0.7)" fontSize="10">2M Ar</text>
                <text x="5" y="165" fill="rgba(52, 211, 153, 0.7)" fontSize="10">1M Ar</text>
                <text x="5" y="195" fill="rgba(52, 211, 153, 0.7)" fontSize="10">0 Ar</text>

                {/* Revenue Line (Green, points: Jan 120, Fév 45, Mar 75, Avr 60, Mai 30) */}
                <path
                  d="M 60 140 L 160 65 L 260 85 L 360 65 L 460 35"
                  fill="none"
                  stroke="#00e676"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(0,230,118,0.7)]"
                />

                {/* Expense Line (Orange, points: Jan 160, Fév 90, Mar 125, Avr 95, Mai 95) */}
                <path
                  d="M 60 165 L 160 90 L 260 120 L 360 95 L 460 95"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                />

                {/* Data Points - Revenue (Green Circles) */}
                {[
                  { cx: 60, cy: 140 },
                  { cx: 160, cy: 65 },
                  { cx: 260, cy: 85 },
                  { cx: 360, cy: 65 },
                  { cx: 460, cy: 35 },
                ].map((pt, i) => (
                  <circle
                    key={`rev-${i}`}
                    cx={pt.cx}
                    cy={pt.cy}
                    r="5"
                    fill="#00e676"
                    stroke="#042f24"
                    strokeWidth="2"
                    className="hover:r-7 transition-all cursor-pointer"
                  />
                ))}

                {/* Data Points - Expenses (Amber Circles) */}
                {[
                  { cx: 60, cy: 165 },
                  { cx: 160, cy: 90 },
                  { cx: 260, cy: 120 },
                  { cx: 360, cy: 95 },
                  { cx: 460, cy: 95 },
                ].map((pt, i) => (
                  <circle
                    key={`exp-${i}`}
                    cx={pt.cx}
                    cy={pt.cy}
                    r="5"
                    fill="#fbbf24"
                    stroke="#042f24"
                    strokeWidth="2"
                    className="hover:r-7 transition-all cursor-pointer"
                  />
                ))}
              </svg>

              {/* X Axis Months */}
              <div className="flex justify-between pl-12 pr-4 text-xs font-semibold text-emerald-300/80 mt-1">
                <span>Jan</span>
                <span>Fév</span>
                <span>Mar</span>
                <span>Avr</span>
                <span>Mai</span>
              </div>
            </div>
          </div>

          {/* 5. Historique des transactions (Matching page 8) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">Historique des transactions</h3>
              <button className="text-xs text-emerald-400 font-bold hover:underline">
                Voir tout →
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
              {filteredTransactions.map((tx) => {
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
                          {isPositive ? `+${tx.amount.toLocaleString('fr-FR')} Ar` : `${tx.amount.toLocaleString('fr-FR')} Ar`}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer la transaction "${tx.title}" ?`)) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="p-1.5 text-emerald-400/40 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10"
                        title="Supprimer la transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons: + Ajouter un revenu / - Ajouter une dépense (Matching page 8) */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-3 border-t border-emerald-500/20">
              <button
                onClick={() => setShowAddTxModal('Revenu')}
                className="py-2.5 px-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:text-white hover:bg-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Ajouter un revenu</span>
              </button>

              <button
                onClick={() => setShowAddTxModal('Dépense')}
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
          
          {/* Catégories de dépenses (Donut & Breakdown) */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/30">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              Catégories de dépenses
            </h3>

            <div className="flex items-center gap-6">
              {/* SVG Donut */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="35" stroke="#10b981" strokeWidth="14" strokeDasharray="88 220" fill="transparent" />
                  <circle cx="50" cy="50" r="35" stroke="#f59e0b" strokeWidth="14" strokeDasharray="66 220" strokeDashoffset="-88" fill="transparent" />
                  <circle cx="50" cy="50" r="35" stroke="#a855f7" strokeWidth="14" strokeDasharray="44 220" strokeDashoffset="-154" fill="transparent" />
                  <circle cx="50" cy="50" r="35" stroke="#06b6d4" strokeWidth="14" strokeDasharray="22 220" strokeDashoffset="-198" fill="transparent" />
                </svg>
              </div>

              {/* Legend with percentages */}
              <div className="space-y-1.5 flex-1 text-xs font-medium">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Alimentation
                  </span>
                  <span className="font-bold text-white">40%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Transport
                  </span>
                  <span className="font-bold text-white">30%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Loisirs
                  </span>
                  <span className="font-bold text-white">20%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    Autres
                  </span>
                  <span className="font-bold text-white">10%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Objectifs d'épargne (Trophy card matching page 8) */}
          <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Objectifs d'épargne
              </span>
              <button 
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                Voir les détails →
              </button>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 fill-current" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-white">
                    {savingsGoal.current.toLocaleString('fr-FR')} Ar
                  </span>
                  <span className="text-xs text-emerald-300/80">/ {savingsGoal.target.toLocaleString('fr-FR')} Ar</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-emerald-950/80 rounded-full h-2 mt-2 overflow-hidden border border-emerald-500/20">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all"
                    style={{ width: '40%' }}
                  />
                </div>
              </div>
              <span className="text-sm font-extrabold text-amber-300">40%</span>
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
                  onClick={() => {
                    const newMax = prompt('Nouveau plafond mensuel :', String(monthlyBudget.max));
                    if (newMax) setMonthlyBudget(b => ({ ...b, max: parseInt(newMax) }));
                  }}
                  className="px-2.5 py-1 rounded-lg glass-panel-subtle text-emerald-300 text-xs font-bold hover:text-white flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Modifier
                </button>
                <button 
                  onClick={() => setMonthlyBudget({ spent: 0, max: 2000000 })}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500 hover:text-white flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Supprimer
                </button>
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-base font-extrabold text-white">
                  {monthlyBudget.spent.toLocaleString('fr-FR')} Ar / {monthlyBudget.max.toLocaleString('fr-FR')} Ar
                </span>
                <span className="font-extrabold text-emerald-300">75%</span>
              </div>
              <div className="w-full bg-emerald-950/80 rounded-full h-2.5 mt-2 overflow-hidden border border-emerald-500/20">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all shadow-[0_0_8px_#34d399]"
                  style={{ width: '75%' }}
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

    </div>
  );
};
