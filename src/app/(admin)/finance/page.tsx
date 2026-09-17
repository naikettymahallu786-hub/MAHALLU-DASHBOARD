'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Building2, ChevronRight, X, Loader2, Search, PiggyBank, FolderKanban } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function FinanceOverviewPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => apiClient.get('/finance/accounts').then(r => r.data.data),
  });

  const accounts = accountsData || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', code: '', openingBalance: 0, description: '' }
  });

  const addAccountMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/finance/accounts', data),
    onSuccess: () => {
      toast.success('Account created successfully');
      setIsModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create account')
  });

  // Aggregated totals across all active accounts
  const totalBalance = accounts.reduce((acc: number, a: any) => acc + (a.currentBalance || 0), 0);
  const totalIncome = accounts.reduce((acc: number, a: any) => acc + (a.totalIncome || 0), 0);
  const totalExpense = accounts.reduce((acc: number, a: any) => acc + (a.totalExpense || 0), 0);

  const filteredAccounts = accounts.filter((acc: any) =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.code && acc.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (acc.description && acc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('finance_page.title')}</h1>
          <p className="page-subtitle">{t('finance_page.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsModalOpen(true)} className="btn-brand flex items-center gap-2">
            <Plus size={16} />
            {t('finance_page.addAccount')}
          </button>
        </div>
      </div>

      {/* Cashflow Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('finance_page.totalBalance'), value: formatCurrency(totalBalance), icon: Wallet, color: totalBalance >= 0 ? '#059669' : '#f43f5e' },
          { label: t('finance_page.totalAccounts'), value: accounts.length.toString(), icon: FolderKanban, color: '#3b82f6' },
          { label: t('finance_page.monthlyIncome'), value: formatCurrency(totalIncome), icon: ArrowUpRight, color: '#059669' },
          { label: t('finance_page.monthlyExpenses'), value: formatCurrency(totalExpense), icon: ArrowDownRight, color: '#f43f5e' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="section-card flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{t('finance_page.accountsList')}</h2>
          <p className="text-xs text-muted-foreground">{t('finance_page.accountsSubtitle')}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fund (e.g. Milad, Mosque)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Accounts List / Grid */}
      {accountsLoading ? (
        <div className="p-16 flex justify-center">
          <Loader2 size={36} className="animate-spin text-muted-foreground" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="section-card p-12 text-center text-muted-foreground">
          <PiggyBank size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No fund accounts found</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first fund account like Milad Fund, Mosque Fund, etc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((account: any, index: number) => {
            const isPositive = (account.currentBalance || 0) >= 0;
            return (
              <motion.div
                key={account._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="section-card flex flex-col justify-between hover:shadow-lg transition-all border border-border hover:border-emerald-500/30 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base group-hover:text-emerald-600 transition-colors">{account.name}</h3>
                        {account.code && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {account.code}
                          </span>
                        )}
                      </div>
                    </div>
                    {account.isDefault && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Default
                      </span>
                    )}
                  </div>

                  {account.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                      {account.description}
                    </p>
                  )}

                  {/* Balance Display */}
                  <div className="p-3 rounded-xl bg-muted/40 border mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Net Fund Balance</p>
                      <p className={cn("text-xl font-extrabold mt-0.5", isPositive ? "text-emerald-600" : "text-red-600")}>
                        {formatCurrency(account.currentBalance || 0)}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <ArrowUpRight size={13} /> +{formatCurrency(account.totalIncome || 0)}
                      </div>
                      <div className="flex items-center gap-1 text-red-600 font-semibold mt-0.5">
                        <ArrowDownRight size={13} /> -{formatCurrency(account.totalExpense || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Button */}
                <Link
                  href={`/finance/accounts/${account._id}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs flex items-center justify-between transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  <span>{t('finance_page.manageAccount')}</span>
                  <ChevronRight size={16} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
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
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Building2 size={20} className="text-emerald-600" />
                  Add New Fund / Account
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-muted rounded-full">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(d => addAccountMutation.mutate(d))} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Account / Fund Name *</label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    placeholder="e.g. Milad Fund, Mosque General Fund..."
                    className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Fund Code (Optional)</label>
                    <input
                      type="text"
                      {...register('code')}
                      placeholder="e.g. MLD-01"
                      className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Opening Balance (₹)</label>
                    <input
                      type="number"
                      {...register('openingBalance', { valueAsNumber: true })}
                      placeholder="0"
                      className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">Description</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    placeholder="Short description of what this fund is used for..."
                    className="w-full p-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                  />
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
                    disabled={addAccountMutation.isPending}
                    className="btn-brand px-5 py-2 text-xs font-semibold flex items-center gap-2"
                  >
                    {addAccountMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Create Account
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
