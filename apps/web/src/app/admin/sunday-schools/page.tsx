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

  const fetchSundaySchools = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getParishes({
        limit: 200,
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
          ? 'እባክዎ አስፈላጊ የሆኑትን መረጃዎች በሙሉ በትክክል ይሙሉ'
          : 'Please enter all required fields (Name, Amharic Name, and Diocese)'
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

  return (
    <AdminShell>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Church className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                  {lang === 'am' ? 'የሰንበት ትምህርት ቤቶች አስተዳደር' : 'Sunday Schools Management'}
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                  {lang === 'am'
                    ? 'የሰንበት ትምህርት ቤቶች ዝርዝር፣ ሀገረ ስብከት፣ ክፍለ ከተማና የተማሪዎች ምደባ ቁጥጥር'
                    : 'Manage Sunday School registries, dioceses, sub-cities, and cohort enrollments'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchSundaySchools(true)}
              disabled={refreshing}
              className="p-2.5 border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{lang === 'am' ? 'አድስ' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'am' ? '+ አዲስ ሰንበት ት/ቤት መዝግብ' : '+ Add Sunday School'}</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-2">
              <span>{lang === 'am' ? 'አጠቃላይ ሰንበት ት/ቤቶች' : 'Total Sunday Schools'}</span>
              <Church className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-stone-900 dark:text-white">
              {totalSundaySchools}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1">
              {dioceses.length} {lang === 'am' ? 'ሀገረ ስብከቶች' : 'Dioceses'}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-2">
              <span>{lang === 'am' ? 'የተረጋገጡ ሰንበት ት/ቤቶች' : 'Verified Sunday Schools'}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {verifiedCount}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1">
              {pendingCount > 0 ? `${pendingCount} ${lang === 'am' ? 'ያልተረጋገጡ' : 'pending'}` : lang === 'am' ? 'ሁሉም የተረጋገጡ' : '100% Verified'}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-2">
              <span>{lang === 'am' ? 'የተመዘገቡ ተማሪዎች' : 'Enrolled Students'}</span>
              <GraduationCap className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {totalStudents}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1">
              {lang === 'am' ? 'በሰንበት ት/ቤቶች የተመደቡ' : 'Assigned across cohorts'}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-stone-500 dark:text-slate-400 text-xs font-semibold mb-2">
              <span>{lang === 'am' ? 'የተመደቡ መምህራን' : 'Assigned Teachers'}</span>
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {totalTeachers}
            </div>
            <div className="text-[11px] text-stone-400 dark:text-slate-500 mt-1">
              {lang === 'am' ? 'የይዘትና የተማሪ አስተባባሪዎች' : 'Sunday School instructors'}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="md:col-span-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'am' ? 'ሰንበት ት/ቤት ወይም ደብር ፈልግ...' : 'Search Sunday School or church...'}
                className="w-full pl-9 pr-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Diocese Dropdown */}
            <div>
              <select
                value={selectedDiocese}
                onChange={(e) => {
                  setSelectedDiocese(e.target.value);
                  setSelectedSubCity('');
                }}
                className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">{lang === 'am' ? 'ሁሉም ሀገረ ስብከቶች (All Dioceses)' : 'All Dioceses'}</option>
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
                className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">{lang === 'am' ? 'ሁሉም የማረጋገጫ ሁኔታ' : 'All Verification States'}</option>
                <option value="VERIFIED">{lang === 'am' ? 'የተረጋገጡ ብቻ' : 'Verified Only'}</option>
                <option value="PENDING">{lang === 'am' ? 'ያልተረጋገጡ ብቻ' : 'Pending Review Only'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sunday Schools Table */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-stone-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>{lang === 'am' ? 'ሰንበት ትምህርት ቤቶችን በመጫን ላይ...' : 'Loading Sunday Schools...'}</span>
            </div>
          ) : parishes.length === 0 ? (
            <div className="p-12 text-center text-stone-500 dark:text-slate-400 text-xs space-y-3">
              <Church className="w-10 h-10 text-stone-300 dark:text-slate-600 mx-auto" />
              <div className="font-bold text-sm text-stone-800 dark:text-slate-200">
                {lang === 'am' ? 'ምንም ሰንበት ትምህርት ቤት አልተገኘም' : 'No Sunday Schools Found'}
              </div>
              <p className="max-w-md mx-auto text-[11px]">
                {lang === 'am'
                  ? 'በተሰጠው ፍለጋ መስፈርት መሠረት የተመዘገበ ሰንበት ትምህርት ቤት የለም። እባክዎ ፍለጋዎን ይቀይሩ ወይም አዲስ ይመዝግቡ።'
                  : 'No Sunday Schools matched your current filter criteria. Try resetting filters or register a new Sunday School.'}
              </p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
              >
                {lang === 'am' ? '+ አዲስ ሰንበት ት/ቤት መዝግብ' : '+ Add Sunday School'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-slate-950/60 text-stone-600 dark:text-slate-400 font-bold border-b border-stone-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5">{lang === 'am' ? 'ሰንበት ትምህርት ቤት / ደብር' : 'Sunday School & Church'}</th>
                    <th className="px-4 py-3.5">{lang === 'am' ? 'አካባቢና ሀገረ ስብከት' : 'Diocese & Sub-City'}</th>
                    <th className="px-4 py-3.5">{lang === 'am' ? 'ዓይነት' : 'Classification'}</th>
                    <th className="px-4 py-3.5 text-center">{lang === 'am' ? 'ተማሪዎች' : 'Students'}</th>
                    <th className="px-4 py-3.5 text-center">{lang === 'am' ? 'መምህራን' : 'Teachers'}</th>
                    <th className="px-4 py-3.5 text-center">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                    <th className="px-4 py-3.5 text-right">{lang === 'am' ? 'ድርጊት' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-slate-800/80">
                  {parishes.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-stone-900 dark:text-white text-xs">
                          {p.amharicName}
                        </div>
                        {p.name && p.name !== p.amharicName && (
                          <div className="text-[11px] text-stone-500 dark:text-slate-400">
                            {p.name}
                          </div>
                        )}
                        {p.sundaySchoolName && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center space-x-1 mt-0.5">
                            <Church className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-xs">{p.sundaySchoolName}</span>
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-stone-800 dark:text-slate-200">
                          {p.diocese}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          <span>
                            {[p.subCity, p.woreda ? `Woreda ${p.woreda}` : null, p.city]
                              .filter(Boolean)
                              .join(' • ')}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300">
                          {p.parishType || 'DEBRE'}
                        </span>
                      </td>

                      {/* Students Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center space-x-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full text-[11px]">
                          <GraduationCap className="w-3 h-3" />
                          <span>{p.studentCount || 0}</span>
                        </span>
                      </td>

                      {/* Teachers Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center space-x-1 font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full text-[11px]">
                          <Users className="w-3 h-3" />
                          <span>{p.teacherCount || 0}</span>
                        </span>
                      </td>

                      {/* Verification Badge */}
                      <td className="px-4 py-3.5 text-center">
                        {p.isVerified ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{lang === 'am' ? 'የተረጋገጠ' : 'Verified'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>{lang === 'am' ? 'በግምገማ ላይ' : 'Pending'}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Verify Toggle */}
                          <button
                            onClick={() => handleToggleVerification(p)}
                            title={p.isVerified ? 'Mark as Unverified' : 'Mark as Verified'}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              p.isVerified
                                ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
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
                            className="p-1.5 rounded-lg text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmParish(p)}
                            title="Delete Sunday School"
                            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Church className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                  {editingParish
                    ? lang === 'am' ? 'የሰንበት ትምህርት ቤት መረጃ ማሻሻያ' : 'Edit Sunday School'
                    : lang === 'am' ? 'አዲስ ሰንበት ትምህርት ቤት መመዝገቢያ' : 'Register New Sunday School'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSundaySchool} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amharic Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'የደብሩ / ቤተክርስቲያኑ ስም (በአማርኛ) *' : 'Church Name (Amharic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formAmharicName}
                    onChange={(e) => setFormAmharicName(e.target.value)}
                    placeholder="መንበረ መንግሥት ደብረ ገነት ቅዱስ ጊዮርጊስ ካቴድራል"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* English Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'የደብሩ ስም (በእንግሊዝኛ) *' : 'Church Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="St. George Cathedral"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Sunday School Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'የሰንበት ትምህርት ቤቱ መጠሪያ ስም' : 'Sunday School Name'}
                  </label>
                  <input
                    type="text"
                    value={formSundaySchoolName}
                    onChange={(e) => setFormSundaySchoolName(e.target.value)}
                    placeholder="የደብረ ገነት ቅዱስ ጊዮርጊስ ሰንበት ትምህርት ቤት"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Diocese */}
                <div>
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'ሀገረ ስብከት *' : 'Diocese / Region *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formDiocese}
                    onChange={(e) => setFormDiocese(e.target.value)}
                    placeholder="Addis Ababa (አዲስ አበባ)"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Sub-City / Zone */}
                <div>
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'ክፍለ ከተማ / ዞን' : 'Sub-City / Zone'}
                  </label>
                  <input
                    type="text"
                    value={formSubCity}
                    onChange={(e) => setFormSubCity(e.target.value)}
                    placeholder="Arada (አራዳ)"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Woreda */}
                <div>
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'ወረዳ' : 'Woreda / District'}
                  </label>
                  <input
                    type="text"
                    value={formWoreda}
                    onChange={(e) => setFormWoreda(e.target.value)}
                    placeholder="01"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'ከተማ' : 'City'}
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Addis Ababa"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block font-bold text-stone-700 dark:text-slate-300 mb-1">
                    {lang === 'am' ? 'የደብሩ ዓይነት' : 'Church Classification'}
                  </label>
                  <select
                    value={formParishType}
                    onChange={(e) => setFormParishType(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-stone-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="DEBRE">ደብር (Debre)</option>
                    <option value="CATHEDRAL">ካቴድራል (Cathedral)</option>
                    <option value="GEDAM">ገዳም (Gedam / Monastery)</option>
                    <option value="CHURCH">ቤተክርስቲያን (Church)</option>
                  </select>
                </div>

                {/* Verified Toggle */}
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="formIsVerified"
                    checked={formIsVerified}
                    onChange={(e) => setFormIsVerified(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label
                    htmlFor="formIsVerified"
                    className="font-bold text-stone-800 dark:text-slate-200 cursor-pointer select-none"
                  >
                    {lang === 'am' ? 'ይህ ሰንበት ትምህርት ቤት የተረጋገጠ ነው' : 'Mark as officially verified'}
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-md disabled:opacity-50"
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
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmParish && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                {lang === 'am' ? 'ሰንበት ትምህርት ቤቱን መሰረዝ ይፈልጋሉ?' : 'Delete Sunday School?'}
              </h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
              {lang === 'am'
                ? `"${deleteConfirmParish.amharicName}"ን ከስርዓቱ ለመሰረዝ እርግጠኛ ነዎት? በዚህ ሰንበት ት/ቤት ስር የተመዘገቡ ተማሪዎችና መምህራን ወደ ያልተመደበ ሁኔታ ይቀየራሉ።`
                : `Are you sure you want to delete "${deleteConfirmParish.amharicName || deleteConfirmParish.name}"? Enrolled students and teachers in this Sunday School will be set to unassigned.`}
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmParish(null)}
                className="px-4 py-2 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {lang === 'am' ? 'ተመለስ' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteSundaySchool}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow"
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
