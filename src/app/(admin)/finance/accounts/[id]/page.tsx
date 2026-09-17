'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Wallet, Plus, Download, X, Loader2, FileText, Search, Trash2, Calendar, Building2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function AccountDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Account Summary
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: () => apiClient.get(`/finance/accounts/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  // Fetch Transactions for this Account
  const { data: transactionsData, isLoading: txLoading } = useQuery({
    queryKey: ['account-transactions', id, selectedYear, typeFilter, searchQuery],
    queryFn: () => apiClient.get('/finance/transactions', {
      params: {
        accountId: id,
        year: selectedYear,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        search: searchQuery || undefined
      }
    }).then(r => r.data.data),
    enabled: !!id,
  });

  const transactions = transactionsData || [];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      type: 'INCOME',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      referenceNo: ''
    }
  });

  const watchType = watch('type');

  const openAddModal = (presetType: 'INCOME' | 'EXPENSE') => {
    setValue('type', presetType);
    setIsModalOpen(true);
  };

  const addTxMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/finance/transactions', { ...data, accountId: id }),
    onSuccess: () => {
      toast.success('Transaction recorded successfully');
      setIsModalOpen(false);
      reset({
        type: watchType,
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        referenceNo: ''
      });
      queryClient.invalidateQueries({ queryKey: ['account', id] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions', id] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record transaction')
  });

  const deleteTxMutation = useMutation({
    mutationFn: (txId: string) => apiClient.delete(`/finance/transactions/${txId}`),
    onSuccess: () => {
      toast.success('Transaction deleted');
      queryClient.invalidateQueries({ queryKey: ['account', id] });
      queryClient.invalidateQueries({ queryKey: ['account-transactions', id] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete transaction')
  });

  const exportCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions available to export');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Description', 'Reference No', 'Amount (INR)'];
    const csvContent = [
      headers.join(','),
      ...transactions.map((tx: any) => [
        new Date(tx.date).toLocaleDateString(),
        tx.type,
        `"${tx.category || ''}"`,
        `"${tx.description || ''}"`,
        `"${tx.referenceNo || ''}"`,
        tx.amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${(account?.name || 'Account').replace(/\s+/g, '_')}_Ledger_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (accountLoading) {
    return (
      <div className="p-16 flex justify-center items-center">
        <Loader2 size={36} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-500 font-semibold mb-3">Account not found or deleted.</p>
        <Link href="/finance" className="btn-brand inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Accounts
        </Link>
      </div>
    );
  }

  const isNetPositive = (account.currentBalance || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link href="/finance" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Back to All Accounts
        </Link>
      </div>

      {/* Account Header Banner */}
      <div className="section-card p-6 bg-gradient-to-r from-card to-muted/20 border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">{account.name}</h1>
              {account.code && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {account.code}
                </span>
              )}
            </div>
            {account.description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">{account.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openAddModal('INCOME')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={15} />
            + Record Income
          </button>
          <button
            onClick={() => openAddModal('EXPENSE')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={15} />
            - Record Expense
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Account Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Fund Balance', value: formatCurrency(account.currentBalance || 0), icon: Wallet, color: isNetPositive ? '#059669' : '#f43f5e' },
          { label: 'Total Income', value: formatCurrency(account.totalIncome || 0), icon: ArrowUpRight, color: '#059669' },
          { label: 'Total Expense', value: formatCurrency(account.totalExpense || 0), icon: ArrowDownRight, color: '#f43f5e' },
          { label: 'Total Transactions', value: (account.txCount || 0).toString(), icon: FileText, color: '#6366f1' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="section-card flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Transactions Ledger Table Card */}
      <div className="section-card p-0 overflow-hidden">
        {/* Filter Controls Header */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type Filter:</span>
            <div className="inline-flex rounded-xl bg-background border p-1 text-xs font-semibold">
              {(['ALL', 'INCOME', 'EXPENSE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    typeFilter === t
                      ? t === 'INCOME' ? "bg-emerald-600 text-white font-bold" : t === 'EXPENSE' ? "bg-rose-600 text-white font-bold" : "bg-primary text-primary-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search category, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                <option key={y} value={y}>{y} Year</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        {txLoading ? (
          <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-muted-foreground" /></div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">No transactions recorded for this account</p>
            <p className="text-xs text-muted-foreground mt-1">Use the "+ Record Income" or "- Record Expense" buttons above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs font-bold text-muted-foreground uppercase border-b">
                  <th className="pl-6 py-3 text-left">Date</th>
                  <th className="py-3 text-left">Type</th>
                  <th className="py-3 text-left">Category</th>
                  <th className="py-3 text-left">Description</th>
                  <th className="py-3 text-left">Ref / Receipt #</th>
                  <th className="py-3 text-right pr-6">Amount (₹)</th>
                  <th className="py-3 text-center pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx: any) => {
                  const isIncome = tx.type === 'INCOME';
                  return (
                    <tr key={tx._id} className="hover:bg-muted/20 transition-colors">
                      <td className="pl-6 py-3.5 font-medium whitespace-nowrap text-xs">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          isIncome ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        )}>
                          {isIncome ? 'INCOME' : 'EXPENSE'}
                        </span>
                      </td>
                      <td className="py-3.5 font-semibold text-xs">{tx.category}</td>
                      <td className="py-3.5 text-xs text-muted-foreground max-w-[240px] truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="py-3.5 text-xs font-mono text-muted-foreground">{tx.referenceNo || '-'}</td>
                      <td className={cn(
                        "py-3.5 pr-6 text-right font-extrabold text-sm whitespace-nowrap",
                        isIncome ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this transaction record?')) {
                              deleteTxMutation.mutate(tx._id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-muted-foreground hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Record Income or Expense */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between bg-card">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <span>Record Transaction</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {account.name}
                  </span>
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-muted rounded-full">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(d => addTxMutation.mutate(d))} className="p-5 space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('type', 'INCOME');
                      setValue('category', '');
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      watchType === 'INCOME' ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <ArrowUpRight size={16} /> Income ( വരവ് )
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('type', 'EXPENSE');
                      setValue('category', '');
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      watchType === 'EXPENSE' ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <ArrowDownRight size={16} /> Expense ( ചിലവ് )
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    {...register('amount', { required: 'Amount is required', valueAsNumber: true })}
                    placeholder="e.g. 5000"
                    className="w-full p-2.5 rounded-xl border text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message as string}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">Category *</label>
                  <input
                    type="text"
                    {...register('category', { required: 'Category is required' })}
                    placeholder={watchType === 'INCOME' ? "e.g. Friday Collection, Donation, Rent..." : "e.g. Salary, Electricity, Event, Maintenance..."}
                    className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message as string}</p>}

                  {/* Quick suggestion chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(watchType === 'INCOME' ? [
                      'Friday Collection',
                      'General Donation',
                      'Special Collection',
                      'Rental Income',
                      'Other Income'
                    ] : [
                      'Staff Salary',
                      'Event Expenses',
                      'Electricity & Water',
                      'Maintenance & Repairs',
                      'Equipment & Goods',
                      'Other Expense'
                    ]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setValue('category', cat, { shouldValidate: true })}
                        className="text-[11px] px-2.5 py-1 rounded-lg border bg-muted/50 hover:bg-primary/10 hover:border-primary/40 font-medium transition-colors text-muted-foreground hover:text-foreground"
                      >
                        + {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Date *</label>
                    <input
                      type="date"
                      {...register('date', { required: true })}
                      className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Ref / Receipt #</label>
                    <input
                      type="text"
                      {...register('referenceNo')}
                      placeholder="e.g. REC-104"
                      className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">Description *</label>
                  <input
                    type="text"
                    {...register('description', { required: 'Description is required' })}
                    placeholder="Short description of the income/expense..."
                    className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message as string}</p>}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addTxMutation.isPending}
                    className={cn(
                      "px-5 py-2 rounded-xl font-semibold text-xs text-white flex items-center gap-2 transition-colors shadow-sm",
                      watchType === 'INCOME' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                    )}
                  >
                    {addTxMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Save {watchType === 'INCOME' ? 'Income' : 'Expense'} Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
