'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Loader2, Plus, Trash2, Image as ImageIcon, Sparkles, FileText, CheckCircle2, Languages } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { translateToMalayalam } from '@/lib/translate';

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export default function NewEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get('templateId');

  const [selectedTemplateId, setSelectedTemplateId] = useState(templateIdParam || '');
  const [eventSessions, setEventSessions] = useState<any[]>([]);

  const { register, control, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      title: '',
      description: '',
      date: '',
      endDate: '',
      venue: '',
      capacity: '',
      fee: '',
      isPaid: false,
      isFeatured: false,
      committeeMembers: [{ memberId: '', role: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'committeeMembers',
  });

  // Fetch Event Templates
  const { data: templatesData } = useQuery({
    queryKey: ['event-templates'],
    queryFn: () => apiClient.get('/event-templates').then((r) => r.data.data || []),
  });
  const templates = templatesData || [];

  const activeTemplate = templates.find((t: any) => t._id === selectedTemplateId);

  // Auto-fill form and program sessions when template is selected
  useEffect(() => {
    if (activeTemplate) {
      if (activeTemplate.name) setValue('title', activeTemplate.name);
      if (activeTemplate.venue) setValue('venue', activeTemplate.venue);
      if (activeTemplate.noticeTemplateText || activeTemplate.description) {
        setValue('description', activeTemplate.noticeTemplateText || activeTemplate.description);
      }

      if (Array.isArray(activeTemplate.programSchedule) && activeTemplate.programSchedule.length > 0) {
        setEventSessions(JSON.parse(JSON.stringify(activeTemplate.programSchedule)));
      } else {
        setEventSessions([]);
      }
    }
  }, [selectedTemplateId, activeTemplate, setValue]);

  const { data: membersData } = useQuery({
    queryKey: ['all-members-list'],
    queryFn: () => apiClient.get('/members', { params: { limit: 5000 } }).then((r) => r.data.data || []),
  });
  const members = Array.isArray(membersData) ? membersData : (membersData as any)?.items || [];

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Community event created successfully!');
      router.push('/events');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create event'),
  });

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data };
      if (bannerFile) {
        payload.banner = { url: await toBase64(bannerFile) };
      } else if (activeTemplate?.bannerUrl) {
        payload.banner = { url: activeTemplate.bannerUrl };
      }

      if (bgFile) {
        payload.idCardBgImage = { url: await toBase64(bgFile) };
      }

      // Include all customized program sessions from editor
      payload.programSchedule = eventSessions;

      payload.committeeMembers = payload.committeeMembers.filter((cm: any) => cm.memberId && cm.role);

      createMutation.mutate(payload);
    } catch (e) {
      toast.error('Failed to process image uploads');
    }
  };

  const [isTranslating, setIsTranslating] = useState(false);

  const titleVal = watch('title');
  const descVal = watch('description');
  const venueVal = watch('venue');

  // Handle Global Translation for all text fields
  const handleTranslateAll = async () => {
    if (!titleVal?.trim() && !descVal?.trim() && !venueVal?.trim()) {
      toast.error('Please enter title, description, or venue first');
      return;
    }

    try {
      setIsTranslating(true);
      const [transTitle, transDesc, transVenue] = await Promise.all([
        titleVal?.trim() ? translateToMalayalam(titleVal) : Promise.resolve(''),
        descVal?.trim() ? translateToMalayalam(descVal) : Promise.resolve(''),
        venueVal?.trim() ? translateToMalayalam(venueVal) : Promise.resolve(''),
      ]);

      if (transTitle) setValue('title', transTitle);
      if (transDesc) setValue('description', transDesc);
      if (transVenue) setValue('venue', transVenue);

      toast.success('Converted event details to Malayalam! (മലയാളത്തിലേക്ക് മാറ്റി)');
    } catch (e) {
      toast.error('Translation failed. Please check network connection.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle Individual Field Translation
  const handleTranslateField = async (field: 'title' | 'description' | 'venue') => {
    const val = field === 'title' ? titleVal : field === 'description' ? descVal : venueVal;
    if (!val?.trim()) {
      toast.error(`Please enter text in ${field} first`);
      return;
    }

    try {
      setIsTranslating(true);
      const translated = await translateToMalayalam(val);
      setValue(field, translated);
      toast.success(`Converted ${field} to Malayalam!`);
    } catch (e) {
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/events" className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="page-title">Create Community Event</h1>
            <p className="page-subtitle">Schedule a new program, gathering, or Islamic conference notice</p>
          </div>
        </div>

        {/* Global Translate to Malayalam Button */}
        <button
          type="button"
          onClick={handleTranslateAll}
          disabled={isTranslating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all shadow-sm self-start sm:self-auto"
        >
          {isTranslating ? (
            <Loader2 size={15} className="animate-spin text-emerald-600" />
          ) : (
            <Languages size={15} className="text-emerald-600 dark:text-emerald-400" />
          )}
          <span>Change to Malayalam (മലയാളത്തിലേക്ക് മാറ്റുക)</span>
        </button>
      </div>

      {/* Template Preset Selector Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-6 rounded-3xl text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="font-extrabold text-base text-white">⚡ Apply Event Preset Template (ടെംപ്ലേറ്റുകൾ)</h2>
          </div>
          <Link href="/events/templates" className="text-xs text-emerald-300 hover:underline font-bold">
            + Manage / Create New Templates
          </Link>
        </div>

        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <option value="">-- Start from Scratch (No Template) --</option>
          {templates.map((t: any) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.category}) - {t.programSchedule?.length || 0} Sessions
            </option>
          ))}
        </select>

        {activeTemplate && (
          <div className="bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/10">
            <div>
              <span className="text-xs font-black text-emerald-300 uppercase block">
                ✓ Template Applied: {activeTemplate.name}
              </span>
              <span className="text-[11px] text-slate-300">
                All sessions, speakers, notice text, and venue have been pre-filled below for you to edit.
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-3 py-1 rounded-full">
              {eventSessions.length} Sessions Loaded
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="section-card space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Event Details & Notice</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Event Title *</label>
                <button
                  type="button"
                  onClick={() => handleTranslateField('title')}
                  disabled={isTranslating}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"
                >
                  <Sparkles size={11} /> Translate to Malayalam
                </button>
              </div>
              <input
                type="text"
                {...register('title', { required: true })}
                placeholder="e.g. Annual Meelad Conference 2026 / വാർഷിക മീലാദ് സമ്മേളനം"
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Description / Program Notice Text</label>
                <button
                  type="button"
                  onClick={() => handleTranslateField('description')}
                  disabled={isTranslating}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"
                >
                  <Sparkles size={11} /> Translate to Malayalam
                </button>
              </div>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Provide event details, schedule, or notice description in English or Manglish..."
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium font-sans leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  {...register('date', { required: true })}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">End Date & Time</label>
                <input
                  type="datetime-local"
                  {...register('endDate')}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium">Venue Location</label>
                  <button
                    type="button"
                    onClick={() => handleTranslateField('venue')}
                    disabled={isTranslating}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"
                  >
                    <Sparkles size={11} /> Translate
                  </button>
                </div>
                <input
                  type="text"
                  {...register('venue')}
                  placeholder="e.g. Mahallu Auditorium / മഹല്ല് ഓഡിറ്റോറിയം"
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Capacity (Max Attendees)</label>
                <input
                  type="number"
                  {...register('capacity')}
                  placeholder="e.g. 500 (leave blank for unlimited)"
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Day Program Sessions Schedule Builder */}
        <div className="section-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
            <div>
              <h2 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Program Sessions & Speakers Schedule (പ്രോഗ്രാം സെഷനുകൾ)
              </h2>
              <p className="text-xs text-muted-foreground">
                Loaded from template. You can add, edit, or customize session days, times, and speakers.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEventSessions([
                  ...eventSessions,
                  {
                    dayNumber: eventSessions.length + 1,
                    dateText: '',
                    sessionTime: '',
                    sessionTitle: '',
                    president: '',
                    inaugurator: '',
                    keynoteSpeaker: '',
                    chiefGuests: '',
                    voteOfThanks: '',
                  },
                ])
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 self-start sm:self-auto cursor-pointer"
            >
              <Plus size={14} /> + Add Program Session
            </button>
          </div>

          <div className="space-y-4">
            {eventSessions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-muted/20 border-2 border-dashed border-border/70 text-center space-y-2">
                <p className="text-xs font-bold text-muted-foreground">
                  No program sessions added yet.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Click &quot;+ Add Program Session&quot; above to specify conference days, speakers, and timings.
                </p>
              </div>
            ) : (
              eventSessions.map((session, idx) => (
                <div
                  key={idx}
                  className="bg-card border-2 border-emerald-500/20 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                        {session.dayNumber || idx + 1}
                      </span>
                      <span className="font-extrabold text-xs text-foreground">
                        Session {idx + 1} (സെഷൻ വിവരങ്ങൾ)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEventSessions(eventSessions.filter((_, i) => i !== idx))}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Date / Day Text (ദിനം / തീയതി)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 30 ഏപ്രിൽ / Day 1"
                        value={session.dateText || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].dateText = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Session Time (സമയം)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 8.00 PM"
                        value={session.sessionTime || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].sessionTime = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Session Title * (ശീർഷകം)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. മത പ്രഭാഷണം / സമാപന സമ്മേളനം"
                        value={session.sessionTitle || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].sessionTitle = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs font-extrabold text-emerald-800 dark:text-emerald-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        President (അധ്യക്ഷൻ)
                      </label>
                      <input
                        type="text"
                        placeholder="അധ്യക്ഷന്റെ പേര്"
                        value={session.president || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].president = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Inauguration (ഉദ്ഘാടനം)
                      </label>
                      <input
                        type="text"
                        placeholder="ഉദ്ഘാടകന്റെ പേര്"
                        value={session.inaugurator || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].inaugurator = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Keynote Speaker (പ്രഭാഷകൻ)
                      </label>
                      <input
                        type="text"
                        placeholder="പ്രഭാഷകന്റെ പേര്"
                        value={session.keynoteSpeaker || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].keynoteSpeaker = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Chief Guests (വിശിഷ്ട അതിഥികൾ)
                      </label>
                      <input
                        type="text"
                        placeholder="അതിഥികളുടെ പേരുകൾ"
                        value={session.chiefGuests || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].chiefGuests = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        Vote of Thanks (നന്ദി)
                      </label>
                      <input
                        type="text"
                        placeholder="നന്ദി രേഖപ്പെടുത്തുന്ന വ്യക്തി"
                        value={session.voteOfThanks || ''}
                        onChange={(e) => {
                          const updated = [...eventSessions];
                          updated[idx].voteOfThanks = e.target.value;
                          setEventSessions(updated);
                        }}
                        className="w-full px-3 py-2 bg-background border rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pricing & Visibility */}
        <div className="section-card space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Ticket & Visibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-muted/20">
              <input type="checkbox" id="isPaid" {...register('isPaid')} className="w-4 h-4 text-emerald-600 rounded" />
              <label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">
                Paid Event (Requires Registration Fee)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Ticket Fee (INR)</label>
              <input
                type="number"
                {...register('fee')}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Branding & ID Card Images */}
        <div className="section-card space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Branding & Committee ID Card Design</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Banner Image */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase">Event Banner Image</label>
              <div className="border-2 border-dashed border-border hover:border-emerald-500/50 rounded-2xl p-4 text-center transition-colors">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  className="text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-100"
                />
                {bannerFile && <p className="text-xs text-emerald-600 font-bold mt-2">Selected: {bannerFile.name}</p>}
              </div>
            </div>

            {/* Committee ID Card Background Image */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase">
                Committee ID Card Background Image
              </label>
              <div className="border-2 border-dashed border-border hover:border-emerald-500/50 rounded-2xl p-4 text-center transition-colors">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBgFile(e.target.files?.[0] || null)}
                  className="text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-100"
                />
                {bgFile && <p className="text-xs text-emerald-600 font-bold mt-2">Selected: {bgFile.name}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Committee Members */}
        <div className="section-card space-y-4">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h2 className="font-bold text-lg">Event Committee</h2>
            <button
              type="button"
              onClick={() => append({ memberId: '', role: '' })}
              className="text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Add Member
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Select Member</label>
                    <Controller
                      control={control}
                      name={`committeeMembers.${index}.memberId`}
                      render={({ field }) => (
                        <SearchableSelect
                          options={
                            members?.map((m: any) => ({
                              value: m._id,
                              label: `${m.name} ${m.memberId ? `(${m.memberId})` : ''} ${
                                m.phone ? `- 📞 ${m.phone}` : ''
                              }`,
                            })) || []
                          }
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="-- Search & Choose Member --"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Assigned Role</label>
                    <input
                      type="text"
                      {...register(`committeeMembers.${index}.role`)}
                      placeholder="e.g. Volunteer, Coordinator, Speaker"
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-6"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No committee members added.</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/events">
            <button type="button" className="px-5 py-3 rounded-xl border text-sm font-semibold shadow-sm">
              Cancel
            </button>
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-brand flex items-center gap-2 shadow-lg shadow-emerald-500/20 px-6 py-3 cursor-pointer"
          >
            {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Create Event
          </button>
        </div>
      </form>
    </div>
  );
}
