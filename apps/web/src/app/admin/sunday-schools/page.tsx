'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Church,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  MapPin,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  SlidersHorizontal,
  RotateCcw,
  Building2,
} from 'lucide-react';
import AdminShell from '../AdminShell';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type { ParishDto, CreateParishInput } from '@eotc/shared';

export default function SundaySchoolsManagementPage() {
  const { lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parishes, setParishes] = useState<ParishDto[]>([]);
  const [dioceses, setDioceses] = useState<string[]>([]);
  const [subCities, setSubCities] = useState<{ subCity: string; diocese: string }[]>([]);

  // View mode: 'table' or 'grid' (cards)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedDiocese, setSelectedDiocese] = useState('');
  const [selectedSubCity, setSelectedSubCity] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParish, setEditingParish] = useState<ParishDto | null>(null);
  const [deleteConfirmParish, setDeleteConfirmParish] = useState<ParishDto | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formAmharicName, setFormAmharicName] = useState('');
  const [formSundaySchoolName, setFormSundaySchoolName] = useState('');
  const [formDiocese, setFormDiocese] = useState('Addis Ababa (አዲስ አበባ)');
  const [formSubCity, setFormSubCity] = useState('');
  const [formWoreda, setFormWoreda] = useState('');
  const [formCity, setFormCity] = useState('Addis Ababa');
  const [formParishType, setFormParishType] = useState('DEBRE');
  const [formIsVerified, setFormIsVerified] = useState(true);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        if (deleteConfirmParish) setDeleteConfirmParish(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, deleteConfirmParish]);

  const fetchSundaySchools = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getParishes({
        limit: 250,
        search: search.trim() || undefined,
        diocese: selectedDiocese || undefined,
        subCity: selectedSubCity || undefined,
        isVerified:
          verificationFilter === 'VERIFIED'
            ? true
            : verificationFilter === 'PENDING'
            ? false
            : undefined,
      });

      setParishes(data.parishes || []);
      if (data.dioceses && data.dioceses.length > 0) {
        setDioceses(data.dioceses);
      }
      if (data.subCities && data.subCities.length > 0) {
        setSubCities(data.subCities);
      }
    } catch (err) {
      console.error('Failed to fetch Sunday schools:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedDiocese, selectedSubCity, verificationFilter]);

  useEffect(() => {
    fetchSundaySchools();
  }, [fetchSundaySchools]);

  // Aggregate metrics
  const totalSundaySchools = parishes.length;
  const verifiedCount = parishes.filter((p) => p.isVerified).length;
  const pendingCount = totalSundaySchools - verifiedCount;
  const totalStudents = parishes.reduce((sum, p) => sum + (p.studentCount || 0), 0);
  const totalTeachers = parishes.reduce((sum, p) => sum + (p.teacherCount || 0), 0);

  const hasActiveFilters = Boolean(
    search.trim() || selectedDiocese || selectedSubCity || verificationFilter !== 'ALL'
  );

  const handleResetFilters = () => {
    setSearch('');
    setSelectedDiocese('');
    setSelectedSubCity('');
    setVerificationFilter('ALL');
  };

  const handleOpenAddModal = () => {
    setEditingParish(null);
    setFormName('');
    setFormAmharicName('');
    setFormSundaySchoolName('');
    setFormDiocese('Addis Ababa (አዲስ አበባ)');
    setFormSubCity('');
    setFormWoreda('');
    setFormCity('Addis Ababa');
    setFormParishType('DEBRE');
    setFormIsVerified(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (parish: ParishDto) => {
    setEditingParish(parish);
    setFormName(parish.name || '');
    setFormAmharicName(parish.amharicName || '');
    setFormSundaySchoolName(parish.sundaySchoolName || '');
    setFormDiocese(parish.diocese || 'Addis Ababa (አዲስ አበባ)');
    setFormSubCity(parish.subCity || '');
    setFormWoreda(parish.woreda || '');
    setFormCity(parish.city || 'Addis Ababa');
    setFormParishType(parish.parishType || 'DEBRE');
    setFormIsVerified(parish.isVerified);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveSundaySchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAmharicName.trim() || !formDiocese.trim()) {
      setModalError(
        lang === 'am'
          ? 'እባክዎ አስፈላጊ የሆኑትን መረጃዎች በሙሉ በትክክል ይሙሉ (የደብሩ ስም፣ የአማርኛ ስም እና ሀገረ ስብከት)'
          : 'Please enter all required fields (Church Name, Amharic Name, and Diocese)'
      );
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      const payload: CreateParishInput = {
        name: formName.trim(),
        amharicName: formAmharicName.trim(),
        diocese: formDiocese.trim(),
        subCity: formSubCity.trim() || null,
        woreda: formWoreda.trim() || null,
        city: formCity.trim() || 'Addis Ababa',
        sundaySchoolName: formSundaySchoolName.trim() || null,
        parishType: formParishType,
        isVerified: formIsVerified,
      };

      if (editingParish) {
        await api.updateParish(editingParish.id, payload);
        setActionSuccess(
          lang === 'am' ? 'የሰንበት ትምህርት ቤቱ መረጃ በተሳካ ሁኔታ ተሻሽሏል' : 'Sunday School updated successfully!'
        );
      } else {
        await api.createParish(payload);
        setActionSuccess(
          lang === 'am' ? 'አዲስ ሰንበት ትምህርት ቤት በተሳካ ሁኔታ ተመዝግቧል' : 'New Sunday School registered successfully!'
        );
      }

      setIsModalOpen(false);
      await fetchSundaySchools(true);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setModalError((err as Error).message || 'Failed to save Sunday School');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleVerification = async (parish: ParishDto) => {
    try {
      const nextStatus = !parish.isVerified;
      await api.verifyParish(parish.id, nextStatus);
      setParishes((prev) =>
        prev.map((p) => (p.id === parish.id ? { ...p, isVerified: nextStatus } : p))
      );
      setActionSuccess(
        nextStatus
          ? lang === 'am' ? 'ሰንበት ትምህርት ቤቱ ተረጋግጧል' : 'Sunday School verified!'
          : lang === 'am' ? 'የማረጋገጫ ሁኔታው ተነስቷል' : 'Sunday School verification revoked.'
      );
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err) {
      alert((err as Error).message || 'Could not update verification status');
    }
  };

  const handleDeleteSundaySchool = async () => {
    if (!deleteConfirmParish) return;
    try {
      await api.deleteParish(deleteConfirmParish.id);
      setParishes((prev) => prev.filter((p) => p.id !== deleteConfirmParish.id));
      setActionSuccess(
        lang === 'am' ? 'ሰንበት ትምህርት ቤቱ በተሳካ ሁኔታ ተሰርዟል' : 'Sunday School removed successfully.'
      );
      setDeleteConfirmParish(null);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err) {
      alert((err as Error).message || 'Could not delete Sunday School');
    }
  };

  // Sub-cities filtered by selected diocese
  const availableSubCities = useMemo(() => {
    if (!selectedDiocese) return subCities;
    return subCities.filter(
      (s) => s.diocese.toLowerCase() === selectedDiocese.toLowerCase()
    );
  }, [subCities, selectedDiocese]);

  const getParishTypeBadge = (type?: string | null) => {
    switch (type) {
      case 'CATHEDRAL':
        return {
          label: lang === 'am' ? 'ካቴድራል' : 'Cathedral',
          cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'GEDAM':
        return {
          label: lang === 'am' ? 'ገዳም' : 'Monastery',
          cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'CHURCH':
        return {
          label: lang === 'am' ? 'ቤተክርስቲያን' : 'Church',
          cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'DEBRE':
      default:
        return {
          label: lang === 'am' ? 'ደብር' : 'Debre',
          cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
    }
  };

  return (
    <AdminShell>
      <div className="p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
              <Church className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                  {lang === 'am' ? 'የሰንበት ትምህርት ቤቶች አስተዳደር' : 'Sunday Schools Management'}
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {totalSundaySchools} {lang === 'am' ? 'ተመዝግበዋል' : 'Registered'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-0.5">
                {lang === 'am'
                  ? 'የሰንበት ትምህርት ቤቶች ዝርዝር፣ ሀገረ ስብከት፣ ክፍለ ከተማና የተማሪዎች ምደባ ቁጥጥር'
                  : 'Manage Sunday School registries, dioceses, sub-cities, and cohort enrollments'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto w-full sm:w-auto">
            <button
              onClick={() => fetchSundaySchools(true)}
              disabled={refreshing}
              className="p-2.5 sm:px-3 sm:py-2.5 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Refresh Sunday Schools"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span className="hidden sm:inline">{lang === 'am' ? 'አድስ' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-md shadow-amber-600/20 cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'am' ? '+ አዲስ ሰንበት ት/ቤት' : '+ Add Sunday School'}</span>
            </button>
          </div>
        </div>

        {/* Action Success Toast */}
        {actionSuccess && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs sm:text-sm flex items-center space-x-2.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Total Schools */}
          <div
            onClick={() => setVerificationFilter('ALL')}
            className={`p-3.5 sm:p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer transition hover:border-amber-400 dark:hover:border-amber-600 ${
              verificationFilter === 'ALL'
                ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20'
                : 'border-stone-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-1 sm:mb-2">
              <span className="truncate">{lang === 'am' ? 'አጠቃላይ ሰንበት ት/ቤቶች' : 'Total Sunday Schools'}</span>
              <Church className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-3xl font-black text-stone-900 dark:text-white">
              {totalSundaySchools}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1 flex items-center gap-1">
              <span>{dioceses.length}</span>
              <span>{lang === 'am' ? 'ሀገረ ስብከቶች' : 'Dioceses recorded'}</span>
            </div>
          </div>

          {/* Verified Schools */}
          <div
            onClick={() => setVerificationFilter(verificationFilter === 'VERIFIED' ? 'ALL' : 'VERIFIED')}
            className={`p-3.5 sm:p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm cursor-pointer transition hover:border-emerald-400 dark:hover:border-emerald-600 ${
              verificationFilter === 'VERIFIED'
                ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/20'
                : 'border-stone-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-1 sm:mb-2">
              <span className="truncate">{lang === 'am' ? 'የተረጋገጡ ሰንበት ት/ቤቶች' : 'Verified Sunday Schools'}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {verifiedCount}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1">
              {pendingCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {pendingCount} {lang === 'am' ? 'ያልተረጋገጡ' : 'pending review'}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {lang === 'am' ? 'ሁሉም የተረጋገጡ' : '100% Verified'}
                </span>
              )}
            </div>
          </div>

          {/* Enrolled Students */}
          <div className="p-3.5 sm:p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-1 sm:mb-2">
              <span className="truncate">{lang === 'am' ? 'የተመዘገቡ ተማሪዎች' : 'Enrolled Students'}</span>
              <GraduationCap className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {totalStudents}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1 truncate">
              {lang === 'am' ? 'በሁሉም ሰንበት ት/ቤቶች' : 'Assigned across cohorts'}
            </div>
          </div>

          {/* Assigned Teachers */}
          <div className="p-3.5 sm:p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-1 sm:mb-2">
              <span className="truncate">{lang === 'am' ? 'የተመደቡ መምህራን' : 'Assigned Teachers'}</span>
              <Users className="w-4 h-4 text-purple-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
              {totalTeachers}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1 truncate">
              {lang === 'am' ? 'የሰንበት ት/ቤት መምህራን' : 'Sunday School instructors'}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3.5 sm:p-5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs sm:text-sm font-bold text-stone-800 dark:text-slate-200">
                {lang === 'am' ? 'ማጣሪያዎችና ፍለጋ' : 'Filters & Search'}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline ml-2 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'am' ? 'ማጣሪያዎችን አጽዳ' : 'Reset filters'}</span>
                </button>
              )}
            </div>

            {/* View Mode Toggle (Table vs Cards) */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] text-stone-500 dark:text-slate-400">
                {lang === 'am' ? `${parishes.length} ተገኝተዋል` : `Showing ${parishes.length} Sunday Schools`}
              </span>
              <div className="inline-flex p-1 bg-stone-100 dark:bg-slate-950 rounded-xl border border-stone-200 dark:border-slate-800">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="Table view"
                  aria-label="Table view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="Cards view"
                  aria-label="Cards view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'am' ? 'ሰንበት ት/ቤት ወይም ደብር ፈልግ...' : 'Search Sunday School or church...'}
                className="w-full pl-9 pr-8 py-2.5 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Diocese Dropdown */}
            <div>
              <select
                value={selectedDiocese}
                onChange={(e) => {
                  setSelectedDiocese(e.target.value);
                  setSelectedSubCity('');
                }}
                className="w-full px-3 py-2.5 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">{lang === 'am' ? 'ሁሉም ሀገረ ስብከቶች' : 'All Dioceses'}</option>
                {dioceses.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-City Dropdown */}
            <div>
              <select
                value={selectedSubCity}
                onChange={(e) => setSelectedSubCity(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">{lang === 'am' ? 'ሁሉም ክፍለ ከተሞች / ዞኖች' : 'All Sub-Cities / Zones'}</option>
                {availableSubCities.map((s, idx) => (
                  <option key={`${s.subCity}-${idx}`} value={s.subCity}>
                    {s.subCity}
                  </option>
                ))}
              </select>
            </div>

            {/* Verification Status */}
            <div>
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ALL">{lang === 'am' ? 'ሁሉም የማረጋገጫ ሁኔታ' : 'All Verification States'}</option>
                <option value="VERIFIED">{lang === 'am' ? 'የተረጋገጡ ብቻ' : 'Verified Only'}</option>
                <option value="PENDING">{lang === 'am' ? 'ያልተረጋገጡ ብቻ' : 'Pending Review Only'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sunday Schools Content Area */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-12 text-center text-stone-500 dark:text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center space-y-3 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="font-semibold">{lang === 'am' ? 'ሰንበት ትምህርት ቤቶችን በመጫን ላይ...' : 'Loading Sunday Schools...'}</span>
          </div>
        ) : parishes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center text-stone-500 dark:text-slate-400 space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Church className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                {lang === 'am' ? 'ምንም ሰንበት ትምህርት ቤት አልተገኘም' : 'No Sunday Schools Found'}
              </h3>
              <p className="max-w-md mx-auto text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-1">
                {hasActiveFilters
                  ? lang === 'am'
                    ? 'በተሰጠው ፍለጋ መስፈርት መሠረት የተገኘ ሰንበት ትምህርት ቤት የለም። እባክዎ ማጣሪያዎችን ያጽዱ ወይም አዲስ ይመዝግቡ።'
                    : 'No Sunday Schools matched your current search filters. Try clearing your filters or register a new one.'
                  : lang === 'am'
                  ? 'እስካሁን የተመዘገበ ሰንበት ትምህርት ቤት የለም።'
                  : 'There are no Sunday Schools registered yet.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 font-semibold rounded-xl text-xs sm:text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ማጣሪያዎችን አጽዳ' : 'Clear Filters'}
                </button>
              )}
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer shadow-md shadow-amber-600/20"
              >
                {lang === 'am' ? '+ አዲስ ሰንበት ት/ቤት መዝግብ' : '+ Add Sunday School'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW (Always shown on mobile, and on desktop when viewMode === 'grid') */}
            <div className={`${viewMode === 'grid' ? 'grid' : 'grid md:hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4`}>
              {parishes.map((p) => {
                const typeBadge = getParishTypeBadge(p.parishType);
                return (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Card Header: Type Badge & Verification */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${typeBadge.cls}`}>
                          {typeBadge.label}
                        </span>

                        <button
                          onClick={() => handleToggleVerification(p)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            p.isVerified
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                          }`}
                          title={p.isVerified ? 'Click to revoke verification' : 'Click to verify'}
                        >
                          {p.isVerified ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{lang === 'am' ? 'የተረጋገጠ' : 'Verified'}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{lang === 'am' ? 'በግምገማ ላይ' : 'Pending'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Church Names */}
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-white text-sm sm:text-base leading-snug">
                          {p.amharicName}
                        </h4>
                        {p.name && p.name !== p.amharicName && (
                          <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                            {p.name}
                          </p>
                        )}
                        {p.sundaySchoolName && (
                          <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                            <Church className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold">{p.sundaySchoolName}</span>
                          </div>
                        )}
                      </div>

                      {/* Geographic Hierarchy */}
                      <div className="pt-1 text-xs text-stone-600 dark:text-slate-300 space-y-1">
                        <div className="font-medium text-stone-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{p.diocese}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-stone-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>
                            {[p.subCity, p.woreda ? `Woreda ${p.woreda}` : null, p.city]
                              .filter(Boolean)
                              .join(' • ')}
                          </span>
                        </div>
                      </div>

                      {/* Micro Stats (Students & Teachers) */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                        <div className="p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 flex items-center space-x-2">
                          <GraduationCap className="w-4 h-4 shrink-0 text-blue-500" />
                          <div>
                            <div className="text-xs font-bold">{p.studentCount || 0}</div>
                            <div className="text-[10px] text-blue-600/75 dark:text-blue-400">
                              {lang === 'am' ? 'ተማሪዎች' : 'Students'}
                            </div>
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 flex items-center space-x-2">
                          <Users className="w-4 h-4 shrink-0 text-purple-500" />
                          <div>
                            <div className="text-xs font-bold">{p.teacherCount || 0}</div>
                            <div className="text-[10px] text-purple-600/75 dark:text-purple-400">
                              {lang === 'am' ? 'መምህራን' : 'Teachers'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleVerification(p)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1 border ${
                          p.isVerified
                            ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            : 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {p.isVerified ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{lang === 'am' ? 'አውርድ' : 'Revoke'}</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{lang === 'am' ? 'አረጋግጥ' : 'Verify'}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{lang === 'am' ? 'አሻሽል' : 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmParish(p)}
                        className="p-1.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition cursor-pointer"
                        title="Delete Sunday School"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Shown on md+ when viewMode === 'table') */}
            {viewMode === 'table' && (
              <div className="hidden md:block bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 dark:bg-slate-950/70 text-stone-600 dark:text-slate-400 font-bold border-b border-stone-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-4">{lang === 'am' ? 'ሰንበት ትምህርት ቤት / ደብር' : 'Sunday School & Church'}</th>
                        <th className="px-5 py-4">{lang === 'am' ? 'አካባቢና ሀገረ ስብከት' : 'Diocese & Sub-City'}</th>
                        <th className="px-4 py-4">{lang === 'am' ? 'ዓይነት' : 'Classification'}</th>
                        <th className="px-4 py-4 text-center">{lang === 'am' ? 'ተማሪዎች' : 'Students'}</th>
                        <th className="px-4 py-4 text-center">{lang === 'am' ? 'መምህራን' : 'Teachers'}</th>
                        <th className="px-4 py-4 text-center">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                        <th className="px-5 py-4 text-right">{lang === 'am' ? 'ድርጊት' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800/80">
                      {parishes.map((p) => {
                        const typeBadge = getParishTypeBadge(p.parishType);
                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Church & Sunday School Name */}
                            <td className="px-5 py-4">
                              <div className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm">
                                {p.amharicName}
                              </div>
                              {p.name && p.name !== p.amharicName && (
                                <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                                  {p.name}
                                </div>
                              )}
                              {p.sundaySchoolName && (
                                <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center space-x-1.5 mt-1 font-medium">
                                  <Church className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate max-w-sm">{p.sundaySchoolName}</span>
                                </div>
                              )}
                            </td>

                            {/* Location */}
                            <td className="px-5 py-4">
                              <div className="font-semibold text-stone-800 dark:text-slate-200">
                                {p.diocese}
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-slate-400 flex items-center space-x-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>
                                  {[p.subCity, p.woreda ? `Woreda ${p.woreda}` : null, p.city]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </span>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="px-4 py-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${typeBadge.cls}`}>
                                {typeBadge.label}
                              </span>
                            </td>

                            {/* Students Count */}
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center space-x-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full text-xs">
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>{p.studentCount || 0}</span>
                              </span>
                            </td>

                            {/* Teachers Count */}
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center space-x-1 font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full text-xs">
                                <Users className="w-3.5 h-3.5" />
                                <span>{p.teacherCount || 0}</span>
                              </span>
                            </td>

                            {/* Verification Badge */}
                            <td className="px-4 py-4 text-center">
                              {p.isVerified ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{lang === 'am' ? 'የተረጋገጠ' : 'Verified'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                                  <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span>{lang === 'am' ? 'በግምገማ ላይ' : 'Pending'}</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* Verify Toggle */}
                                <button
                                  onClick={() => handleToggleVerification(p)}
                                  title={p.isVerified ? 'Mark as Unverified' : 'Mark as Verified'}
                                  className={`p-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                    p.isVerified
                                      ? 'border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                      : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  }`}
                                >
                                  {p.isVerified ? (
                                    <ShieldAlert className="w-4 h-4" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                  )}
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  title="Edit Sunday School"
                                  className="p-2 rounded-xl text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 border border-stone-200 dark:border-slate-800 transition cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => setDeleteConfirmParish(p)}
                                  title="Delete Sunday School"
                                  className="p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CREATE / EDIT RESPONSIVE MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-slate-950/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Church className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                    {editingParish
                      ? lang === 'am' ? 'የሰንበት ትምህርት ቤት መረጃ ማሻሻያ' : 'Edit Sunday School'
                      : lang === 'am' ? 'አዲስ ሰንበት ትምህርት ቤት መመዝገቢያ' : 'Register New Sunday School'}
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    {lang === 'am' ? 'የደብሩና የሰንበት ት/ቤቱን መረጃዎች በትክክል ይሙሉ' : 'Fill in church, Sunday School, and territorial details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {modalError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs sm:text-sm flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form id="sundaySchoolForm" onSubmit={handleSaveSundaySchool} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Amharic Name */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'የደብሩ / ቤተክርስቲያኑ ስም (በአማርኛ) *' : 'Church Name (Amharic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formAmharicName}
                      onChange={(e) => setFormAmharicName(e.target.value)}
                      placeholder="መንበረ መንግሥት ደብረ ገነት ቅዱስ ጊዮርጊስ ካቴድራል"
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                  </div>

                  {/* English Name */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'የደብሩ ስም (በእንግሊዝኛ) *' : 'Church Name (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="St. George Cathedral"
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                  </div>

                  {/* Sunday School Name */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'የሰንበት ትምህርት ቤቱ መጠሪያ ስም' : 'Sunday School Name'}
                    </label>
                    <input
                      type="text"
                      value={formSundaySchoolName}
                      onChange={(e) => setFormSundaySchoolName(e.target.value)}
                      placeholder="የደብረ ገነት ቅዱስ ጊዮርጊስ ሰንበት ትምህርት ቤት"
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                  </div>

                  {/* Diocese */}
                  <div>
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'ሀገረ ስብከት *' : 'Diocese / Region *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formDiocese}
                      onChange={(e) => setFormDiocese(e.target.value)}
                      placeholder="Addis Ababa (አዲስ አበባ)"
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                  </div>

                  {/* Sub-City / Zone */}
                  <div>
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'ክፍለ ከተማ / ዞን' : 'Sub-City / Zone'}
                    </label>
                    <input
                      type="text"
                      value={formSubCity}
                      onChange={(e) => setFormSubCity(e.target.value)}
                      placeholder="Arada (አራዳ)"
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                  </div>

                  {/* Woreda */}
                  <div>
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'ወረዳ' : 'Woreda / District'}
                    </label>
                    <input
                      type="text"
                      value={formWoreda}
                      onChange={(e) => setFormWoreda(e.target.value)}
                      placeholder="01"
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'ከተማ' : 'City'}
                    </label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="Addis Ababa"
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    />
                  </div>

                  {/* Church Classification */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-800 dark:text-slate-200 mb-1">
                      {lang === 'am' ? 'የደብሩ ዓይነት' : 'Church Classification'}
                    </label>
                    <select
                      value={formParishType}
                      onChange={(e) => setFormParishType(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
                    >
                      <option value="DEBRE">ደብር (Debre)</option>
                      <option value="CATHEDRAL">ካቴድራል (Cathedral)</option>
                      <option value="GEDAM">ገዳም (Gedam / Monastery)</option>
                      <option value="CHURCH">ቤተክርስቲያን (Church)</option>
                    </select>
                  </div>

                  {/* Verified Checkbox */}
                  <div className="sm:col-span-2 flex items-center space-x-3 p-3 rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
                    <input
                      type="checkbox"
                      id="formIsVerified"
                      checked={formIsVerified}
                      onChange={(e) => setFormIsVerified(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-stone-300 dark:border-slate-700 focus:ring-amber-500 cursor-pointer"
                    />
                    <label
                      htmlFor="formIsVerified"
                      className="font-bold text-stone-800 dark:text-slate-200 cursor-pointer select-none text-xs sm:text-sm"
                    >
                      {lang === 'am' ? 'ይህ ሰንበት ትምህርት ቤት የተረጋገጠ ነው' : 'Mark as officially verified'}
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-stone-200 dark:border-slate-800 flex items-center justify-end space-x-3 shrink-0 bg-stone-50/50 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 font-semibold cursor-pointer text-xs sm:text-sm transition"
              >
                {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="sundaySchoolForm"
                disabled={modalSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-md shadow-amber-600/20 disabled:opacity-50 text-xs sm:text-sm"
              >
                {modalSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'am' ? 'በማስቀመጥ ላይ...' : 'Saving...'}</span>
                  </>
                ) : (
                  <span>
                    {editingParish
                      ? lang === 'am' ? 'መረጃ አሻሽል' : 'Update Sunday School'
                      : lang === 'am' ? 'ሰንበት ት/ቤት መዝግብ' : 'Register Sunday School'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION RESPONSIVE DIALOG */}
      {deleteConfirmParish && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                {lang === 'am' ? 'ሰንበት ትምህርት ቤቱን መሰረዝ ይፈልጋሉ?' : 'Delete Sunday School?'}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
              {lang === 'am'
                ? `"${deleteConfirmParish.amharicName}"ን ከስርዓቱ ለመሰረዝ እርግጠኛ ነዎት? በዚህ ሰንበት ት/ቤት ስር የተመዘገቡ ተማሪዎችና መምህራን ወደ ያልተመደበ ሁኔታ ይቀየራሉ።`
                : `Are you sure you want to delete "${deleteConfirmParish.amharicName || deleteConfirmParish.name}"? Enrolled students and teachers in this Sunday School will be set to unassigned.`}
            </p>
            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmParish(null)}
                className="px-4 py-2 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold cursor-pointer transition"
              >
                {lang === 'am' ? 'ተመለስ' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteSundaySchool}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-md shadow-red-600/20"
              >
                {lang === 'am' ? 'አዎ ሰርዝ' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
