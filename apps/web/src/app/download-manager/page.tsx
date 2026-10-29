'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Download,
  Trash2,
  HardDrive,
  BookOpen,
  ArrowLeft,
  Search,
  Filter,
  ArrowUpDown,
  X,
  FileCheck2,
} from 'lucide-react';
import { getAllOfflinePackages, deleteOfflinePackage, type StoredPackage } from '@/lib/offline-db';
import { useLanguage } from '@/lib/language-context';

export default function DownloadManagerPage() {
  const { lang, pick } = useLanguage();
  const [packages, setPackages] = useState<StoredPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'size_desc' | 'size_asc' | 'title'>('recent');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const pkgs = await getAllOfflinePackages();
      setPackages(pkgs);
    } catch (err) {
      console.error('Failed to load offline packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chapterId: string) => {
    const confirmMsg =
      lang === 'am'
        ? 'ይህን የወረደ ትምህርት ከመሣሪያዎ ላይ ማስወገድ ይፈልጋሉ?'
        : 'Do you want to remove this downloaded lesson from your device?';
    if (confirm(confirmMsg)) {
      await deleteOfflinePackage(chapterId);
      await loadPackages();
    }
  };

  const handleDeleteAll = async () => {
    const confirmMsg =
      lang === 'am'
        ? 'ሁሉንም የወረዱ ትምህርቶች ከመሣሪያዎ ላይ ማስወገድ ይፈልጋሉ? ይህ ተግባር አይመለስም።'
        : 'Are you sure you want to delete all offline downloaded lessons? This action cannot be undone.';
    if (confirm(confirmMsg)) {
      for (const p of packages) {
        await deleteOfflinePackage(p.chapterId);
      }
      await loadPackages();
    }
  };

  // Distinct grades for filter pills
  const availableGrades = useMemo(() => {
    const gradeSet = new Set<number>();
    packages.forEach((p) => {
      if (typeof p.manifest?.gradeLevel === 'number') {
        gradeSet.add(p.manifest.gradeLevel);
      }
    });
    return Array.from(gradeSet).sort((a, b) => a - b);
  }, [packages]);

  // Filtered and sorted packages
  const filteredPackages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = packages.filter((pkg) => {
      const manifest = pkg.manifest;
      if (!manifest) return false;

      // Grade level filter
      if (selectedGrade !== 'all') {
        const gradeNum = parseInt(selectedGrade, 10);
        if (manifest.gradeLevel !== gradeNum) return false;
      }

      // Search query
      if (query) {
        const titleEn = (manifest.chapterTitle || '').toLowerCase();
        const titleAm = (manifest.amharicChapterTitle || '').toLowerCase();
        const subjectEn = (manifest.subjectName || '').toLowerCase();
        const subjectAm = (manifest.amharicSubjectName || '').toLowerCase();

        const match =
          titleEn.includes(query) ||
          titleAm.includes(query) ||
          subjectEn.includes(query) ||
          subjectAm.includes(query);

        if (!match) return false;
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.downloadedAt).getTime() - new Date(b.downloadedAt).getTime();
      }
      if (sortBy === 'size_desc') {
        return (b.manifest?.totalSizeBytes || 0) - (a.manifest?.totalSizeBytes || 0);
      }
      if (sortBy === 'size_asc') {
        return (a.manifest?.totalSizeBytes || 0) - (b.manifest?.totalSizeBytes || 0);
      }
      if (sortBy === 'title') {
        const titleA = pick(a.manifest?.amharicChapterTitle, a.manifest?.chapterTitle) || '';
        const titleB = pick(b.manifest?.amharicChapterTitle, b.manifest?.chapterTitle) || '';
        return titleA.localeCompare(titleB);
      }
      return 0;
    });
  }, [packages, searchQuery, selectedGrade, sortBy, pick]);

  const totalBytes = packages.reduce((acc, p) => acc + (p.manifest?.totalSizeBytes || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs text-stone-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 flex items-center space-x-1 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'am' ? 'ወደ ማውጫ ተመለስ' : 'Back to Curriculum'}</span>
          </Link>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white flex items-center space-x-2">
            <Download className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'am' ? 'የወረዱ መጻሕፍት ማኔጀር' : 'Download Manager'}</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
            {lang === 'am'
              ? 'ያለ ኢንተርኔት ከመስመር ውጭ የሚገኙ የትምህርት ክፍሎች'
              : 'Lessons available offline without an internet connection'}
          </p>
        </div>

        {/* Total Storage Badge & Clear All */}
        <div className="flex items-center space-x-2.5">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-stone-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
            <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="text-[10px] text-stone-400 dark:text-slate-500 block uppercase font-bold">
                {lang === 'am' ? 'የተያዘ ቦታ' : 'Used Storage'}
              </span>
              <span className="font-bold text-stone-800 dark:text-white text-sm">
                {totalMB} MB ({packages.length} {lang === 'am' ? 'ምዕራፎች' : 'chapters'})
              </span>
            </div>
          </div>

          {packages.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              title={lang === 'am' ? 'ሁሉንም የወረዱ ሰርዝ' : 'Delete all downloads'}
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">{lang === 'am' ? 'ሁሉንም አፅዳ' : 'Clear All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      {packages.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-stone-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  lang === 'am'
                    ? 'በርዕስ ወይም በትምህርት ዓይነት ፈልግ...'
                    : 'Search by chapter or subject title...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-lg text-xs text-stone-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition placeholder:text-stone-400 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500 hover:text-stone-600 dark:hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center space-x-1.5 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-stone-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="recent" className="dark:bg-slate-900">{lang === 'am' ? 'በቅርቡ የወረዱ' : 'Recently Downloaded'}</option>
                <option value="oldest" className="dark:bg-slate-900">{lang === 'am' ? 'ቀደምት የወረዱ' : 'Oldest First'}</option>
                <option value="size_desc" className="dark:bg-slate-900">{lang === 'am' ? 'መጠን (ከከፍተኛ)' : 'Size: Largest'}</option>
                <option value="size_asc" className="dark:bg-slate-900">{lang === 'am' ? 'መጠን (ከዝቅተኛ)' : 'Size: Smallest'}</option>
                <option value="title" className="dark:bg-slate-900">{lang === 'am' ? 'ርዕስ (ፊደል ቅደም ተከተል)' : 'Title (A-Z)'}</option>
              </select>
            </div>
          </div>

          {/* Grade Filter Pills */}
          {availableGrades.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-stone-400 dark:text-slate-500 mr-1 flex items-center">
                <Filter className="w-3 h-3 mr-1" />
                {lang === 'am' ? 'ክፍል:' : 'Grade:'}
              </span>

              <button
                onClick={() => setSelectedGrade('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedGrade === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
                }`}
              >
                {lang === 'am' ? 'ሁሉም ክፍሎች' : 'All Grades'} ({packages.length})
              </button>

              {availableGrades.map((grade) => {
                const count = packages.filter((p) => p.manifest?.gradeLevel === grade).length;
                const isSelected = selectedGrade === String(grade);
                return (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(String(grade))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {lang === 'am' ? `ክፍል ${grade}` : `Grade ${grade}`} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl text-center text-stone-500 dark:text-slate-400 border border-stone-200 dark:border-slate-800">
          {lang === 'am' ? 'በመጫን ላይ...' : 'Loading...'}
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl text-center border border-stone-200 dark:border-slate-800 space-y-4">
          <Download className="w-12 h-12 text-stone-300 dark:text-slate-600 mx-auto" />
          <h3 className="font-bold text-stone-700 dark:text-white text-lg">
            {lang === 'am' ? 'ምንም የወረደ ትምህርት የለም' : 'No Downloaded Lessons'}
          </h3>
          <p className="text-sm text-stone-500 dark:text-slate-400 max-w-sm mx-auto">
            {lang === 'am'
              ? 'የትምህርት ክፍሎችን በማውረድ ያለ ኢንተርኔት በየትኛውም ቦታ መማር ይችላሉ።'
              : 'Download lessons to study anywhere without an internet connection.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-eotc-navy dark:bg-amber-500 dark:text-slate-950 text-white text-sm font-semibold rounded-lg shadow hover:bg-slate-800 dark:hover:bg-amber-400 transition"
          >
            {lang === 'am' ? 'ትምህርቶችን እይ' : 'Browse Curriculum'}
          </Link>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl text-center border border-stone-200 dark:border-slate-800 space-y-3">
          <FileCheck2 className="w-10 h-10 text-stone-400 dark:text-slate-500 mx-auto" />
          <h3 className="font-bold text-stone-700 dark:text-white text-base">
            {lang === 'am' ? 'ከፍለጋዎ ጋር የሚዛመድ የወረደ ትምህርት አልተገኘም' : 'No matching downloaded lessons'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            {lang === 'am'
              ? 'እባክዎ የፍለጋ ቃላትን ወይም የክፍል ምርጫውን ያስተካክሉ።'
              : 'Try adjusting your search terms or grade filter.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGrade('all');
            }}
            className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            {lang === 'am' ? 'ማጣሪያዎችን አፅዳ' : 'Clear Filters'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-stone-500 dark:text-slate-400 px-1 font-medium">
            {lang === 'am'
              ? `${filteredPackages.length} የወረዱ ትምህርቶች ተገኝተዋል`
              : `Showing ${filteredPackages.length} of ${packages.length} downloaded lessons`}
          </div>

          {filteredPackages.map((pkg) => {
            const manifest = pkg.manifest;

            return (
              <div
                key={pkg.chapterId}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4 transition hover:border-amber-300 dark:hover:border-amber-500"
              >
                <div className="flex items-start space-x-3 min-w-0 max-w-full sm:max-w-[70%]">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300 mt-0.5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {lang === 'am' ? `ክፍል ${manifest.gradeLevel}` : `Grade ${manifest.gradeLevel}`} ·{' '}
                        {pick(manifest.amharicSubjectName, manifest.subjectName)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                        v{manifest.version}
                      </span>
                      {manifest.quizzes && manifest.quizzes.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                          {manifest.quizzes.length} {lang === 'am' ? 'ፈተናዎች' : 'Quizzes'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-stone-900 dark:text-white text-sm sm:text-base mt-0.5 truncate">
                      {pick(manifest.amharicChapterTitle, manifest.chapterTitle)}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                      {lang === 'am' ? 'መጠን:' : 'Size:'} {Math.round((manifest.totalSizeBytes || 0) / 1024)} KB ·{' '}
                      {lang === 'am' ? 'የወረደው:' : 'Downloaded:'}{' '}
                      {new Date(pkg.downloadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Link
                    href={`/chapters/${pkg.chapterId}`}
                    className="px-4 py-2 bg-eotc-gold dark:bg-amber-500 hover:bg-amber-400 text-eotc-navy dark:text-slate-950 font-bold text-xs rounded-lg transition shadow-xs"
                  >
                    {lang === 'am' ? 'ክፈት' : 'Study'}
                  </Link>

                  <button
                    onClick={() => handleDelete(pkg.chapterId)}
                    className="p-2 text-stone-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    title={lang === 'am' ? 'አስወግድ' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
