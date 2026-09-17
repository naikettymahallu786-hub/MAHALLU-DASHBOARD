'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Wallet,
  Building2,
  Download,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Scale,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  FileSpreadsheet
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from 'sonner';

type BalanceStatusFilter = 'ALL' | 'SURPLUS' | 'DEFICIT' | 'ZERO';

export default function NetBalancePage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<BalanceStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch live Accounts & Funds with aggregated totals
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => apiClient.get('/finance/accounts').then(r => r.data.data || []),
  });

  const accounts = accountsData || [];

  // 2. Compute dynamic executive accounting totals
  const totalNetBalance = useMemo(() => {
    return accounts.reduce((acc: number, a: any) => acc + (a.currentBalance || 0), 0);
  }, [accounts]);

  const totalOpeningReserve = useMemo(() => {
    return accounts.reduce((acc: number, a: any) => acc + (a.openingBalance || 0), 0);
  }, [accounts]);

  const totalCumulativeIncome = useMemo(() => {
    return accounts.reduce((acc: number, a: any) => acc + (a.totalIncome || 0), 0);
  }, [accounts]);

  const totalCumulativeExpense = useMemo(() => {
    return accounts.reduce((acc: number, a: any) => acc + (a.totalExpense || 0), 0);
  }, [accounts]);

  const netOperationalMovement = totalCumulativeIncome - totalCumulativeExpense;

  // Account health counts
  const surplusCount = accounts.filter((a: any) => (a.currentBalance || 0) > 0).length;
  const deficitCount = accounts.filter((a: any) => (a.currentBalance || 0) < 0).length;
  const zeroCount = accounts.filter((a: any) => (a.currentBalance || 0) === 0).length;

  // 3. Filtered accounts based on user search & status filter
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc: any) => {
      const balance = acc.currentBalance || 0;

      // Status filter
      if (statusFilter === 'SURPLUS' && balance <= 0) return false;
      if (statusFilter === 'DEFICIT' && balance >= 0) return false;
      if (statusFilter === 'ZERO' && balance !== 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = acc.name?.toLowerCase().includes(q);
        const matchCode = (acc.code || '').toLowerCase().includes(q);
        const matchDesc = (acc.description || '').toLowerCase().includes(q);
        return matchName || matchCode || matchDesc;
      }
      return true;
    });
  }, [accounts, statusFilter, searchQuery]);

  // CSV Export for Balance Sheet
  const exportCSV = () => {
    if (filteredAccounts.length === 0) {
      toast.error('No accounts data to export');
      return;
    }

    const headers = [
      'Account / Fund Name',
      'Account Code',
      'Opening Balance (INR)',
      'Total Incomes (INR)',
      'Total Expenses (INR)',
      'Net Movement (INR)',
      'Closing Net Balance (INR)',
      'Status'
    ];

    const rows = filteredAccounts.map((a: any) => {
      const netMovement = (a.totalIncome || 0) - (a.totalExpense || 0);
      return [
        `"${a.name}"`,
        `"${a.code || ''}"`,
        a.openingBalance || 0,
        a.totalIncome || 0,
        a.totalExpense || 0,
        netMovement,
        a.currentBalance || 0,
        `"${(a.currentBalance || 0) >= 0 ? 'Surplus' : 'Deficit'}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Mahallu_Fund_Balance_Sheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Balance sheet exported successfully');
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
      <div className="section-card p-6 bg-gradient-to-r from-emerald-950/20 via-card to-card border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Total Net Balance & Fund Reserves</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparative fund capital sheet & net liquidity across all Mahallu accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl border bg-background hover:bg-muted font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download size={15} />
            Export Balance Sheet
          </button>
        </div>
      </div>

      {/* Executive Accounting Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Net Reserve (Capital)',
            value: formatCurrency(totalNetBalance),
            subtitle: `${accounts.length} active funds`,
            icon: Wallet,
            color: totalNetBalance >= 0 ? '#059669' : '#f43f5e',
            active: statusFilter === 'ALL',
            onClick: () => setStatusFilter('ALL')
          },
          {
            label: 'Opening Capital Reserves',
            value: formatCurrency(totalOpeningReserve),
            subtitle: 'Initial seeded balances',
            icon: Building2,
            color: '#3b82f6',
            active: false
          },
          {
            label: 'Net Operations Movement',
            value: `${netOperationalMovement >= 0 ? '+' : ''}${formatCurrency(netOperationalMovement)}`,
            subtitle: `Incomes - Expenses`,
            icon: netOperationalMovement >= 0 ? TrendingUp : TrendingDown,
            color: netOperationalMovement >= 0 ? '#059669' : '#f43f5e',
            active: false
          },
          {
            label: 'Fund Health Breakdown',
            value: `${surplusCount} Surplus / ${deficitCount} Deficit`,
            subtitle: `${zeroCount} zero-balance accounts`,
            icon: surplusCount >= deficitCount ? ShieldCheck : AlertTriangle,
            color: surplusCount >= deficitCount ? '#059669' : '#f59e0b',
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
              stat.active && "border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-500/[0.02]"
            )}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}15` }}>
                <stat.icon size={16} style={{ color: stat.color }} />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.subtitle}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fund Capital Share & Distribution Bar */}
      <div className="section-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FolderKanban size={14} /> Fund Capital Share Distribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Proportion of positive net reserves held across designated funds
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {accounts.length} Total Accounts
          </span>
        </div>

        <div className="space-y-2.5">
          {accounts
            .filter((a: any) => (a.currentBalance || 0) > 0)
            .map((acc: any) => {
              const positiveTotal = accounts
                .filter((a: any) => (a.currentBalance || 0) > 0)
                .reduce((s: number, a: any) => s + a.currentBalance, 0);
              const percentage = positiveTotal > 0 ? Math.round((acc.currentBalance / positiveTotal) * 100) : 0;

              return (
                <div key={acc._id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <span>{acc.name}</span>
                      {acc.code && <span className="font-mono text-[10px] text-muted-foreground">({acc.code})</span>}
                      {acc.isDefault && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-semibold">
                      <span>{formatCurrency(acc.currentBalance)}</span>
                      <span className="text-muted-foreground text-[11px] w-8 text-right">{percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Comparative Balance Sheet Table */}
      <div className="section-card p-0 overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fund Status:</span>
            <div className="inline-flex rounded-xl bg-background border p-1 text-xs font-semibold">
              {[
                { id: 'ALL' as BalanceStatusFilter, label: `All (${accounts.length})` },
                { id: 'SURPLUS' as BalanceStatusFilter, label: `Surplus (${surplusCount})` },
                { id: 'DEFICIT' as BalanceStatusFilter, label: `Deficit (${deficitCount})` },
                { id: 'ZERO' as BalanceStatusFilter, label: `Zero (${zeroCount})` },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    statusFilter === s.id
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search account name, code, desc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Balance Sheet Table */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-xs font-semibold">Loading fund balance sheet...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <FileSpreadsheet size={40} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">No accounts found matching filter</p>
            <p className="text-xs text-muted-foreground mt-1">Try resetting your status filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs font-bold text-muted-foreground uppercase border-b">
                  <th className="pl-6 py-3 text-left">Fund / Account</th>
                  <th className="py-3 text-right">Opening Reserve</th>
                  <th className="py-3 text-right">Total Inflow (+)</th>
                  <th className="py-3 text-right">Total Outflow (-)</th>
                  <th className="py-3 text-right">Net Movement</th>
                  <th className="py-3 text-right pr-6">Closing Net Balance</th>
                  <th className="py-3 text-center pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAccounts.map((acc: any) => {
                  const netMovement = (acc.totalIncome || 0) - (acc.totalExpense || 0);
                  const isSurplus = (acc.currentBalance || 0) >= 0;

                  return (
                    <tr key={acc._id} className="hover:bg-muted/20 transition-colors">
                      <td className="pl-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                            isSurplus ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          )}>
                            <Building2 size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">{acc.name}</span>
                              {acc.code && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                                  {acc.code}
                                </span>
                              )}
                              {acc.isDefault && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            {acc.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm truncate" title={acc.description}>
                                {acc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 text-right font-medium text-xs text-muted-foreground">
                        {formatCurrency(acc.openingBalance || 0)}
                      </td>

                      <td className="py-4 text-right font-semibold text-xs text-emerald-600">
                        +{formatCurrency(acc.totalIncome || 0)}
                      </td>

                      <td className="py-4 text-right font-semibold text-xs text-rose-600">
                        -{formatCurrency(acc.totalExpense || 0)}
                      </td>

                      <td className={cn(
                        "py-4 text-right font-semibold text-xs",
                        netMovement >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {netMovement >= 0 ? '+' : ''}{formatCurrency(netMovement)}
                      </td>

                      <td className={cn(
                        "py-4 pr-6 text-right font-extrabold text-sm whitespace-nowrap",
                        isSurplus ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatCurrency(acc.currentBalance || 0)}
                      </td>

                      <td className="py-4 pr-4 text-center">
                        <Link
                          href={`/finance/accounts/${acc._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                        >
                          Ledger <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
