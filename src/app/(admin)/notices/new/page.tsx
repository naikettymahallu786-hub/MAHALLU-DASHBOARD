'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Save, ArrowLeft, Loader2, Languages, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { translateToMalayalam } from '@/lib/translate';

export default function NewNoticePage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch } = useForm<any>({
    defaultValues: { title: '', body: '', channel: 'whatsapp', status: 'pending' },
  });

  const [isTranslating, setIsTranslating] = useState(false);

  const titleValue = watch('title');
  const bodyValue = watch('body');

  const createMutation = useMutation<any, any, any>({
    mutationFn: (data) => apiClient.post('/notices', data),
    onSuccess: () => {
      toast.success('Notice published successfully!');
      router.push('/notices');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to publish notice'),
  });

  // Handle Full Form Translation to Malayalam
  const handleTranslateAll = async () => {
    if (!titleValue?.trim() && !bodyValue?.trim()) {
      toast.error('Please enter a title or message body first');
      return;
    }

    try {
      setIsTranslating(true);
      const [translatedTitle, translatedBody] = await Promise.all([
        titleValue?.trim() ? translateToMalayalam(titleValue) : Promise.resolve(''),
        bodyValue?.trim() ? translateToMalayalam(bodyValue) : Promise.resolve(''),
      ]);

      if (translatedTitle) setValue('title', translatedTitle);
      if (translatedBody) setValue('body', translatedBody);

      toast.success('Converted title and description to Malayalam! (മലയാളത്തിലേക്ക് മാറ്റി)');
    } catch (error) {
      toast.error('Failed to translate text. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle Individual Field Translation
  const handleTranslateField = async (field: 'title' | 'body') => {
    const val = field === 'title' ? titleValue : bodyValue;
    if (!val?.trim()) {
      toast.error(`Please enter text in ${field} first`);
      return;
    }

    try {
      setIsTranslating(true);
      const translated = await translateToMalayalam(val);
      setValue(field, translated);
      toast.success(`Converted ${field} to Malayalam!`);
    } catch (error) {
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/notices">
            <button className="p-2 rounded-xl border hover:bg-muted transition-colors">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 className="page-title text-xl">Publish Announcement</h1>
            <p className="page-subtitle font-medium">Broadcast notices to members</p>
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

      <div className="section-card shadow-sm border border-border">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Notice Title *</label>
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
                placeholder="e.g. Prayer Time Change / ജമാഅത്ത് സമയമാറ്റം"
                className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Message Body *</label>
                <button
                  type="button"
                  onClick={() => handleTranslateField('body')}
                  disabled={isTranslating}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1"
                >
                  <Sparkles size={11} /> Translate to Malayalam
                </button>
              </div>
              <textarea
                {...register('body', { required: true })}
                rows={4}
                placeholder="Type announcement description in English or Manglish..."
                className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Broadcast Channel *</label>
              <select
                {...register('channel', { required: true })}
                className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm font-medium"
              >
                <option value="whatsapp">WhatsApp Bot & Group</option>
                <option value="push">Mobile App Push Notification</option>
                <option value="sms">Carrier SMS</option>
                <option value="email">SMTP Email</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link href="/notices">
              <button type="button" className="px-5 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors">
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Send Notice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
