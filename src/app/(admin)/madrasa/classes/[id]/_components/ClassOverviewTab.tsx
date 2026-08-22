'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Users,
  Edit,
  Phone,
  Mail,
  Plus,
  X,
  Search,
  CheckCircle,
  Loader2,
  Home,
  GraduationCap,
  Sparkles,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

export function ClassOverviewTab({
  classData,
  classId,
  refetch,
}: {
  classData: any;
  classId: string;
  refetch: () => void;
}) {
  const queryClient = useQueryClient();

  // Modals state
  const [isUsthadhModalOpen, setIsUsthadhModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalTab, setStudentModalTab] = useState<'family' | 'existing'>('family');

  // Teacher selection
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(classData?.teacherId?._id || '');

  // Family Student Selection
  const [familySearch, setFamilySearch] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [selectedFamilyMemberIds, setSelectedFamilyMemberIds] = useState<string[]>([]);

  // Existing Students Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExistingStudents, setSelectedExistingStudents] = useState<string[]>([]);

  // 1. Fetch Students currently enrolled in this class
  const { data: students, isLoading: isLoadingClassStudents } = useQuery({
    queryKey: ['class-students', classId],
    queryFn: () => apiClient.get(`/students?classId=${classId}&limit=200`).then((r) => r.data.data),
  });

  // 2. Fetch All Usthadhs / Teachers for Assignment
  const { data: teachersData } = useQuery({
    queryKey: ['all-teachers-list'],
    queryFn: () => apiClient.get('/teachers').then((r) => r.data.data || r.data || []),
  });
  const teachersList = Array.isArray(teachersData) ? teachersData : [];

  // 3. Fetch Families for "Add from Family" Tab
  const { data: familiesData, isLoading: isLoadingFamilies } = useQuery({
    queryKey: ['all-families-list'],
    queryFn: () => apiClient.get('/families', { params: { limit: 1000 } }).then((r) => r.data.data?.families || r.data.data || []),
    enabled: isStudentModalOpen,
  });
  const familiesList = Array.isArray(familiesData) ? familiesData : [];

  // Filtered families based on search
  const filteredFamilies = familiesList.filter((f: any) => {
    const query = familySearch.toLowerCase();
    const code = f.familyCode?.toLowerCase() || '';
    const headName = f.headMemberId?.name?.toLowerCase() || '';
    const houseName = f.address?.line1?.toLowerCase() || '';
    const ward = f.wardNo?.toLowerCase() || '';
    return code.includes(query) || headName.includes(query) || houseName.includes(query) || ward.includes(query);
  });

  const selectedFamily = familiesList.find((f: any) => f._id === selectedFamilyId);

  // 4. Fetch All Existing Students for "Existing Students" Tab
  const { data: allStudents } = useQuery({
    queryKey: ['all-students-unassigned'],
    queryFn: () => apiClient.get('/students?limit=1000').then((r) => r.data.data),
    enabled: isStudentModalOpen && studentModalTab === 'existing',
  });

  const availableExistingStudents =
    allStudents?.filter((s: any) => {
      const sClassId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
      return (
        sClassId !== classId &&
        (s.memberId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }) || [];

  // Mutation: Assign / Change Usthadh
  const updateTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => apiClient.put(`/classes/${classId}`, { teacherId: teacherId || null }),
    onSuccess: () => {
      toast.success('Class Usthadh updated successfully!');
      setIsUsthadhModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['madrasa-class', classId] });
      queryClient.invalidateQueries({ queryKey: ['madrasa-classes'] });
      refetch();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update Usthadh'),
  });

  // Mutation: Enrol New Students from Selected Family
  const enrolFromFamilyMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      if (!selectedFamily) return;
      const guardianId = selectedFamily.headMemberId?._id || selectedFamily.headMemberId;

      await Promise.all(
        memberIds.map((mId) =>
          apiClient.post('/students', {
            memberId: mId,
            classId,
            familyId: selectedFamily._id,
            guardianId,
            status: 'active',
          })
        )
      );
    },
    onSuccess: () => {
      toast.success('Enrolled family children into class successfully!');
      setIsStudentModalOpen(false);
      setSelectedFamilyId('');
      setSelectedFamilyMemberIds([]);
      queryClient.invalidateQueries({ queryKey: ['class-students', classId] });
      queryClient.invalidateQueries({ queryKey: ['all-students'] });
      refetch();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to enrol students from family'),
  });

  // Mutation: Assign Existing Students
  const assignExistingMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      await Promise.all(studentIds.map((id) => apiClient.put(`/students/${id}`, { classId })));
    },
    onSuccess: () => {
      toast.success('Assigned students to class successfully!');
      setIsStudentModalOpen(false);
      setSelectedExistingStudents([]);
      queryClient.invalidateQueries({ queryKey: ['class-students', classId] });
      queryClient.invalidateQueries({ queryKey: ['all-students'] });
      refetch();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to assign students'),
  });

  // Mutation: Remove Student from Class
  const removeStudentMutation = useMutation({
    mutationFn: (studentId: string) => apiClient.put(`/students/${studentId}`, { classId: null }),
    onSuccess: () => {
      toast.success('Student removed from this class');
      queryClient.invalidateQueries({ queryKey: ['class-students', classId] });
      refetch();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove student'),
  });

  return (
    <div className="space-y-8 relative">
      {/* Teacher / Usthadh Section */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Class Usthadh (ക്ലാസ് ഉസ്താദ്)</h2>
              <p className="text-xs text-muted-foreground">Assigned Madrasa teacher responsible for this class</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedTeacherId(classData?.teacherId?._id || '');
              setIsUsthadhModalOpen(true);
            }}
            className="text-xs px-3.5 py-2 font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition-all"
          >
            <Edit size={14} />
            {classData.teacherId ? 'Change Usthadh' : 'Assign Usthadh'}
          </button>
        </div>

        {classData.teacherId ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-extrabold shadow-sm shadow-emerald-600/30">
                {classData.teacherId.memberId?.name?.[0] || 'U'}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                  {classData.teacherId.memberId?.name || 'Usthadh'}
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full font-bold">
                    Class Teacher
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {classData.teacherId.qualification || 'Certified Madrasa Teacher'} • Employee ID: {classData.teacherId.employeeId || 'STAFF'}
                </p>

                <div className="flex flex-wrap gap-4 mt-2">
                  {classData.teacherId.memberId?.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <Phone size={12} className="text-emerald-600" /> {classData.teacherId.memberId.phone}
                    </div>
                  )}
                  {classData.teacherId.memberId?.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <Mail size={12} className="text-emerald-600" /> {classData.teacherId.memberId.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedTeacherId(classData?.teacherId?._id || '');
                setIsUsthadhModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold border border-border rounded-xl hover:bg-muted self-start sm:self-auto"
            >
              Reassign Teacher
            </button>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-dashed border-border bg-card text-center">
            <User size={36} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">No Usthadh assigned to this class yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Assign a teacher to take attendance and manage class activities</p>
            <button
              onClick={() => setIsUsthadhModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/30"
            >
              <Plus size={14} /> Assign Usthadh Now
            </button>
          </div>
        )}
      </div>

      {/* Enrolled Students Section */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Enrolled Students ({students?.length || 0})
              </h2>
              <p className="text-xs text-muted-foreground">Students registered in {classData.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setStudentModalTab('family');
                setIsStudentModalOpen(true);
              }}
              className="text-xs px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all"
            >
              <Home size={14} /> Add from Family (കുടുംബത്തിൽ നിന്ന്)
            </button>
            <button
              onClick={() => {
                setStudentModalTab('existing');
                setIsStudentModalOpen(true);
              }}
              className="text-xs px-3.5 py-2 border border-border rounded-xl font-bold hover:bg-muted flex items-center gap-1.5 transition-all"
            >
              <Users size={14} /> Existing Students
            </button>
          </div>
        </div>

        {isLoadingClassStudents ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl shimmer" />
            ))}
          </div>
        ) : students && students.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {students.map((student: any) => (
              <div
                key={student._id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-border hover:border-emerald-500/30 hover:bg-muted/20 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                    {student.memberId?.name?.[0] || 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-foreground truncate flex items-center gap-1.5">
                      {student.memberId?.name || 'Student'}
                      {student.gender && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({student.gender === 'male' ? 'M' : 'F'})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Adm: <span className="font-semibold text-foreground">{student.admissionNo}</span>
                      {student.familyId?.familyCode && (
                        <span> • Family: {student.familyId.familyCode}</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  title="Remove from class"
                  onClick={() => {
                    if (confirm(`Remove ${student.memberId?.name || 'this student'} from ${classData.name}?`)) {
                      removeStudentMutation.mutate(student._id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-2xl border border-dashed border-border bg-card text-center">
            <GraduationCap size={40} className="mx-auto mb-3 text-emerald-600/40" />
            <p className="text-sm font-extrabold text-foreground">No students enrolled in this class yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
              Add children from registered Mahallu families or assign existing students to this class.
            </p>
            <button
              onClick={() => {
                setStudentModalTab('family');
                setIsStudentModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-1.5 shadow-sm shadow-emerald-600/30"
            >
              <Home size={14} /> Add Students from Family Now
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ASSIGN USTHADH MODAL */}
      {/* ========================================================================= */}
      {isUsthadhModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">Assign Class Usthadh</h2>
                  <p className="text-xs text-muted-foreground">Select an Usthadh for {classData.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsUsthadhModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {teachersList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm">No teachers found in the system.</p>
                </div>
              ) : (
                teachersList.map((teacher: any) => {
                  const isSelected = selectedTeacherId === teacher._id;
                  return (
                    <div
                      key={teacher._id}
                      onClick={() => setSelectedTeacherId(teacher._id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                          {teacher.memberId?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-foreground">
                            {teacher.memberId?.name || 'Usthadh'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {teacher.qualification || 'Teacher'} • {teacher.memberId?.phone || 'No phone'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <CheckCircle size={15} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2.5 bg-muted/20">
              <button
                type="button"
                onClick={() => setIsUsthadhModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold border border-border rounded-xl hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateTeacherMutation.mutate(selectedTeacherId)}
                disabled={updateTeacherMutation.isPending}
                className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-600/30"
              >
                {updateTeacherMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Save Usthadh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD STUDENTS MODAL (FROM FAMILY / EXISTING) */}
      {/* ========================================================================= */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <div>
                <h2 className="text-base font-extrabold text-foreground">
                  Enrol Students into {classData.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select family members or assign existing students
                </p>
              </div>
              <button
                onClick={() => {
                  setIsStudentModalOpen(false);
                  setSelectedFamilyId('');
                  setSelectedFamilyMemberIds([]);
                  setSelectedExistingStudents([]);
                }}
                className="p-1.5 text-muted-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-border bg-muted/30 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setStudentModalTab('family')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  studentModalTab === 'family'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Home size={14} /> Add from Family (കുടുംബത്തിൽ നിന്ന്)
              </button>
              <button
                type="button"
                onClick={() => setStudentModalTab('existing')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  studentModalTab === 'existing'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users size={14} /> Select Existing Students
              </button>
            </div>

            {/* TAB 1: ADD FROM FAMILY */}
            {studentModalTab === 'family' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Family Search & Selector */}
                <div>
                  <label className="block text-xs font-extrabold text-foreground mb-1.5">
                    1. Select Mahallu Family (കുടുംബം തിരഞ്ഞെടുക്കുക) *
                  </label>
                  <div className="relative mb-2">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search family by Code, Head Name, House Name, Ward..."
                      value={familySearch}
                      onChange={(e) => setFamilySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Family Dropdown / Results */}
                  <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-muted/10">
                    {isLoadingFamilies ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Loading families...</div>
                    ) : filteredFamilies.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">No families found matching search.</div>
                    ) : (
                      filteredFamilies.slice(0, 15).map((fam: any) => {
                        const isChosen = selectedFamilyId === fam._id;
                        return (
                          <div
                            key={fam._id}
                            onClick={() => {
                              setSelectedFamilyId(fam._id);
                              setSelectedFamilyMemberIds([]);
                            }}
                            className={`p-3 text-xs cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors ${
                              isChosen ? 'bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200' : ''
                            }`}
                          >
                            <div>
                              <span className="font-extrabold text-foreground">{fam.familyCode}</span> •{' '}
                              <span className="font-semibold">{fam.headMemberId?.name || 'Family Head'}</span>
                              <p className="text-[11px] text-muted-foreground">
                                {fam.address?.line1 || 'House Name'} {fam.wardNo ? `(Ward ${fam.wardNo})` : ''}
                              </p>
                            </div>
                            {isChosen && <CheckCircle size={16} className="text-emerald-600" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Family Members / Children Selection */}
                {selectedFamily && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-foreground">
                        2. Select Children to Enrol ({selectedFamily.familyCode})
                      </label>
                      <span className="text-[11px] text-muted-foreground font-semibold">
                        {selectedFamilyMemberIds.length} children selected
                      </span>
                    </div>

                    <div className="space-y-2">
                      {selectedFamily.members?.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No members found in this family.</p>
                      ) : (
                        selectedFamily.members?.map((m: any) => {
                          const member = m.memberId || {};
                          const memberId = member._id || m.memberId;
                          const isSelected = selectedFamilyMemberIds.includes(memberId);

                          return (
                            <div
                              key={memberId}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedFamilyMemberIds((prev) => prev.filter((id) => id !== memberId));
                                } else {
                                  setSelectedFamilyMemberIds((prev) => [...prev, memberId]);
                                }
                              }}
                              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                                  : 'border-border hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold text-xs">
                                  {member.name?.[0] || 'M'}
                                </div>
                                <div>
                                  <p className="font-extrabold text-sm text-foreground">
                                    {member.name || 'Family Member'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Relation: <span className="font-semibold">{m.relationship || 'Child'}</span>
                                    {member.dob && ` • Age: ${new Date().getFullYear() - new Date(member.dob).getFullYear()} yrs`}
                                    {member.gender && ` • ${member.gender}`}
                                  </p>
                                </div>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-muted-foreground/30'
                                }`}
                              >
                                {isSelected && <CheckCircle size={13} />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SELECT EXISTING STUDENTS */}
            {studentModalTab === 'existing' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search existing students by name or admission no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableExistingStudents.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p className="text-xs">No available students found to assign.</p>
                    </div>
                  ) : (
                    availableExistingStudents.map((student: any) => {
                      const isSelected = selectedExistingStudents.includes(student._id);
                      return (
                        <div
                          key={student._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedExistingStudents((prev) => prev.filter((id) => id !== student._id));
                            } else {
                              setSelectedExistingStudents((prev) => [...prev, student._id]);
                            }
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                              : 'border-border hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold text-xs">
                              {student.memberId?.name?.[0] || 'S'}
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-foreground">
                                {student.memberId?.name || 'Student'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Adm: {student.admissionNo} • Current Class: {student.classId?.name || 'None'}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-muted-foreground/30'
                            }`}
                          >
                            {isSelected && <CheckCircle size={13} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
              <span className="text-xs font-bold text-muted-foreground">
                {studentModalTab === 'family'
                  ? `${selectedFamilyMemberIds.length} children selected`
                  : `${selectedExistingStudents.length} students selected`}
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold border border-border rounded-xl hover:bg-muted"
                >
                  Cancel
                </button>
                {studentModalTab === 'family' ? (
                  <button
                    type="button"
                    onClick={() => enrolFromFamilyMutation.mutate(selectedFamilyMemberIds)}
                    disabled={selectedFamilyMemberIds.length === 0 || enrolFromFamilyMutation.isPending}
                    className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-emerald-600/30"
                  >
                    {enrolFromFamilyMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Enrol Selected Children
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => assignExistingMutation.mutate(selectedExistingStudents)}
                    disabled={selectedExistingStudents.length === 0 || assignExistingMutation.isPending}
                    className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-emerald-600/30"
                  >
                    {assignExistingMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Assign to Class
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
