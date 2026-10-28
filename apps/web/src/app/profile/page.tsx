'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  ArrowLeft,
  Mail,
  Shield,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type { UserProfile, StudentEnrollmentItem } from '@eotc/shared';

export default function ProfilePage() {
  const router = useRouter();
  const { lang, pick } = useLanguage();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<string>('');
  const [address, setAddress] = useState('');
  const [baptismalName, setBaptismalName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [churchParish, setChurchParish] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      await api.init();
      const currentUser = api.getUser();
      if (!currentUser) {
        router.replace('/login');
        return;
      }

      setUser(currentUser);
      setFullName(currentUser.fullName || '');
      setAge(currentUser.age !== undefined && currentUser.age !== null ? String(currentUser.age) : '');
      setAddress(currentUser.address || '');
      setBaptismalName(currentUser.baptismalName || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setChurchParish(currentUser.churchParish || '');

      if (currentUser.role !== 'ADMIN') {
        const studentEnrollments = await api.getStudentEnrollments().catch(() => []);
        setEnrollments(studentEnrollments || []);
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage({
        type: 'error',
        text: lang === 'am' ? 'ሙሉ ስም ማስገባት ግዴታ ነው' : 'Full name is required',
      });
      return;
    }

    const parsedAge = age ? parseInt(age, 10) : undefined;
    if (parsedAge !== undefined && (isNaN(parsedAge) || parsedAge < 3 || parsedAge > 120)) {
      setMessage({
        type: 'error',
        text: lang === 'am' ? 'እባክዎ ትክክለኛ ዕድሜ ያስገቡ (ከ3 እስከ 120)' : 'Please enter a valid age (3-120)',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updated = await api.updateProfile({
        fullName: fullName.trim(),
        age: parsedAge,
        address: address.trim() || null,
        baptismalName: baptismalName.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        churchParish: churchParish.trim() || null,
      });

      setUser(updated);
      setMessage({
        type: 'success',
        text: lang === 'am' ? 'የግል መረጃዎ በተሳካ ሁኔታ ተሻሽሏል!' : 'Profile updated successfully!',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ማሻሻል አልተቻለም' : 'Failed to update profile'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
        <p className="text-xs">{lang === 'am' ? 'መረጃዎችን በመጫን ላይ...' : 'Loading profile...'}</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={user.role === 'ADMIN' ? '/admin' : '/'}
            className="text-xs font-semibold text-amber-700 hover:underline flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'am' ? 'ወደ ዋናው ገጽ ተመለስ' : 'Back to Home'}</span>
          </Link>
        </div>

        {/* User Header Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold text-stone-900">{user.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {user.role === 'ADMIN'
                    ? (lang === 'am' ? 'አስተዳዳሪ' : 'Admin')
                    : (lang === 'am' ? 'ተማሪ' : 'Student')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>{user.email}</span>
                </span>
                {user.churchParish && (
                  <span className="flex items-center space-x-1">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span>{user.churchParish}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Edit Form (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
              <User className="w-5 h-5 text-amber-600" />
              <span>{lang === 'am' ? 'የግል መረጃ ማሻሻያ' : 'Edit Profile Information'}</span>
            </h2>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'am' ? 'ሙሉ ስም *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Email (Readonly) */}
                <div>
                  <label className="block text-xs font-bold text-stone-400 mb-1">
                    {lang === 'am' ? 'ኢሜይል (መቀየር አይቻልም)' : 'Email (Cannot be changed)'}
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-500 cursor-not-allowed"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'am' ? 'ዕድሜ' : 'Age'}
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 18"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Baptismal Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'am' ? 'የክርስትና ስም' : 'Baptismal / Christian Name'}
                  </label>
                  <input
                    type="text"
                    value={baptismalName}
                    onChange={(e) => setBaptismalName(e.target.value)}
                    placeholder={lang === 'am' ? 'ኃይለ ማርያም' : 'Haile Maryam'}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0911223344"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Sunday School / Parish */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'am' ? 'ሰንበት ትምህርት ቤት ወይም አጥቢያ ቤተክርስቲያን' : 'Sunday School / Parish Church'}
                  </label>
                  <input
                    type="text"
                    value={churchParish}
                    onChange={(e) => setChurchParish(e.target.value)}
                    placeholder={lang === 'am' ? 'ደብረ ሰላም መድኃኔዓለም' : 'Debre Selam Medhanealem'}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'am' ? 'የመኖሪያ አድራሻ (ከተማ / ክፍለ ከተማ)' : 'Residence Address'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={lang === 'am' ? 'አዲስ አበባ፣ ቂርቆስ' : 'Addis Ababa, Kirkos'}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'am' ? 'በማስቀመጥ ላይ...' : 'Saving changes...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{lang === 'am' ? 'ለውጦችን መዝግብ' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Enrolled Grades Sidebar (1 Col) */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-amber-600" />
                <span>{lang === 'am' ? 'የተመዘገቡባቸው ክፍሎች' : 'Enrolled Grades'}</span>
              </h3>

              {enrollments.length === 0 ? (
                <div className="p-3 text-xs text-stone-500 bg-stone-50 rounded-xl text-center space-y-2">
                  <p>{lang === 'am' ? 'እስካሁን የተመዘገቡበት ክፍል የለም' : 'Not enrolled in any grades'}</p>
                  <Link
                    href="/"
                    className="inline-block text-xs font-bold text-amber-700 hover:underline"
                  >
                    {lang === 'am' ? 'ክፍሎችን ይመልከቱ' : 'Browse Grades'}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((enr) => (
                    <div
                      key={enr.id}
                      className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="font-semibold text-stone-900">
                        {pick(enr.gradeName, enr.amharicGradeName)}
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                        Grade {enr.gradeLevel}
                      </span>
                    </div>
                  ))}
                  <Link
                    href="/"
                    className="block text-center pt-2 text-xs font-bold text-amber-700 hover:underline"
                  >
                    {lang === 'am' ? 'ተጨማሪ ክፍል ለመመዝገብ ወደ ገጽ ሂድ' : 'Manage on Home Page'}
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 space-y-2 text-xs">
              <span className="font-bold text-stone-700 block mb-2">
                {lang === 'am' ? 'ፈጣን ማገናኛዎች' : 'Quick Actions'}
              </span>
              <Link
                href="/"
                className="flex items-center space-x-2 p-2 rounded-xl text-stone-600 hover:bg-stone-50 font-medium"
              >
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>{lang === 'am' ? 'ወደ ሥርዓተ ትምህርት' : 'Go to Curriculum'}</span>
              </Link>
              <Link
                href="/faq"
                className="flex items-center space-x-2 p-2 rounded-xl text-stone-600 hover:bg-stone-50 font-medium"
              >
                <Shield className="w-4 h-4 text-amber-500" />
                <span>{lang === 'am' ? 'ተደጋጋሚ ጥያቄዎች' : 'Read FAQs'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
