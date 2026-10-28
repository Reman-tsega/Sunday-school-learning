'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

export default function AdminDashboardPage() {
  const { lang } = useLanguage();
  const [stats, setStats] = useState({
    totalUsers: 0,
    studentsCount: 0,
    teachersCount: 0,
    adminsCount: 0,
    gradesCount: 0,
    subjectsCount: 0,
    chaptersCount: 0,
    publishedCount: 0,
    draftCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        // Load Users
        const usersData = await api.getUsers({ limit: 100 }).catch(() => ({ users: [] }));
        const users = usersData.users || [];

        // Load Curriculum
        const curriculum = await api.getCurriculum().catch(() => []);

        let totalSubjects = 0;
        let totalChapters = 0;
        let publishedChapters = 0;

        for (const grade of curriculum) {
          if (grade.subjects) {
            totalSubjects += grade.subjects.length;
            for (const subject of grade.subjects) {
              if (subject.chapters) {
                totalChapters += subject.chapters.length;
                for (const ch of subject.chapters) {
                  if (ch.isPublished) publishedChapters++;
                }
              }
            }
          }
        }

        setStats({
          totalUsers: users.length,
          studentsCount: users.filter((u: any) => u.role === 'STUDENT').length,
          teachersCount: users.filter((u: any) => u.role === 'TEACHER').length,
          adminsCount: users.filter((u: any) => u.role === 'ADMIN').length,
          gradesCount: curriculum.length,
          subjectsCount: totalSubjects,
          chaptersCount: totalChapters,
          publishedCount: publishedChapters,
          draftCount: totalChapters - publishedChapters,
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
          {lang === 'am' ? 'የአስተዳዳሪ መቆጣጠሪያ ሰሌዳ' : 'Admin Dashboard'}
        </h1>
        <p className="text-stone-500 dark:text-slate-400 text-sm mt-1">
          {lang === 'am'
            ? 'የሰንበት ትምህርት ቤት ስርዓተ ትምህርት፣ ተማሪዎች፣ መምህራን እና የመማሪያ ፓኬጆች አጠቃላይ እይታ'
            : 'Comprehensive overview of Sunday School curriculum, students, teachers, and published packages'}
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'am' ? 'ተጠቃሚዎች' : 'Users'}
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-3">
            {isLoading ? '...' : stats.totalUsers}
          </div>
          <div className="text-xs text-stone-500 dark:text-slate-400 mt-2 flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {stats.studentsCount} {lang === 'am' ? 'ተማሪዎች' : 'Students'}
            </span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {stats.teachersCount} {lang === 'am' ? 'መምህራን' : 'Teachers'}
            </span>
          </div>
        </div>

        {/* Grades & Subjects */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'am' ? 'ክፍሎችና የትምህርት ዓይነቶች' : 'Grades & Subjects'}
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-3">
            {isLoading
              ? '...'
              : lang === 'am'
              ? `${stats.gradesCount} ክፍሎች`
              : `${stats.gradesCount} Grades`}
          </div>
          <div className="text-xs text-stone-500 dark:text-slate-400 mt-2">
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              {stats.subjectsCount} {lang === 'am' ? 'የትምህርት ዓይነቶች' : 'Subjects'}
            </span>
          </div>
        </div>

        {/* Total Chapters */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'am' ? 'ምዕራፎች' : 'Chapters'}
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-3">
            {isLoading ? '...' : stats.chaptersCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-slate-400 mt-2">
            <span>
              {lang === 'am'
                ? 'በስርዓተ ትምህርቱ የተዘጋጁ ምዕራፎች'
                : 'Total curriculum chapters structured'}
            </span>
          </div>
        </div>

        {/* Published Packages */}
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'am' ? 'የታተሙ ፓኬጆች' : 'Published Packages'}
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-3">
            {isLoading ? '...' : stats.publishedCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-slate-400 mt-2 flex items-center space-x-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {lang === 'am' ? 'የታተሙ' : 'Published'}
            </span>
            {stats.draftCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {stats.draftCount} {lang === 'am' ? 'በዝግጅት ላይ' : 'Drafts'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>{lang === 'am' ? 'ፈጣን የአስተዳዳሪ ተግባራት' : 'Quick Actions'}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="flex items-start space-x-3.5 p-4 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 transition group shadow-2xs"
          >
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 transition">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-800 group-hover:text-stone-950 dark:text-slate-200 dark:group-hover:text-white">
                {lang === 'am' ? 'ተጠቃሚ መዝግብ' : 'Add User'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                {lang === 'am'
                  ? 'አዲስ ተማሪዎችን ወይም መምህራንን ይመዝግቡ፣ ሚናዎችን ይመድቡ።'
                  : 'Register students or teachers and manage accounts.'}
              </p>
            </div>
          </Link>

          <Link
            href="/admin/curriculum"
            className="flex items-start space-x-3.5 p-4 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 transition group shadow-2xs"
          >
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-800 group-hover:text-stone-950 dark:text-slate-200 dark:group-hover:text-white">
                {lang === 'am' ? 'ስርዓተ ትምህርት አዘጋጅ' : 'Curriculum Studio'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                {lang === 'am'
                  ? 'ክፍሎችን፣ የትምህርት አይነቶችንና ምዕራፎችን ያስተዳድሩ።'
                  : 'Manage grades, subjects, and chapters.'}
              </p>
            </div>
          </Link>

          <Link
            href="/admin/curriculum"
            className="flex items-start space-x-3.5 p-4 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-700/60 transition group shadow-2xs"
          >
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-stone-800 group-hover:text-stone-950 dark:text-slate-200 dark:group-hover:text-white">
                {lang === 'am' ? 'መማሪያዎችን እዘዝ' : 'Publish Content'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                {lang === 'am'
                  ? 'የመማሪያ መጽሐፍት ገጾችን፣ ፈተናዎችንና አጋዥ መረጃዎችን ያትሙ።'
                  : 'Publish textbook pages, quizzes, and resources.'}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Curriculum Overview Status Table */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              {lang === 'am' ? 'የስርዓተ ትምህርቱ ዝርዝር ሁኔታ' : 'Curriculum Overview Status'}
            </h2>
          </div>
          <Link
            href="/admin/curriculum"
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold flex items-center space-x-1"
          >
            <span>{lang === 'am' ? 'ሁሉንም ተመልከት' : 'View All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-5 text-sm text-stone-700 dark:text-slate-300">
          <p className="text-stone-600 dark:text-slate-400 mb-4 leading-relaxed">
            {lang === 'am'
              ? 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን የሰንበት ትምህርት ቤት አንድነት ስርዓተ ትምህርት ከክፍል ፩ እስከ ፲፪ ተዘጋጅቷል። እያንዳንዱ ምዕራፍ ተማሪዎች ከመስመር ውጭ እንዲያጠኑት የተፈተነ የመማሪያ ፓኬጅ ይዟል።'
              : 'The Ethiopian Orthodox Tewahedo Church Sunday School curriculum is structured from Grade 1 to 12. Each chapter provides an offline-ready package.'}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <span className="flex items-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {lang === 'am' ? 'የመጽሐፍ ገጾች ተቆርጠዋል' : 'Clamped PDF Pages'}
            </span>
            <span className="flex items-center text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {lang === 'am' ? 'የልምምድ ፈተናዎች ተዘጋጅተዋል' : 'Practice Quizzes'}
            </span>
            <span className="flex items-center text-amber-600 dark:text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {lang === 'am' ? 'SHA-256 ይዘት ተረጋግጧል' : 'SHA-256 Verified Manifest'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
