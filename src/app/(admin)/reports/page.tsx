'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  FileText,
  Users,
  GraduationCap,
  DollarSign,
  Heart,
  Award,
  Calendar,
  Skull,
  Zap,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: 'all', label: 'All Years / All Time' },
  { value: String(CURRENT_YEAR), label: `Year ${CURRENT_YEAR}` },
  { value: String(CURRENT_YEAR - 1), label: `Year ${CURRENT_YEAR - 1}` },
  { value: String(CURRENT_YEAR - 2), label: `Year ${CURRENT_YEAR - 2}` },
];

const MONTH_NAMES = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const CATEGORIES = [
  { id: 'nikah', label: 'Nikah Marriages', icon: Heart, color: '#e11d48', endpoint: '/reports/export/nikah', key: 'nikahTab' },
  { id: 'certificates', label: 'Certificates', icon: Award, color: '#0284c7', endpoint: '/reports/export/certificates', key: 'certificatesTab' },
  { id: 'events', label: 'Events & Programs', icon: Calendar, color: '#7c3aed', endpoint: '/reports/export/events', key: 'eventsTab' },
  { id: 'death', label: 'Death & Burial', icon: Skull, color: '#64748b', endpoint: '/reports/export/death', key: 'deathTab' },
  { id: 'members', label: 'Member Census', icon: Users, color: '#3b82f6', endpoint: '/reports/export/members', key: 'membersTab' },
  { id: 'academic', label: 'Madrasa Academic', icon: GraduationCap, color: '#8b5cf6', endpoint: '/reports/export/academic', key: 'academicTab' },
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('nikah');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const activeCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0];

  const queryParams: Record<string, any> = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    format: 'json',
  };

  if (startDate) queryParams.startDate = startDate;
  if (endDate) queryParams.endDate = endDate;
  if (!startDate && !endDate) {
    if (selectedYear && selectedYear !== 'all') queryParams.year = selectedYear;
    if (selectedMonth && selectedMonth !== 'all') queryParams.month = selectedMonth;
  }

  const { data: reportRecords, isLoading, refetch } = useQuery({
    queryKey: ['filtered-report', activeTab, queryParams],
    queryFn: () =>
      apiClient.get(activeCategory.endpoint, { params: queryParams }).then((r) => r.data.data || []),
  });

  const records = Array.isArray(reportRecords) ? reportRecords : [];

  const handleResetFilters = () => {
    setSearch('');
    setStatus('all');
    setSelectedMonth('all');
    setSelectedYear('all');
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadCSV = async () => {
    try {
      setIsDownloading(true);
      const downloadParams = { ...queryParams, format: 'csv' };

      const response = await apiClient.get(activeCategory.endpoint, {
        params: downloadParams,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${activeCategory.label} report exported successfully.`);
    } catch (err) {
      toast.error('Failed to export report CSV');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="h-4 w-4" />
            {t('master_reports_page.title')}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t('master_reports_page.title')}</h1>
          <p className="text-emerald-100/80 text-sm mt-1">
            {t('master_reports_page.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/finance/reports"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-md transition-all shrink-0"
          >
            <DollarSign className="h-4 w-4" />
            {t('finance_reports_page.title')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          const translatedLabel = t(`master_reports_page.${cat.key || 'nikahTab'}`);
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id);
                handleResetFilters();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" style={{ color: isActive ? 'inherit' : cat.color }} />
              {translatedLabel && translatedLabel !== `master_reports_page.${cat.key}` ? translatedLabel : cat.label}
            </button>
          );
        })}
      </div>

      {/* Filter Control Section */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <Filter className="h-4 w-4 text-emerald-600" />
            {t('sadaqah_page.searchPlaceholder')}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t('sadaqah_page.allTime')}
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? '...' : t('master_reports_page.exportExcel')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Search */}
          <div className="relative">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Name, Phone, Reg #, Title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Status Filter</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved / Issued</option>
              <option value="distributed">Distributed</option>
              <option value="rejected">Rejected / Revoked</option>
            </select>
          </div>

          {/* Year Distance */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {YEAR_OPTIONS.map((yr) => (
                <option key={yr.value} value={yr.value}>
                  {yr.label}
                </option>
              ))}
            </select>
          </div>

          {/* Month Distance */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Custom Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Custom End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Filtered Data Preview Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-foreground">{activeCategory.label} Report Data</h2>
            <p className="text-xs text-muted-foreground">Showing {records.length} records matching your filter settings</p>
          </div>
          <button onClick={() => refetch()} className="p-2 text-muted-foreground hover:text-foreground rounded-xl border border-border">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-emerald-600" />
            Loading filtered report data...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-foreground text-base">No matching report records found</h3>
            <p className="text-xs text-muted-foreground mt-1">Try resetting or adjusting your search/date filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Dynamic Table Render per Active Tab */}
            {activeTab === 'nikah' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Reg #</th>
                    <th className="px-6 py-4">Nikah Date</th>
                    <th className="px-6 py-4">Groom</th>
                    <th className="px-6 py-4">Bride</th>
                    <th className="px-6 py-4">Mehr</th>
                    <th className="px-6 py-4">Officiator</th>
                    <th className="px-6 py-4">Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((n: any) => (
                    <tr key={n._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-bold text-emerald-600">{n.nikahNo}</td>
                      <td className="px-6 py-4 font-semibold">{formatDate(n.date)}</td>
                      <td className="px-6 py-4"><div className="font-bold">{n.groomName || n.groomId?.name}</div><div className="text-xs text-muted-foreground">{n.groomId?.phone}</div></td>
                      <td className="px-6 py-4"><div className="font-bold">{n.brideName || n.brideId?.name}</div><div className="text-xs text-muted-foreground">{n.brideId?.phone}</div></td>
                      <td className="px-6 py-4 font-bold">{formatCurrency(n.mehr)}</td>
                      <td className="px-6 py-4 text-xs font-semibold">{n.imamId?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{n.venue || 'Mahallu Mosque'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'certificates' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Certificate #</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Issued Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((c: any) => (
                    <tr key={c._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-bold text-emerald-600">{c.certificateNo}</td>
                      <td className="px-6 py-4 capitalize font-semibold">{c.type?.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4"><div className="font-bold">{c.recipientId?.name || 'N/A'}</div><div className="text-xs text-muted-foreground">{c.recipientId?.phone}</div></td>
                      <td className="px-6 py-4 text-xs">{formatDate(c.issuedAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.isRevoked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {c.isRevoked ? 'Revoked' : 'Active / Issued'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'events' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Event Title</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Venue</th>
                    <th className="px-6 py-4">Fee</th>
                    <th className="px-6 py-4">Registrations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((ev: any) => (
                    <tr key={ev._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-bold">{ev.title}</td>
                      <td className="px-6 py-4 font-semibold">{formatDate(ev.date)}</td>
                      <td className="px-6 py-4 text-xs">{ev.venue || 'Main Hall'}</td>
                      <td className="px-6 py-4 font-bold">{ev.isPaid ? formatCurrency(ev.fee) : 'Free'}</td>
                      <td className="px-6 py-4 font-semibold">{ev.registrations?.length || 0} registered</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'death' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Deceased Name</th>
                    <th className="px-6 py-4">Date of Death</th>
                    <th className="px-6 py-4">Cause</th>
                    <th className="px-6 py-4">Burial Place</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((d: any) => (
                    <tr key={d._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4"><div className="font-bold">{d.memberId?.name || 'N/A'}</div><div className="text-xs text-muted-foreground">{d.memberId?.phone}</div></td>
                      <td className="px-6 py-4 font-semibold">{formatDate(d.dateOfDeath)}</td>
                      <td className="px-6 py-4 text-xs">{d.causeOfDeath || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-semibold">{d.burialPlace || 'Mahallu Ground'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'members' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Member Name</th>
                    <th className="px-6 py-4">Member ID</th>
                    <th className="px-6 py-4">Family / Ward</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Gender</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((m: any) => (
                    <tr key={m._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-bold text-foreground">{m.name}</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">{m.memberId || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-semibold">
                        {m.familyId?.familyCode ? `${m.familyId.familyCode} (Ward ${m.familyId.wardNo || 'N/A'})` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{m.phone || 'N/A'}</td>
                      <td className="px-6 py-4 capitalize text-xs">{m.gender || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                          {m.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'academic' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Admission #</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Guardian</th>
                    <th className="px-6 py-4">Guardian Phone</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((s: any) => (
                    <tr key={s._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-bold text-foreground">{s.memberId?.name || s.name}</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">{s.admissionNo || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-semibold">{s.classId?.name || s.standard || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-semibold">{s.guardianId?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{s.guardianId?.phone || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                          {s.status || 'Enrolled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
