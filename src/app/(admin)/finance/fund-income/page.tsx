'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  Wallet,
  Heart,
  Calendar,
  Download,
  Search,
  Filter,
  Loader2,
  Building2,
  Smartphone,
  Banknote,
  Landmark,
  Globe,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from 'sonner';

type SourceFilter = 'ALL' | 'SPECIAL_FUNDS' | 'DONATIONS' | 'RECURRING';
type ModeFilter = 'ALL' | 'UPI' | 'CASH' | 'BANK' | 'ONLINE' | 'OTHER';

interface UnifiedIncomeItem {
  id: string;
  date: string;
  sourceType: 'SPECIAL_FUNDS' | 'DONATION' | 'RECURRING';
  sourceLabel: string;
  accountOrCampaign: string;
  mode: string;
  modeNormalized: 'UPI' | 'CASH' | 'BANK' | 'ONLINE' | 'OTHER';
  payerName: string;
  referenceNo: string;
  amount: number;
  description?: string;
}

export default function FundIncomePage() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Accounts & Special Funds transactions (Income only)
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['fund-income-transactions', selectedYear],
    queryFn: () => apiClient.get('/finance/transactions', {
      params: { type: 'INCOME', year: selectedYear }
    }).then(r => r.data.data || []),
  });

  // 2. Fetch Accounts list for reference
  const { data: accountsData } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => apiClient.get('/finance/accounts').then(r => r.data.data || []),
  });

  // 3. Fetch Donations
  const { data: donationsData, isLoading: donationsLoading } = useQuery({
    queryKey: ['fund-income-donations'],
    queryFn: () => apiClient.get('/donations', { params: { limit: 200 } }).then(r => r.data?.data || []),
  });

  // 4. Fetch Receipts (includes manual & recurring collections)
  const { data: receiptsData, isLoading: receiptsLoading } = useQuery({
    queryKey: ['fund-income-receipts'],
    queryFn: () => apiClient.get('/receipts').then(r => r.data?.data || []),
  });

  const isLoading = txLoading || donationsLoading || receiptsLoading;

  // Helper to categorize payment mode string
  const normalizePaymentMode = (rawMode?: string, fallbackText?: string): { label: string; key: 'UPI' | 'CASH' | 'BANK' | 'ONLINE' | 'OTHER' } => {
    const text = `${rawMode || ''} ${fallbackText || ''}`.toLowerCase();
    if (text.includes('upi') || text.includes('gpay') || text.includes('phonepe') || text.includes('paytm')) {
      return { label: 'UPI', key: 'UPI' };
    }
    if (text.includes('hand') || text.includes('cash') || text.includes('manual')) {
      return { label: 'By Hand (Cash)', key: 'CASH' };
    }
    if (text.includes('bank') || text.includes('neft') || text.includes('rtgs') || text.includes('cheque') || text.includes('transfer')) {
      return { label: 'Bank / Transfer', key: 'BANK' };
    }
    if (text.includes('razorpay') || text.includes('cashfree') || text.includes('online') || text.includes('gateway') || text.includes('card')) {
      return { label: 'Online Gateway', key: 'ONLINE' };
    }
    return { label: rawMode || 'Direct / Other', key: 'OTHER' };
  };

  // Build unified unified dataset of all incoming money
  const unifiedItems: UnifiedIncomeItem[] = useMemo(() => {
    const items: UnifiedIncomeItem[] = [];

    // A. Accounts & Special Funds transactions
    (txData || []).forEach((tx: any) => {
      const modeNorm = normalizePaymentMode(tx.category, tx.description);
      items.push({
        id: `tx-${tx._id}`,
        date: tx.date,
        sourceType: 'SPECIAL_FUNDS',
        sourceLabel: 'Special Fund / Account',
        accountOrCampaign: tx.accountId?.name || 'Mosque General Fund',
        mode: tx.category || 'Direct Collection',
        modeNormalized: modeNorm.key,
        payerName: tx.recordedBy?.name ? `Recorded by ${tx.recordedBy.name}` : 'Direct Entry',
        referenceNo: tx.referenceNo || `TX-${String(tx._id).slice(-6).toUpperCase()}`,
        amount: Number(tx.amount) || 0,
        description: tx.description && tx.description !== '-' ? tx.description : undefined
      });
    });

    // B. Direct Donations (from /donations)
    (donationsData || []).forEach((don: any) => {
      const donorName = don.isAnonymous
        ? 'Anonymous Donor'
        : (don.donorName || don.donorId?.name || (don.familyId?.familyCode ? `Family ${don.familyId.familyCode}` : 'Well-wisher'));
      const modeNorm = normalizePaymentMode(don.paymentGateway || don.gateway || don.paymentMethod);
      items.push({
        id: `don-${don._id}`,
        date: don.createdAt || don.date,
        sourceType: 'DONATION',
        sourceLabel: 'General Donation',
        accountOrCampaign: don.campaign || don.purpose || 'General Charity',
        mode: don.paymentGateway || don.gateway || 'Online / Direct',
        modeNormalized: modeNorm.key,
        payerName: donorName,
        referenceNo: don.receiptId?.receiptNo || don.paymentId?.transactionId || `DON-${String(don._id).slice(-6).toUpperCase()}`,
        amount: Number(don.amount) || 0,
        description: don.notes || don.description
      });
    });

    // C. Receipts / Recurring Collections
    (receiptsData || []).forEach((rcp: any) => {
      // Avoid duplicate counting if receipt is already tied to one of the donations above
      if (rcp.metadata?.donationId && donationsData?.some((d: any) => d._id === rcp.metadata.donationId)) {
        return;
      }
      const isRecurring = rcp.type === 'recurring' || rcp.category === 'subscription' || rcp.description?.toLowerCase().includes('monthly') || rcp.description?.toLowerCase().includes('recurring');
      const modeNorm = normalizePaymentMode(rcp.gateway || rcp.paymentId?.gateway, rcp.description);
      items.push({
        id: `rcp-${rcp._id}`,
        date: rcp.createdAt,
        sourceType: isRecurring ? 'RECURRING' : 'DONATION',
        sourceLabel: isRecurring ? 'Recurring Collection' : 'Direct Receipt',
        accountOrCampaign: rcp.metadata?.campaign || (isRecurring ? 'Monthly Family Subscription' : 'General Receipt'),
        mode: rcp.gateway || rcp.paymentId?.gateway || 'Cash / Hand',
        modeNormalized: modeNorm.key,
        payerName: rcp.paidById?.name || rcp.metadata?.donorName || rcp.metadata?.name || 'Member',
        referenceNo: rcp.receiptNo || `RCP-${String(rcp._id).slice(-6).toUpperCase()}`,
        amount: Number(rcp.amount) || 0,
        description: rcp.description
      });
    });

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [txData, donationsData, receiptsData]);

  // Filter items by year
  const yearFilteredItems = useMemo(() => {
    return unifiedItems.filter(item => {
      if (!selectedYear || selectedYear === 'ALL') return true;
      const itemYear = new Date(item.date).getFullYear().toString();
      return itemYear === selectedYear;
    });
  }, [unifiedItems, selectedYear]);

  // Aggregate stats across channels
  const totalCombinedIncome = yearFilteredItems.reduce((sum, item) => sum + item.amount, 0);

  const specialFundsIncome = yearFilteredItems
    .filter(i => i.sourceType === 'SPECIAL_FUNDS')
    .reduce((sum, i) => sum + i.amount, 0);

  const donationsIncome = yearFilteredItems
    .filter(i => i.sourceType === 'DONATION')
    .reduce((sum, i) => sum + i.amount, 0);

  const recurringIncome = yearFilteredItems
    .filter(i => i.sourceType === 'RECURRING')
    .reduce((sum, i) => sum + i.amount, 0);

  // Aggregate stats by payment mode
  const modeStats = useMemo(() => {
    const res = {
      UPI: 0,
      CASH: 0,
      BANK: 0,
      ONLINE: 0,
      OTHER: 0
    };
    yearFilteredItems.forEach(i => {
      res[i.modeNormalized] += i.amount;
    });
    return res;
  }, [yearFilteredItems]);

  // Final Filtered list based on user selections
  const displayedItems = useMemo(() => {
    return yearFilteredItems.filter(item => {
      // Source filter
      if (sourceFilter === 'SPECIAL_FUNDS' && item.sourceType !== 'SPECIAL_FUNDS') return false;
      if (sourceFilter === 'DONATIONS' && item.sourceType !== 'DONATION') return false;
      if (sourceFilter === 'RECURRING' && item.sourceType !== 'RECURRING') return false;

      // Mode filter
      if (modeFilter !== 'ALL' && item.modeNormalized !== modeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAcc = item.accountOrCampaign.toLowerCase().includes(q);
        const matchPayer = item.payerName.toLowerCase().includes(q);
        const matchRef = item.referenceNo.toLowerCase().includes(q);
        const matchMode = item.mode.toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchAmt = item.amount.toString().includes(q);
        return matchAcc || matchPayer || matchRef || matchMode || matchDesc || matchAmt;
      }
      return true;
    });
  }, [yearFilteredItems, sourceFilter, modeFilter, searchQuery]);

  // CSV Export
  const exportCSV = () => {
    if (displayedItems.length === 0) {
      toast.error('No records available to export');
      return;
    }

    const headers = ['Date', 'Source Channel', 'Account / Campaign', 'Payment Mode', 'Payer / Donor', 'Reference / Receipt #', 'Amount (INR)', 'Description'];
    const rows = displayedItems.map(item => [
      new Date(item.date).toLocaleDateString(),
      `"${item.sourceLabel}"`,
      `"${item.accountOrCampaign}"`,
      `"${item.mode}"`,
      `"${item.payerName}"`,
      `"${item.referenceNo}"`,
      item.amount,
      `"${item.description || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Total_Fund_Income_Report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Income breakdown exported successfully');
  };

  const getModeIcon = (key: 'UPI' | 'CASH' | 'BANK' | 'ONLINE' | 'OTHER') => {
    switch (key) {
      case 'UPI': return <Smartphone size={13} className="text-violet-500" />;
      case 'CASH': return <Banknote size={13} className="text-emerald-500" />;
      case 'BANK': return <Landmark size={13} className="text-blue-500" />;
      case 'ONLINE': return <Globe size={13} className="text-cyan-500" />;
      default: return <Tag size={13} className="text-gray-400" />;
    }
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
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Total Fund Income Breakdown</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed view of income sources: Accounts & Special Funds, General Donations, and Recurring Collections
              </p>
            </div>
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
            Export Report
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Combined Income',
            value: formatCurrency(totalCombinedIncome),
            subtitle: `${yearFilteredItems.length} total income entries`,
            icon: Wallet,
            color: '#059669',
            active: sourceFilter === 'ALL',
            onClick: () => setSourceFilter('ALL')
          },
          {
            label: 'Accounts & Special Funds',
            value: formatCurrency(specialFundsIncome),
            subtitle: `${accountsData?.length || 0} designated accounts`,
            icon: Building2,
            color: '#3b82f6',
            active: sourceFilter === 'SPECIAL_FUNDS',
            onClick: () => setSourceFilter('SPECIAL_FUNDS')
          },
          {
            label: 'General Donations',
            value: formatCurrency(donationsIncome),
            subtitle: 'Direct causes & campaigns',
            icon: Heart,
            color: '#ec4899',
            active: sourceFilter === 'DONATIONS',
            onClick: () => setSourceFilter('DONATIONS')
          },
          {
            label: 'Recurring Donations',
            value: formatCurrency(recurringIncome),
            subtitle: 'Periodic member subscriptions',
            icon: Calendar,
            color: '#f59e0b',
            active: sourceFilter === 'RECURRING',
            onClick: () => setSourceFilter('RECURRING')
          }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={stat.onClick}
            className={cn(
              "section-card p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 border",
              stat.active
                ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/10 bg-emerald-500/[0.02]"
                : "hover:border-border hover:shadow-sm"
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

      {/* Payment Modes Quick-Breakdown Bar */}
      <div className="section-card p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers size={14} /> Mode of Payment Breakdown
            </h2>
          </div>
          <div className="text-xs text-muted-foreground">
            Click a mode below to filter table
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { key: 'UPI' as ModeFilter, label: 'UPI / QR', amount: modeStats.UPI, icon: Smartphone, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { key: 'CASH' as ModeFilter, label: 'By Hand (Cash)', amount: modeStats.CASH, icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { key: 'BANK' as ModeFilter, label: 'Bank Transfer', amount: modeStats.BANK, icon: Landmark, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { key: 'ONLINE' as ModeFilter, label: 'Online Gateway', amount: modeStats.ONLINE, icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
            { key: 'OTHER' as ModeFilter, label: 'Direct / Other', amount: modeStats.OTHER, icon: Tag, color: 'text-gray-400', bg: 'bg-gray-400/10' },
          ].map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => setModeFilter(modeFilter === mode.key ? 'ALL' : mode.key)}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all",
                modeFilter === mode.key
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "bg-muted/20 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", mode.bg)}>
                  <mode.icon size={13} className={mode.color} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground truncate">{mode.label}</span>
              </div>
              <p className="text-sm font-extrabold">{formatCurrency(mode.amount)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {totalCombinedIncome > 0 ? Math.round((mode.amount / totalCombinedIncome) * 100) : 0}% of total
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Unified Filterable Table */}
      <div className="section-card p-0 overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Channel:</span>
            <div className="inline-flex rounded-xl bg-background border p-1 text-xs font-semibold">
              {[
                { id: 'ALL' as SourceFilter, label: 'All Channels' },
                { id: 'SPECIAL_FUNDS' as SourceFilter, label: 'Special Funds' },
                { id: 'DONATIONS' as SourceFilter, label: 'Donations' },
                { id: 'RECURRING' as SourceFilter, label: 'Recurring' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSourceFilter(s.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    sourceFilter === s.id
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {modeFilter !== 'ALL' && (
              <button
                onClick={() => setModeFilter('ALL')}
                className="text-xs text-primary underline ml-2"
              >
                Clear mode filter ({modeFilter})
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search account, donor, ref, mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Ledger Table Content */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-xs font-semibold">Loading income transactions...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <FileSpreadsheet size={40} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">No income records found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your year, channel, or search filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="bg-muted/30 text-xs font-bold text-muted-foreground uppercase border-b">
                  <th className="pl-6 py-3 text-left">Date</th>
                  <th className="py-3 text-left">Channel</th>
                  <th className="py-3 text-left">Account / Campaign</th>
                  <th className="py-3 text-left">Payment Mode</th>
                  <th className="py-3 text-left">Payer / Contributor</th>
                  <th className="py-3 text-left">Ref / Receipt #</th>
                  <th className="py-3 text-right pr-6">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="pl-6 py-3.5 whitespace-nowrap text-xs font-medium">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                        item.sourceType === 'SPECIAL_FUNDS' && "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                        item.sourceType === 'DONATION' && "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
                        item.sourceType === 'RECURRING' && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      )}>
                        {item.sourceLabel}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-xs">
                      {item.accountOrCampaign}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg bg-muted/60">
                        {getModeIcon(item.modeNormalized)}
                        {item.mode}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground max-w-[200px] truncate" title={item.payerName}>
                      {item.payerName}
                    </td>
                    <td className="py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {item.referenceNo}
                    </td>
                    <td className="py-3.5 pr-6 text-right font-extrabold text-sm text-emerald-600 whitespace-nowrap">
                      +{formatCurrency(item.amount)}
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
