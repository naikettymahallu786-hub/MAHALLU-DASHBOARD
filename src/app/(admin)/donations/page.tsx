'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Search, Plus, DollarSign, Download, Loader2, X, Eye, Printer } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from 'sonner';

export default function DonationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [campaign, setCampaign] = useState('');

  // View & Payment states
  const [selectedDonationForView, setSelectedDonationForView] = useState<any>(null);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectGateway, setCollectGateway] = useState('cash');
  const [collectDescription, setCollectDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['donations', page, limit, campaign],
    queryFn: () => apiClient.get('/donations', {
      params: { page, limit, campaign },
    }).then(r => r.data),
  });

  const collectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.post(`/donations/${id}/collect`, data),
    onSuccess: () => {
      toast.success('Donation collected and receipt generated successfully');
      setIsCollectModalOpen(false);
      setSelectedDonation(null);
      setCollectAmount('');
      setCollectDescription('');
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-kpis'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to collect donation')
  });

  const handlePrintDonationReceipt = (donation: any) => {
    const donorDisplay = donation.isAnonymous
      ? 'Anonymous Donor'
      : (donation.familyId
        ? `Family: ${donation.familyId.headMemberId?.name || donation.familyId.familyCode}`
        : (donation.donorId?.name || donation.donorName || 'Mahallu Well-wisher'));
    const campaignName = donation.campaign || donation.purpose || 'Charity Campaign';
    const amount = formatCurrency(donation.amount || 0);
    const date = formatDate(donation.createdAt);
    const receiptNo = donation.receiptId?.receiptNo || `RCP-DON-${String(donation._id).slice(-6).toUpperCase()}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Donation Receipt ${receiptNo}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; background: #fff; }
            .container { border: 2px solid #059669; border-radius: 16px; padding: 30px; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 25px; }
            .bismillah { font-size: 18px; color: #065f46; margin-bottom: 6px; font-weight: bold; }
            .title { font-size: 24px; font-weight: 900; color: #047857; margin: 0 0 4px 0; }
            .subtitle { color: #64748b; font-size: 13px; margin: 0; font-weight: 600; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 13px; font-weight: 800; padding: 5px 16px; border-radius: 20px; margin-top: 10px; border: 1px solid #a7f3d0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 14px; }
            .label { font-weight: 700; color: #475569; width: 180px; }
            .value { flex: 1; font-weight: 600; color: #0f172a; }
            .amount-box { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 18px 24px; text-align: center; border-radius: 12px; margin: 25px 0; }
            .amount { font-size: 32px; font-weight: 900; margin: 0; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
              <h1 class="title">NAIKKETTY MAHALLU</h1>
              <p class="subtitle">Official Donation Receipt • സംഭാവന രസീത്</p>
              <div class="badge">RECEIPT NO: ${receiptNo}</div>
            </div>
            <div class="row"><div class="label">Date / തീയതി:</div><div class="value">${date}</div></div>
            <div class="row"><div class="label">Donor (ദാതാവ്):</div><div class="value">${donorDisplay}</div></div>
            <div class="row"><div class="label">Campaign (ഇനം):</div><div class="value" style="font-weight: bold; color: #047857;">${campaignName}</div></div>
            <div class="row"><div class="label">Payment Status:</div><div class="value" style="font-weight: bold; color: #059669;">Verified & Paid</div></div>
            ${donation.notes ? `<div class="row"><div class="label">Notes / Purpose:</div><div class="value">${donation.notes}</div></div>` : ''}
            
            <div class="amount-box">
              <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; color: #d1fae5;">Total Donation Received</p>
              <p class="amount">${amount}</p>
            </div>
            
            <div class="footer">
              <p>Jazakallah Khair for supporting this noble cause.</p>
              <p style="margin-top: 2px;">This is a verified computer generated official receipt.</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const donations = data?.data || [];
  const pagination = data?.pagination;

  // Calculate sum of donations
  const totalDonated = donations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('donations_page.title')}</h1>
          <p className="page-subtitle">{t('donations_page.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Download size={16} />
            {t('teachers_page.export')}
          </button>
          <Link href="/donations/new">
            <button id="add-donation-btn" className="btn-brand flex items-center gap-2">
              <Plus size={16} />
              {t('donations_page.collect')}
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="section-card flex items-center gap-4 animate-count"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pink-100 dark:bg-pink-950/30">
            <Heart size={18} className="text-pink-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{pagination?.total || donations.length}</p>
            <p className="text-xs text-muted-foreground">{t('donations_page.totalDonations')}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="section-card flex items-center gap-4 animate-count"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/30">
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalDonated)}</p>
            <p className="text-xs text-muted-foreground">{t('donations_page.totalReceived')}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="section-card flex items-center gap-4 animate-count"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-950/30">
            <DollarSign size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{t('donations_page.pendingDues')}</p>
            <p className="text-xs text-muted-foreground">{t('donations_page.pendingDuesDesc')}</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="section-card">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={campaign}
            onChange={e => { setCampaign(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">{t('donations_page.allCampaigns')}</option>
            <option value="General Sadaqah">General Sadaqah</option>
            <option value="Mosque Renovation">Mosque Renovation</option>
            <option value="Orphan Support">Orphan Support</option>
            <option value="Madrasa Fund">Madrasa Fund</option>
          </select>
        </div>
      </div>

      {/* Donations Table */}
      <div className="section-card overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pl-6">{t('donations_page.donorName')}</th>
                  <th>{t('donations_page.campaign')}</th>
                  <th>{t('donations_page.amount')}</th>
                  <th>{t('donations_page.isAnonymous')}</th>
                  <th>{t('donations_page.date')}</th>
                  <th>{t('teachers_page.status')}</th>
                  <th className="pr-6 text-right">{t('teachers_page.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {donations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Heart size={40} className="mx-auto mb-3 opacity-30" />
                      <p>No donations recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  donations.map((donation: any, i: number) => (
                    <motion.tr
                      key={donation._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="group"
                    >
                      <td className="pl-6">
                        <button
                          onClick={() => setSelectedDonationForView(donation)}
                          className="font-bold text-sm hover:underline flex items-center gap-1.5 cursor-pointer text-left group/donor"
                          title="Click to view donation information"
                        >
                          <span className={donation.isAnonymous ? 'text-pink-600' : 'text-emerald-600 hover:text-emerald-500 font-bold'}>
                            {donation.isAnonymous
                              ? 'Anonymous Donor'
                              : (donation.familyId
                                ? `Family: ${donation.familyId.headMemberId?.name || donation.familyId.familyCode}`
                                : (donation.donorId?.name || donation.donorName || 'General Donor'))}
                          </span>
                          <Eye size={13} className="opacity-0 group-hover/donor:opacity-100 transition-opacity text-emerald-600 shrink-0" />
                        </button>
                      </td>
                      <td>
                        <span className="text-sm font-medium text-foreground capitalize">
                          {donation.campaign || donation.purpose || 'General Sadaqah'}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm font-bold text-emerald-600">
                          {formatCurrency(donation.amount || 0)}
                        </span>
                      </td>
                      <td>
                        <span className={cn('text-xs px-2 py-0.5 rounded font-semibold',
                          donation.isAnonymous ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {donation.isAnonymous ? t('donations_page.yes') : t('donations_page.no')}
                        </span>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {formatDate(donation.createdAt)}
                      </td>
                      <td>
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold capitalize',
                          donation.status === 'paid' || !donation.status ? 'badge-active' : 'badge-overdue'
                        )}>
                          {donation.status === 'paid' || !donation.status ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedDonationForView(donation)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                            title="View details"
                          >
                            <Eye size={13} />
                            View
                          </button>
                          {(donation.status === 'paid' || !donation.status) && (
                            <button
                              onClick={() => handlePrintDonationReceipt(donation)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                              title="Export / Print Official Receipt"
                            >
                              <Printer size={13} />
                              Receipt
                            </button>
                          )}
                          {donation.status === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedDonation(donation);
                                setCollectAmount(String(donation.amount));
                                setIsCollectModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 hover:bg-emerald-700 transition-colors"
                            >
                              <DollarSign size={13} />
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} donations
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-xs font-medium">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                >
                  {[10, 20, 50, 80, 100, 200].map((count) => (
                    <option key={count} value={count}>
                      {count} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!(pagination.hasPrev ?? page > 1)}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-medium px-2.5 py-1.5 bg-muted rounded-lg text-foreground">
                Page {page} of {pagination.totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!(pagination.hasNext ?? page * limit < pagination.total)}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collect Donation Modal */}
      <AnimatePresence>
        {isCollectModalOpen && selectedDonation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b flex items-center justify-between bg-card">
                <h2 className="font-bold text-lg">Collect Pending Donation</h2>
                <button onClick={() => { setIsCollectModalOpen(false); setSelectedDonation(null); }} className="p-2 hover:bg-muted rounded-full">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Donor</label>
                  <p className="text-sm font-bold bg-muted p-2.5 rounded-xl">
                    {selectedDonation.isAnonymous ? 'Anonymous' : (selectedDonation.familyId ? `Family Head: ${selectedDonation.familyId.headMemberId?.name || selectedDonation.familyId.familyCode}` : (selectedDonation.donorId?.name || selectedDonation.donorName || 'General Donor'))}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Campaign</label>
                  <p className="text-sm font-bold bg-muted p-2.5 rounded-xl">{selectedDonation.campaign || 'General Sadaqah'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Amount (INR) *</label>
                  <input 
                    type="number" 
                    value={collectAmount} 
                    onChange={e => setCollectAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-sm" 
                    placeholder="Enter amount..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Payment Method *</label>
                  <select 
                    value={collectGateway} 
                    onChange={e => setCollectGateway(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-sm bg-background"
                  >
                    <option value="cash">Collected By Hand (Cash)</option>
                    <option value="upi">Google Pay / PhonePe / UPI</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description / Note</label>
                  <input 
                    type="text" 
                    value={collectDescription} 
                    onChange={e => setCollectDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-sm" 
                    placeholder="e.g. Received via cash" 
                  />
                </div>
              </div>
              <div className="p-4 border-t bg-card flex gap-3">
                <button onClick={() => { setIsCollectModalOpen(false); setSelectedDonation(null); }} className="flex-1 py-2.5 rounded-xl border font-bold text-sm">Cancel</button>
                <button 
                  onClick={() => collectMutation.mutate({
                    id: selectedDonation._id,
                    data: {
                      amount: Number(collectAmount),
                      gateway: collectGateway,
                      description: collectDescription || `Collected ${selectedDonation.campaign || 'Donation'}`
                    }
                  })}
                  disabled={collectMutation.isPending || !collectAmount} 
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm flex justify-center items-center"
                >
                  {collectMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Log Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* View Donation Details Modal */}
        {selectedDonationForView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-foreground">Donation Details</h2>
                    <p className="text-xs text-muted-foreground">Campaign contribution record</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDonationForView(null)}
                  className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-semibold text-muted-foreground">Donor Name:</span>
                  <span className="font-bold text-foreground">
                    {selectedDonationForView.isAnonymous
                      ? 'Anonymous Donor'
                      : (selectedDonationForView.familyId
                        ? `Family Head: ${selectedDonationForView.familyId.headMemberId?.name || selectedDonationForView.familyId.familyCode}`
                        : (selectedDonationForView.donorId?.name || selectedDonationForView.donorName || 'General Contributor'))}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-semibold text-muted-foreground">Campaign / Purpose:</span>
                  <span className="font-bold text-emerald-600 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    {selectedDonationForView.campaign || selectedDonationForView.purpose || 'General Sadaqah'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-semibold text-muted-foreground">Status:</span>
                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-bold capitalize',
                    selectedDonationForView.status === 'paid' || !selectedDonationForView.status ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {selectedDonationForView.status === 'paid' || !selectedDonationForView.status ? 'Paid' : 'Pending'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-semibold text-muted-foreground">Date:</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedDonationForView.createdAt)}</span>
                </div>

                {selectedDonationForView.notes && (
                  <div className="flex justify-between items-start py-2 border-b border-border/50">
                    <span className="font-semibold text-muted-foreground">Notes:</span>
                    <span className="font-medium text-foreground text-right text-xs max-w-[220px]">
                      {selectedDonationForView.notes}
                    </span>
                  </div>
                )}

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-center text-white shadow-lg mt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100 mb-1">Donation Amount</p>
                  <p className="text-3xl font-extrabold">{formatCurrency(selectedDonationForView.amount || 0)}</p>
                </div>
              </div>

              <div className="p-4 border-t bg-muted/20 flex gap-3">
                <button
                  onClick={() => setSelectedDonationForView(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-bold text-xs hover:bg-muted transition-colors"
                >
                  Close
                </button>
                {(selectedDonationForView.status === 'paid' || !selectedDonationForView.status) && (
                  <button
                    onClick={() => handlePrintDonationReceipt(selectedDonationForView)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer size={14} />
                    Export Receipt
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
