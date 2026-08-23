'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useRouter, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Loader2, BookOpen, User, Home, GraduationCap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function NewClassPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const isMadrasaPortal = pathname.startsWith('/madrasa-portal');
  const backUrl = isMadrasaPortal ? '/madrasa-portal/classes' : '/madrasa/classes';

  const { register, handleSubmit, control } = useForm({
    defaultValues: {
      name: '',
      level: 1,
      academicYear: '2026-2027',
      teacherId: '',
      subjects: 'Quran, Fiqh, Aqeedah, Akhlaq, Arabic, Thareekh',
    },
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => apiClient.get('/teachers').then((r) => r.data),
  });

  const { data: membersData } = useQuery({
    queryKey: ['members-for-usthadh'],
    queryFn: () => apiClient.get('/members', { params: { limit: 2000 } }).then((r) => r.data.data || []),
  });

  const teachersList = Array.isArray(teachersData?.data)
    ? teachersData.data
    : Array.isArray(teachersData)
    ? teachersData
    : [];

  const membersList = Array.isArray(membersData) ? membersData : membersData?.items || [];

  // Build combined options list
  const teacherOptions = [
    ...teachersList.map((t: any) => ({
      value: t._id,
      label: `Usthadh: ${t.memberId?.name || t.name || 'Teacher'} (${t.qualification || 'Teacher'}${t.memberId?.phone ? ` • ${t.memberId.phone}` : ''})`,
    })),
    ...membersList
      .filter((m: any) => !teachersList.some((t: any) => (t.memberId?._id || t.memberId) === m._id))
      .map((m: any) => ({
        value: `member_${m._id}`,
        label: `Member: ${m.name} (${m.phone || 'Mahallu Member'})`,
      })),
  ];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      let teacherId = data.teacherId;
      if (teacherId && teacherId.startsWith('member_')) {
        const actualMemberId = teacherId.replace('member_', '');
        const newTeacherRes = await apiClient.post('/teachers', {
          memberId: actualMemberId,
          qualification: 'Usthadh / Teacher',
          salary: 0,
        });
        teacherId = newTeacherRes.data?.data?._id;
      }
      return apiClient.post('/classes', { ...data, teacherId: teacherId || undefined });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['madrasa-classes'] });
      const newClassId = res.data?.data?._id;
      toast.success('Madrasa class created successfully! (ക്ലാസ് വിജയകരമായി ചേർത്തു)');
      if (newClassId) {
        router.push(isMadrasaPortal ? `/madrasa-portal/classes/${newClassId}` : `/madrasa/classes/${newClassId}`);
      } else {
        router.push(backUrl);
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create class'),
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-3">
        <Link href={backUrl}>
          <button className="p-2 rounded-xl border hover:bg-muted transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div>
          <h1 className="page-title text-xl">Create Madrasa Class (ക്ലാസ് നിർമ്മിക്കുക)</h1>
          <p className="page-subtitle font-medium">Create a new class, set academic grade, and assign Usthadh</p>
        </div>
      </div>

      <div className="section-card border border-border shadow-sm">
        <form
          onSubmit={handleSubmit((d) => {
            const formattedData: any = { ...d };
            if (typeof d.subjects === 'string' && d.subjects.trim()) {
              formattedData.subjects = d.subjects.split(',').map((s: string) => s.trim());
            } else {
              formattedData.subjects = [];
            }
            if (!formattedData.teacherId) delete formattedData.teacherId;
            createMutation.mutate(formattedData);
          })}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">Class Name (ക്ലാസിന്റെ പേര്) *</label>
              <input
                type="text"
                {...register('name', { required: true })}
                placeholder="e.g. Class 1 A / ഒന്നാം ക്ലാസ്"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Academic Level (1-12) *</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  {...register('level', { required: true, valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Academic Year *</label>
                <input
                  type="text"
                  {...register('academicYear', { required: true })}
                  placeholder="2026-2027"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">
                Assign Class Usthadh (ക്ലാസ് ഉസ്താദ്)
              </label>
              <Controller
                control={control}
                name="teacherId"
                render={({ field }) => (
                  <SearchableSelect
                    options={teacherOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="-- Select Class Usthadh (ഉസ്താദിനെ തിരഞ്ഞെടുക്കുക) --"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">Subjects Taught (വിഷയങ്ങൾ)</label>
              <input
                type="text"
                {...register('subjects')}
                placeholder="Quran, Fiqh, Aqeedah, Akhlaq, Arabic, Thareekh"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Separate subject names with commas</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
            <Home className="text-emerald-700 dark:text-emerald-400 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Enrolling Students</p>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                After creating this class, you can immediately select families and enrol children with one click!
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link href={backUrl}>
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-brand flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold shadow-sm shadow-emerald-600/30"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Create Class & Add Students
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
