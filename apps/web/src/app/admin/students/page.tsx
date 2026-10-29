'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  Church,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  User,
  X,
  Loader2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import Pagination from '@/components/Pagination';
import type {
  AdminStudentListItem,
  AdminStudentDetails,
} from '@eotc/shared';

interface GradeOption {
  id: string;
  level: number;
  name: string;
  amharicName?: string | null;
}

export default function AdminStudentsPage() {
  const { lang } = useLanguage();
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [sundaySchools, setSundaySchools] = useState<string[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states (Default 10 per page)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedDiocese, setSelectedDiocese] = useState<string>('');
  const [selectedSubCity, setSelectedSubCity] = useState<string>('');
  const [diocesesList, setDiocesesList] = useState<string[]>([]);
  const [subCitiesList, setSubCitiesList] = useState<{ subCity: string; diocese: string }[]>([]);
  const [selectedSundaySchool, setSelectedSundaySchool] = useState<string>('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Student for Progress Deep Dive Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<AdminStudentDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      const [schools, currData, parishData] = await Promise.all([
        api.adminGetSundaySchools().catch(() => []),
        api.getAdminCurriculum().catch(() => []),
        api.getParishes({ limit: 150 }).catch(() => null),
      ]);
      if (parishData) {
        setDiocesesList(parishData.dioceses || []);
        setSubCitiesList(parishData.subCities || []);
        const parishNames = Array.from(
          new Set([
            ...schools,
            ...parishData.parishes.map((p) => p.amharicName || p.name),
          ])
        ).sort();
        setSundaySchools(parishNames);
      } else {
        setSundaySchools(schools);
      }
      if (Array.isArray(currData)) {
        setGrades(currData);
      } else if (currData?.grades && Array.isArray(currData.grades)) {
        setGrades(currData.grades);
      }
    } catch {
      // Non-fatal
    }
  };

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await api.adminListStudents({
        churchParish: selectedSundaySchool || undefined,
        diocese: selectedDiocese || undefined,
        subCity: selectedSubCity || undefined,
        gradeId: selectedGradeId || undefined,
        search: searchQuery || undefined,
        page,
        limit: pageSize,
      });
      setStudents(res.students || []);
      if (res.pagination) {
        setTotalCount(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (lang === 'am' ? 'የተማሪዎችን መረጃ መጫን አልተቻለም' : 'Failed to load students')
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [selectedSundaySchool, selectedGradeId, selectedDiocese, selectedSubCity, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStudents();
  };

  const handleViewProgress = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsLoadingDetails(true);
    setStudentDetails(null);
    try {
      const details = await api.adminGetStudentProgress(studentId);
      setStudentDetails(details);
    } catch (err: any) {
      alert(
        err.message ||
          (lang === 'am' ? 'የትምህርት ሂደቱን መጫን አልተቻለም' : 'Failed to load progress details')
      );
      setSelectedStudentId(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Aggregated Stats
  const totalStudents = totalCount || students.length;
  const uniqueParishesCount = new Set(
    students.map((s) => s.churchParish).filter(Boolean)
  ).size;
  const avgProgress =
    totalStudents > 0
      ? Math.round(
          students.reduce((acc, curr) => acc + curr.progressPercent, 0) /
            totalStudents
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 mb-1">
            <GraduationCap className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              {lang === 'am'
                ? 'የሰንበት ትምህርት ቤት ተማሪዎች ማውጫ እና ውጤት'
                : 'Sunday School Students & Progress'}
            </h1>
          </div>
          <p className="text-sm text-stone-500 dark:text-slate-400">
            {lang === 'am'
              ? 'ተማሪዎችን በሰንበት ት/ቤት ወይም በክፍል ለይተው ይመልከቱ፤ የመማርና የፈተና ሂደታቸውን ይከታተሉ።'
              : 'Filter students by Sunday School or grade level, and monitor their learning completion.'}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'am' ? 'ጠቅላላ የተመዘገቡ ተማሪዎች' : 'Total Students'}
            </p>
            <p className="text-2xl font-black text-stone-900 dark:text-white mt-1">{totalStudents}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'am' ? 'የተወከሉ ሰንበት ት/ቤቶች' : 'Sunday Schools'}
            </p>
            <p className="text-2xl font-black text-stone-900 dark:text-white mt-1">{uniqueParishesCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Church className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'am' ? 'አማካይ የትምህርት ማጠናቀቂያ' : 'Avg Completion Rate'}
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{avgProgress}%</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          {/* Search Box */}
          <div className="md:col-span-10 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'am'
                  ? 'በተማሪ ስም፣ ክርስትና ስም፣ ኢሜይል ወይም ስልክ ይፈልጉ...'
                  : 'Search by name, baptismal name, email, or phone...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-800 rounded-xl text-sm text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Submit Search Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full h-full min-h-[42px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition flex items-center justify-center shadow-xs cursor-pointer"
            >
              {lang === 'am' ? 'ፈልግ' : 'Search'}
            </button>
          </div>
        </form>

        {/* Hierarchical Hierarchy Filters (Diocese -> Sub-City/Zone -> Sunday School -> Grade) */}
        <div className="pt-1 border-t border-stone-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Diocese Filter */}
          <div className="relative">
            <select
              value={selectedDiocese}
              onChange={(e) => {
                setSelectedDiocese(e.target.value);
                setSelectedSubCity('');
              }}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-800 rounded-xl text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value="">{lang === 'am' ? 'ሁሉም ሀገረ ስብከት (All Dioceses)' : 'All Dioceses'}</option>
              {diocesesList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-City Filter */}
          <div className="relative">
            <select
              value={selectedSubCity}
              onChange={(e) => setSelectedSubCity(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-800 rounded-xl text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value="">{lang === 'am' ? 'ሁሉም ክፍለ ከተማ / ዞን' : 'All Sub-Cities / Zones'}</option>
              {subCitiesList
                .filter((s) => !selectedDiocese || s.diocese === selectedDiocese)
                .map((s) => (
                  <option key={s.subCity} value={s.subCity}>
                    {s.subCity}
                  </option>
                ))}
            </select>
          </div>

          {/* Sunday School / Parish Filter */}
          <div className="relative">
            <select
              value={selectedSundaySchool}
              onChange={(e) => setSelectedSundaySchool(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-800 rounded-xl text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value="">
                {lang === 'am'
                  ? 'ሁሉም ሰንበት ት/ቤቶች (All Sunday Schools)'
                  : 'All Sunday Schools'}
              </option>
              {sundaySchools.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level Filter */}
          <div className="relative">
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-800 rounded-xl text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              <option value="">
                {lang === 'am' ? 'ሁሉም ክፍሎች (All Grades)' : 'All Grades'}
              </option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {lang === 'am' && g.amharicName ? g.amharicName : g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(selectedSundaySchool || selectedGradeId || searchQuery) && (
          <div className="flex items-center space-x-2 text-xs text-amber-700 dark:text-amber-300 pt-1">
            <span>{lang === 'am' ? 'ተጣርቷል፦' : 'Active filters:'}</span>
            {selectedSundaySchool && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                {selectedSundaySchool}
              </span>
            )}
            {selectedGradeId && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                {grades.find((g) => g.id === selectedGradeId)?.name || 'Grade'}
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            <button
              onClick={() => {
                setSelectedSundaySchool('');
                setSelectedGradeId('');
                setSearchQuery('');
              }}
              className="text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white underline ml-2"
            >
              {lang === 'am' ? 'ሁሉንም አጽዳ' : 'Clear all'}
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-200 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Students Directory Content */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center text-stone-500 dark:text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400" />
          <p className="text-sm">
            {lang === 'am' ? 'የተማሪዎች መረጃ በመጫን ላይ...' : 'Loading students directory...'}
          </p>
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl text-stone-500 dark:text-slate-400 space-y-3 shadow-xs">
          <GraduationCap className="w-12 h-12 mx-auto text-stone-300 dark:text-slate-600 mb-2" />
          <p className="text-base font-semibold text-stone-800 dark:text-slate-200">
            {lang === 'am' ? 'ምንም ተማሪ አልተገኘም' : 'No students found'}
          </p>
          <p className="text-sm max-w-md mx-auto text-stone-500 dark:text-slate-400">
            {lang === 'am'
              ? 'በተመረጡት ማጣሪያዎች የሚገኝ ተማሪ የለም። እባክዎ ማጣሪያውን ቀይረው ይሞክሩ።'
              : 'No students match your selected filters. Try broadening your criteria.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/70 text-stone-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">{lang === 'am' ? 'ተማሪ' : 'Student'}</th>
                  <th className="py-3.5 px-4">{lang === 'am' ? 'ሰንበት ት/ቤት / አጥቢያ' : 'Sunday School'}</th>
                  <th className="py-3.5 px-4">{lang === 'am' ? 'የተመዘገቡ ክፍሎች' : 'Enrolled Grades'}</th>
                  <th className="py-3.5 px-4">{lang === 'am' ? 'የትምህርት ሂደት' : 'Progress'}</th>
                  <th className="py-3.5 px-4">{lang === 'am' ? 'የመጨረሻ እንቅስቃሴ' : 'Last Active'}</th>
                  <th className="py-3.5 px-4 text-right">{lang === 'am' ? 'ተግባር' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60 text-sm">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-stone-50/80 dark:hover:bg-slate-800/40 transition group"
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition">
                          {student.fullName}
                        </p>
                        {student.baptismalName && (
                          <p className="text-xs text-amber-700 dark:text-amber-400/90 font-medium">
                            {lang === 'am' ? 'የክርስትና ስም፦ ' : 'Baptismal: '}
                            {student.baptismalName}
                          </p>
                        )}
                        <div className="flex items-center space-x-3 text-xs text-stone-500 dark:text-slate-400 mt-1">
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-stone-400 dark:text-slate-500" />
                            {student.email}
                          </span>
                          {student.phoneNumber && (
                            <span className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-stone-400 dark:text-slate-500" />
                              {student.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sunday School / Parish */}
                    <td className="py-3.5 px-4">
                      {student.churchParish ? (
                        <div className="flex items-center space-x-1.5 text-stone-700 dark:text-slate-200">
                          <Church className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="font-medium text-xs sm:text-sm">
                            {student.churchParish}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400 dark:text-slate-500 italic">
                          {lang === 'am' ? 'አልተገለጸም' : 'Unspecified'}
                        </span>
                      )}
                    </td>

                    {/* Enrolled Grades */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {student.enrolledGrades.length > 0 ? (
                          student.enrolledGrades.map((g) => (
                            <span
                              key={g.id}
                              className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-slate-700"
                            >
                              {lang === 'am' && g.amharicName ? g.amharicName : g.gradeName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-stone-400 dark:text-slate-500 italic">
                            {lang === 'am' ? 'ክፍል አልተመዘገበም' : 'None enrolled'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Progress Bar */}
                    <td className="py-3.5 px-4">
                      <div className="w-36 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-700 dark:text-slate-300 font-semibold">
                            {student.progressPercent}%
                          </span>
                          <span className="text-stone-500 dark:text-slate-400 text-[11px]">
                            {student.totalChaptersCompleted}/{student.totalChaptersAvailable}{' '}
                            {lang === 'am' ? 'ምዕራፍ' : 'ch'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              student.progressPercent >= 80
                                ? 'bg-emerald-500'
                                : student.progressPercent >= 40
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, student.progressPercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-slate-400">
                      {student.lastActiveAt ? (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500" />
                          <span>
                            {new Date(student.lastActiveAt).toLocaleDateString(
                              lang === 'am' ? 'am-ET' : 'en-US',
                              { month: 'short', day: 'numeric', year: 'numeric' }
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400 dark:text-slate-500 italic">
                          {lang === 'am' ? 'ገና አልጀመረም' : 'Not started'}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewProgress(student.id)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
                      >
                        {lang === 'am' ? 'ዝርዝር ሂደት' : 'View Progress'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalStudents > 0 && (
            <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-slate-800">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalStudents}
                pageSize={pageSize}
                pageSizeOptions={[10, 25, 50]}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                itemName={lang === 'am' ? 'ተማሪዎች' : 'Students'}
              />
            </div>
          )}
        </div>
      )}

      {/* Slide-over / Modal for Student Progress Details */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between bg-stone-50 dark:bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                    {studentDetails?.fullName || (lang === 'am' ? 'የተማሪው ዝርዝር ውጤት' : 'Student Progress Details')}
                  </h3>
                  {studentDetails?.churchParish && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center mt-0.5">
                      <Church className="w-3.5 h-3.5 mr-1" />
                      {studentDetails.churchParish}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="w-8 h-8 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-800 text-stone-400 hover:text-stone-700 dark:hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isLoadingDetails ? (
                <div className="py-16 flex flex-col items-center justify-center text-stone-500 dark:text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-amber-400" />
                  <p className="text-sm">
                    {lang === 'am' ? 'ዝርዝር መረጃዎችን በማምጣት ላይ...' : 'Fetching progress details...'}
                  </p>
                </div>
              ) : studentDetails ? (
                <>
                  {/* Basic Profile Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 dark:bg-slate-950/60 p-4 rounded-xl border border-stone-200 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-stone-500 dark:text-slate-500 block">
                        {lang === 'am' ? 'ክርስትና ስም' : 'Baptismal Name'}
                      </span>
                      <span className="text-stone-800 dark:text-slate-200 font-semibold mt-0.5 block">
                        {studentDetails.baptismalName || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 dark:text-slate-500 block">
                        {lang === 'am' ? 'ስልክ ቁጥር' : 'Phone'}
                      </span>
                      <span className="text-stone-800 dark:text-slate-200 font-semibold mt-0.5 block">
                        {studentDetails.phoneNumber || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 dark:text-slate-500 block">
                        {lang === 'am' ? 'ዕድሜ / አድራሻ' : 'Age / Address'}
                      </span>
                      <span className="text-stone-800 dark:text-slate-200 font-semibold mt-0.5 block">
                        {studentDetails.age ? `${studentDetails.age} yrs` : ''} {studentDetails.address ? `• ${studentDetails.address}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 dark:text-slate-500 block">
                        {lang === 'am' ? 'የማጠናቀቂያ መጠን' : 'Overall Completion'}
                      </span>
                      <span className="text-amber-700 dark:text-amber-400 font-bold mt-0.5 block">
                        {studentDetails.progressPercent}% ({studentDetails.totalChaptersCompleted}/{studentDetails.totalChaptersAvailable})
                      </span>
                    </div>
                  </div>

                  {/* Chapters Progress Checklist */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-stone-900 dark:text-white font-bold text-sm">
                      <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4>{lang === 'am' ? 'የምዕራፎች ንባብ እና ማጠቃለያ ሁኔታ' : 'Chapter Reading & Completion'}</h4>
                    </div>

                    <div className="bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-stone-200 dark:divide-slate-800/60">
                      {studentDetails.chaptersProgress.length === 0 ? (
                        <p className="p-4 text-xs text-stone-400 dark:text-slate-500 italic">
                          {lang === 'am' ? 'ምንም የታተሙ ምዕራፎች የሉም' : 'No published chapters'}
                        </p>
                      ) : (
                        studentDetails.chaptersProgress.map((ch) => (
                          <div
                            key={ch.chapterId}
                            className="p-3.5 flex items-center justify-between text-xs hover:bg-stone-100/70 dark:hover:bg-slate-900/60 transition"
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-stone-800 dark:text-slate-200">
                                {ch.subjectTitle} — {lang === 'am' && ch.amharicTitle ? ch.amharicTitle : ch.title}
                              </p>
                              <div className="flex items-center space-x-3 text-stone-500 dark:text-slate-500 text-[11px]">
                                <span>
                                  {lang === 'am' ? 'የተነበበው የመጨረሻ ገጽ፦ ' : 'Last read page: '}
                                  {ch.lastReadPage}
                                </span>
                                {ch.lastStudiedAt && (
                                  <span>
                                    {lang === 'am' ? 'ቀን፦ ' : 'Date: '}
                                    {new Date(ch.lastStudiedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              {ch.isCompleted ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  {lang === 'am' ? 'ተጠናቋል' : 'Completed'}
                                </span>
                              ) : ch.lastReadPage > 1 ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                  {lang === 'am' ? 'በንባብ ላይ' : 'In Progress'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400">
                                  {lang === 'am' ? 'ገና አልተጀመረም' : 'Not Started'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quiz Attempts History */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-stone-900 dark:text-white font-bold text-sm">
                      <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4>{lang === 'am' ? 'የፈተና እና ጥያቄዎች ውጤት' : 'Quiz & Assessment Attempts'}</h4>
                    </div>

                    <div className="bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-stone-200 dark:divide-slate-800/60">
                      {studentDetails.quizAttempts.length === 0 ? (
                        <p className="p-4 text-xs text-stone-400 dark:text-slate-500 italic">
                          {lang === 'am' ? 'ምንም የፈተና ሙከራ አልተመዘገበም' : 'No quiz attempts recorded yet'}
                        </p>
                      ) : (
                        studentDetails.quizAttempts.map((qa) => (
                          <div
                            key={qa.id}
                            className="p-3.5 flex items-center justify-between text-xs hover:bg-stone-100/70 dark:hover:bg-slate-900/60 transition"
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-stone-800 dark:text-slate-200">{qa.quizTitle}</p>
                              <p className="text-[11px] text-stone-500 dark:text-slate-500">
                                {new Date(qa.attemptedAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-stone-700 dark:text-slate-300">
                                {qa.score} / {qa.maxScore} (
                                {qa.maxScore > 0 ? Math.round((qa.score / qa.maxScore) * 100) : 0}%)
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  qa.passed
                                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                                    : 'bg-rose-50 dark:bg-red-500/20 text-rose-700 dark:text-red-300 border border-rose-200 dark:border-red-500/30'
                                }`}
                              >
                                {qa.passed
                                  ? lang === 'am'
                                    ? 'አልፏል'
                                    : 'Passed'
                                  : lang === 'am'
                                  ? 'ወድቋል'
                                  : 'Failed'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white rounded-xl text-xs font-semibold transition"
              >
                {lang === 'am' ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
