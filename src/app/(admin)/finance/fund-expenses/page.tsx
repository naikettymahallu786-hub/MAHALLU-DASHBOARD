'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowDownRight,
  Receipt,
  Building2,
  Calendar,
  Download,
  Search,
  Filter,
  Loader2,
  FileSpreadsheet,
  Tag,
  Layers,
  TrendingDown,
  Building
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from 'sonner';

export default function FundExpensesPage() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch live Expense Transactions
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['fund-expenses-transactions', selectedYear],
    queryFn: () => apiClient.get('/finance/transactions', {
      params: {
        type: 'EXPENSE',
        year: selectedYear === 'ALL' ? undefined : selectedYear
      }
    }).then(r => r.data.data || []),
  });

  // 2. Fetch Accounts list for filtering & reference
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => apiClient.get('/finance/accounts').then(r => r.data.data || []),
  });

  const rawExpenses = expensesData || [];
  const accounts = accountsData || [];
  const isLoading = expensesLoading || accountsLoading;

  // Aggregate total expenses
  const totalExpensesAmount = useMemo(() => {
    return rawExpenses.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
  }, [rawExpenses]);

  // Aggregate expenses dynamically by category/head
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    rawExpenses.forEach((tx: any) => {
      const cat = tx.category?.trim() || 'General Expense';
      map.set(cat, (map.get(cat) || 0) + (Number(tx.amount) || 0));
    });

    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpensesAmount > 0 ? Math.round((amount / totalExpensesAmount) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [rawExpenses, totalExpensesAmount]);

  // Top spending category
  const topCategory = categoryStats[0] || null;

  // Aggregate expenses dynamically by debited account
  const accountStats = useMemo(() => {
    const map = new Map<string, { name: string; code?: string; amount: number }>();
    rawExpenses.forEach((tx: any) => {
      const accId = tx.accountId?._id || 'unassigned';
      const accName = tx.accountId?.name || 'Mosque General Fund';
      const accCode = tx.accountId?.code;
      const prev = map.get(accId) || { name: accName, code: accCode, amount: 0 };
      map.set(accId, { ...prev, amount: prev.amount + (Number(tx.amount) || 0) });
    });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [rawExpenses]);

  // Filtered expenses based on category, account, and search query
  const filteredExpenses = useMemo(() => {
    return rawExpenses.filter((tx: any) => {
      // Category filter
      if (categoryFilter !== 'ALL') {
        const cat = tx.category?.trim() || 'General Expense';
        if (cat !== categoryFilter) return false;
      }

      // Account filter
      if (accountFilter !== 'ALL') {
        const accId = tx.accountId?._id || '';
        if (accId !== accountFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCat = (tx.category || '').toLowerCase().includes(q);
        const matchDesc = (tx.description || '').toLowerCase().includes(q);
        const matchRef = (tx.referenceNo || '').toLowerCase().includes(q);
        const matchAcc = (tx.accountId?.name || '').toLowerCase().includes(q);
        const matchAmt = (tx.amount || '').toString().includes(q);
        const matchRecorder = (tx.recordedBy?.name || '').toLowerCase().includes(q);
        const matchDate = new Date(tx.date).toLocaleDateString().toLowerCase().includes(q);
        return matchCat || matchDesc || matchRef || matchAcc || matchAmt || matchRecorder || matchDate;
      }

      return true;
    });
  }, [rawExpenses, categoryFilter, accountFilter, searchQuery]);

  // CSV Export for Expense Journal
  const exportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expense records to export');
      return;
    }

    const headers = [
      'Date',
      'Voucher / Ref #',
      'Debited Fund / Account',
      'Expense Head / Category',
      'Description / Purpose',
      'Recorded By',
      'Amount (INR)'
    ];

    const rows = filteredExpenses.map((tx: any) => [
      new Date(tx.date).toLocaleDateString(),
      `"${tx.referenceNo || ''}"`,
      `"${tx.accountId?.name || 'Mosque General Fund'}"`,
      `"${tx.category || 'General Expense'}"`,
      `"${tx.description && tx.description !== '-' ? tx.description : ''}"`,
      `"${tx.recordedBy?.name || 'Administrator'}"`,
      tx.amount || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Mahallu_Expense_Journal_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Expense journal exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link href="/finance" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Back to Finance Overview
        </Link>
      </div>

      {/* Page Header Banner */}
      <div className="section-card p-6 bg-gradient-to-r from-rose-950/20 via-card to-card border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-600/10 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Total Fund Expenses & Voucher Journal</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standard expenditure accounting ledger, expense head distribution, and debited funds breakdown
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3.5 py-2 rounded-xl border bg-background text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y} Year</option>
            ))}
            <option value="ALL">All Time</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl border bg-background hover:bg-muted font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download size={15} />
            Export Journal
          </button>
        </div>
      </div>

      {/* Expense KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Expenses Incurred',
            value: formatCurrency(totalExpensesAmount),
            subtitle: `${rawExpenses.length} total expenditure vouchers`,
            icon: ArrowDownRight,
            color: '#f43f5e',
            active: categoryFilter === 'ALL' && accountFilter === 'ALL',
            onClick: () => {
              setCategoryFilter('ALL');
              setAccountFilter('ALL');
            }
          },
          {
            label: 'Primary Expense Head',
            value: topCategory ? formatCurrency(topCategory.amount) : '₹0',
            subtitle: topCategory ? `${topCategory.category} (${topCategory.percentage}%)` : 'No expenses recorded',
            icon: Tag,
            color: '#f59e0b',
            active: false
          },
          {
            label: 'Debiting Funds Count',
            value: `${accountStats.length} Funds`,
            subtitle: `Accounts with outflows`,
            icon: Building2,
            color: '#3b82f6',
            active: false
          },
          {
            label: 'Expense Heads / Categories',
            value: `${categoryStats.length} Heads`,
            subtitle: 'Categorized expenditure streams',
            icon: Layers,
            color: '#8b5cf6',
            active: false
          }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={stat.onClick}
            className={cn(
              "section-card p-4 flex flex-col justify-between transition-all duration-200 border",
              stat.onClick && "cursor-pointer hover:border-border hover:shadow-sm",
              stat.active && "border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02]"
            )}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
                <stat.icon size={16} style={{ color: stat.color }} />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-rose-600">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.subtitle}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expense Head Category Distribution Bar */}
      {categoryStats.length > 0 && (
        <div className="section-card p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag size={14} /> Expenditure by Category Head
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click any category head to filter the voucher table below
              </p>
            </div>
            {categoryFilter !== 'ALL' && (
              <button
                onClick={() => setCategoryFilter('ALL')}
                className="text-xs font-semibold text-primary underline self-start md:self-auto"
              >
                Reset Category Filter ({categoryFilter})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {categoryStats.map((item) => (
              <button
                key={item.category}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === item.category ? 'ALL' : item.category)}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all",
                  categoryFilter === item.category
                    ? "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20"
                    : "bg-muted/20 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-foreground truncate" title={item.category}>
                    {item.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{item.percentage}%</span>
                </div>
                <p className="text-sm font-extrabold text-rose-600">{formatCurrency(item.amount)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Standard Expense Voucher Journal Table */}
      <div className="section-card p-0 overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20">
          <div className="flex flex-wrap items-center gap-2">
            {/* Account / Fund filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fund:</span>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Funds ({accounts.length})</option>
                {accounts.map((acc: any) => (
                  <option key={acc._id} value={acc._id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Category filter dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All Heads ({categoryStats.length})</option>
                {categoryStats.map((item) => (
                  <option key={item.category} value={item.category}>{item.category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ref #, category, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Voucher Journal Table Content */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-xs font-semibold">Loading expense records...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <FileSpreadsheet size={40} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">No expenditure records found</p>
            <p className="text-xs text-muted-foreground mt-1">Try changing your year, account, or category filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs font-bold text-muted-foreground uppercase border-b">
                  <th className="pl-6 py-3 text-left whitespace-nowrap">Date</th>
                  <th className="py-3 text-left whitespace-nowrap">Voucher / Ref #</th>
                  <th className="py-3 text-left">Debited Fund</th>
                  <th className="py-3 text-left">Expense Head</th>
                  <th className="py-3 text-left">Description / Purpose</th>
                  <th className="py-3 text-left">Recorded By</th>
                  <th className="py-3 pr-6 text-right whitespace-nowrap">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map((tx: any) => (
                  <tr key={tx._id} className="hover:bg-muted/20 transition-colors">
                    <td className="pl-6 py-3.5 whitespace-nowrap text-xs font-medium">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {tx.referenceNo || `EXP-${String(tx._id).slice(-6).toUpperCase()}`}
                    </td>
                    <td className="py-3.5 font-semibold text-xs text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[160px]">{tx.accountId?.name || 'Mosque General Fund'}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 whitespace-nowrap">
                        {tx.category || 'General Expense'}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground max-w-[200px] truncate" title={tx.description}>
                      {tx.description && tx.description !== '-' ? tx.description : <span className="opacity-40 italic">No notes</span>}
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {tx.recordedBy?.name || 'Administrator'}
                    </td>
                    <td className="py-3.5 pr-6 text-right font-extrabold text-sm text-rose-600 whitespace-nowrap">
                      -{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
