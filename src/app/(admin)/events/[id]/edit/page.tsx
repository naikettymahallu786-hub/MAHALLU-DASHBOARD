'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save, ArrowLeft, Loader2, Plus, Trash2, Image as ImageIcon, Languages, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { translateToMalayalam } from '@/lib/translate';

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams();

  const { data: event, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', id],
    queryFn: () => apiClient.get(`/events/${id}`).then(r => r.data.data),
  });

  const { register, control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      title: '', description: '', date: '', endDate: '', venue: '',
      capacity: '', fee: '', isPaid: false, isFeatured: false,
      committeeMembers: [{ memberId: '', role: '' }]
    }
  });

  const [isTranslating, setIsTranslating] = useState(false);

  const titleVal = watch('title');
  const descVal = watch('description');
  const venueVal = watch('venue');

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

  useEffect(() => {
    if (event) {
      // Format dates for input type datetime-local (YYYY-MM-DDThh:mm)
      const formatDateForInput = (d: string) => {
        if (!d) return '';
        const date = new Date(d);
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      };

      const committee = event.committeeMembers?.map((cm: any) => ({
        memberId: cm.memberId?._id || cm.memberId,
        role: cm.role
      })) || [];

      reset({
        ...event,
        date: formatDateForInput(event.date),
        endDate: formatDateForInput(event.endDate),
        committeeMembers: committee.length > 0 ? committee : [{ memberId: '', role: '' }]
      });
    }
  }, [event, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "committeeMembers"
  });

  const { data: membersData } = useQuery({ 
    queryKey: ['all-members-list'], 
    queryFn: () => apiClient.get('/members', { params: { limit: 5000 } }).then(r => r.data.data || []) 
  });
  const members = Array.isArray(membersData) ? membersData : (membersData as any)?.items || [];

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.put(`/events/${id}`, data),
    onSuccess: () => {
      toast.success('Event updated successfully!');
      router.push(`/events/${id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update event')
  });

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data };
      
      // Clean up committee members (remove empty ones)
      payload.committeeMembers = payload.committeeMembers.filter(
        (m: any) => m.memberId && m.role
      );

      if (bannerFile) {
        const base64 = await toBase64(bannerFile);
        payload.banner = { url: base64 };
      }
      
      if (bgFile) {
        const base64 = await toBase64(bgFile);
        payload.idCardBgImage = { url: base64 };
      }

      updateMutation.mutate(payload);
    } catch (e) {
      toast.error('Failed to process image uploads');
    }
  };

  if (isLoadingEvent) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-emerald-600" size={40}/></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/events/${id}`}><button className="p-2 rounded-xl border hover:bg-muted transition-colors"><ArrowLeft size={16} /></button></Link>
          <div>
            <h1 className="page-title text-xl">Edit Event</h1>
            <p className="page-subtitle font-medium">Update program details</p>
          </div>
        </div>

        {/* Global Translate Button */}
        <button
          type="button"
          onClick={handleTranslateAll}
          disabled={isTranslating}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all shadow-sm"
        >
          {isTranslating ? (
            <Loader2 size={14} className="animate-spin text-emerald-600" />
          ) : (
            <Languages size={14} className="text-emerald-600 dark:text-emerald-400" />
          )}
          <span>Change to Malayalam (മലയാളത്തിലേക്ക്)</span>
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Details */}
        <div className="section-card space-y-4">
          <h2 className="font-bold text-lg border-b pb-2 mb-4">Event Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
              <input type="text" {...register('title', { required: true })} className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium" />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Description</label>
                <button
                  type="button"
                  onClick={() => handleTranslateField('description')}
                  disabled={isTranslating}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"
                >
                  <Sparkles size={11} /> Translate to Malayalam
                </button>
              </div>
              <textarea {...register('description')} rows={3} className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium leading-relaxed" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Date *</label>
              <input type="datetime-local" {...register('date', { required: true })} className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End Date (Optional)</label>
              <input type="datetime-local" {...register('endDate')} className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Venue *</label>
                <button
                  type="button"
                  onClick={() => handleTranslateField('venue')}
                  disabled={isTranslating}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"
                >
                  <Sparkles size={11} /> Translate
                </button>
              </div>
              <input type="text" {...register('venue', { required: true })} className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Total capacity</label>
              <input type="number" {...register('capacity', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm" />
            </div>
          </div>
        </div>

        {/* Media Uploads */}
        <div className="section-card space-y-4">
          <h2 className="font-bold text-lg border-b pb-2 mb-4">Media & ID Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
              <ImageIcon size={32} className="text-muted-foreground" />
              <label className="text-sm font-semibold cursor-pointer text-brand hover:underline">
                Upload New Banner
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
              </label>
              <p className="text-xs text-muted-foreground">{bannerFile ? bannerFile.name : (event?.banner?.url ? 'Replaces existing banner' : 'Optional display banner')}</p>
            </div>
            
            <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
              <ImageIcon size={32} className="text-muted-foreground" />
              <label className="text-sm font-semibold cursor-pointer text-indigo-600 hover:underline">
                Upload New ID Card BG
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] || null)} />
              </label>
              <p className="text-xs text-muted-foreground">{bgFile ? bgFile.name : (event?.idCardBgImage?.url ? 'Replaces existing ID bg' : 'Used for volunteer ID cards')}</p>
            </div>
          </div>
        </div>

        {/* Committee Members */}
        <div className="section-card space-y-4">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h2 className="font-bold text-lg">Event Committee</h2>
            <button type="button" onClick={() => append({ memberId: '', role: '' })} className="text-xs font-semibold text-brand flex items-center gap-1 hover:underline">
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
                          options={members?.map((m: any) => ({
                            value: m._id,
                            label: `${m.name} ${m.memberId ? `(${m.memberId})` : ''} ${m.phone ? `- 📞 ${m.phone}` : ''}`
                          })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="-- Search & Choose Member --"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Assigned Role</label>
                    <input type="text" {...register(`committeeMembers.${index}.role`)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
                  </div>
                </div>
                <button type="button" onClick={() => remove(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-6">
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
          <Link href={`/events/${id}`}><button type="button" className="px-5 py-3 rounded-xl border text-sm font-semibold shadow-sm">Cancel</button></Link>
          <button type="submit" disabled={updateMutation.isPending} className="btn-brand flex items-center gap-2 shadow-lg shadow-emerald-500/20 px-6 py-3">
            {updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
