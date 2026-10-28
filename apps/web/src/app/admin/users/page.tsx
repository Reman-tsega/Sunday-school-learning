'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  KeyRound,
  Shield,
  Loader2,
  AlertCircle,
  Church,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

export default function AdminUsersPage() {
  const { lang } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [roleChangeUser, setRoleChangeUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState('STUDENT');

  const [parishModalUser, setParishModalUser] = useState<any | null>(null);
  const [parishInput, setParishInput] = useState('');

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getUsers({
        role: roleFilter || undefined,
        search: searchQuery || undefined,
        limit: 100,
      });
      setUsers(data.users || []);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ተጠቃሚዎችን መጫን አልተቻለም' : 'Failed to load users'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await api.updateUserStatus(user.id, !user.isActive);
      setActionMessage({
        type: 'success',
        text:
          lang === 'am'
            ? `የተጠቃሚ ${user.fullName} ሁኔታ ወደ ${!user.isActive ? 'ንቁ' : 'የታገደ'} ተቀይሯል።`
            : `User ${user.fullName} status changed to ${!user.isActive ? 'Active' : 'Inactive'}.`,
      });
      loadUsers();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ሁኔታውን መቀየር አልተቻለም' : 'Failed to change status'),
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createUser(createForm);
      setShowCreateModal(false);
      setCreateForm({ fullName: '', email: '', password: '', role: 'STUDENT' });
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'አዲስ ተጠቃሚ በተሳካ ሁኔታ ተመዝግቧል!' : 'New user created successfully!',
      });
      loadUsers();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ተጠቃሚ መመዝገብ አልተቻለም' : 'Failed to create user'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUserId || newPassword.length < 8) return;
    try {
      setIsSubmitting(true);
      await api.resetUserPassword(passwordResetUserId, newPassword);
      setPasswordResetUserId(null);
      setNewPassword('');
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'የተጠቃሚው የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል!' : 'Password reset successfully!',
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'የይለፍ ቃል መቀየር አልተቻለም' : 'Failed to reset password'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleChangeUser) return;
    try {
      setIsSubmitting(true);
      await api.updateUserRole(roleChangeUser.id, selectedRole);
      setRoleChangeUser(null);
      setActionMessage({
        type: 'success',
        text: lang === 'am' ? 'የተጠቃሚው ሚና በተሳካ ሁኔታ ተቀይሯል!' : 'User role updated successfully!',
      });
      loadUsers();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ሚና መቀየር አልተቻለም' : 'Failed to update role'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateParish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parishModalUser) return;
    try {
      setIsSubmitting(true);
      await api.assignTeacherParish(parishModalUser.id, parishInput.trim());
      setParishModalUser(null);
      setActionMessage({
        type: 'success',
        text:
          lang === 'am'
            ? `የተጠቃሚ ${parishModalUser.fullName} ደብር/ሰንበት ት/ቤት ተመድቧል!`
            : `Sunday School Parish successfully assigned for ${parishModalUser.fullName}!`,
      });
      loadUsers();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ደብር መመደብ አልተቻለም' : 'Failed to assign parish'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'am' ? 'የተጠቃሚዎች አስተዳደር' : 'User Management'}</span>
          </h1>
          <p className="text-stone-500 dark:text-slate-400 text-sm mt-1">
            {lang === 'am'
              ? 'የተማሪዎች፣ መምህራን እና የአስተዳዳሪ አካውንቶችን መፍጠር፣ መቆጣጠር እና ማስተካከል'
              : 'Create, monitor, and manage student, teacher, and administrator accounts'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{lang === 'am' ? 'አዲስ ተጠቃሚ መዝግብ' : 'Add New User'}</span>
        </button>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white"
          >
            {lang === 'am' ? 'ዝጋ' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        {/* Role Filters */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {[
            { label: lang === 'am' ? 'ሁሉም' : 'All', value: '' },
            { label: lang === 'am' ? 'ተማሪዎች' : 'Students', value: 'STUDENT' },
            { label: lang === 'am' ? 'መምህራን' : 'Teachers', value: 'TEACHER' },
            { label: lang === 'am' ? 'አስተዳዳሪዎች' : 'Admins', value: 'ADMIN' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                roleFilter === tab.value
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 dark:text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={lang === 'am' ? 'በስም ወይም በኢሜይል ፈልግ...' : 'Search by name or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700 transition cursor-pointer"
          >
            {lang === 'am' ? 'ፈልግ' : 'Search'}
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-stone-500 dark:text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500 dark:text-amber-400" />
            <span>{lang === 'am' ? 'ተጠቃሚዎችን በመጫን ላይ...' : 'Loading users...'}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-stone-500 dark:text-slate-400">
            <Users className="w-10 h-10 text-stone-300 dark:text-slate-600 mx-auto mb-3" />
            <p>{lang === 'am' ? 'ምንም ተጠቃሚ አልተገኘም።' : 'No users found.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 text-xs uppercase text-stone-600 dark:text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3">{lang === 'am' ? 'ሙሉ ስም' : 'Full Name'}</th>
                  <th className="px-5 py-3">{lang === 'am' ? 'ኢሜይል' : 'Email'}</th>
                  <th className="px-5 py-3">{lang === 'am' ? 'ሚና' : 'Role'}</th>
                  <th className="px-5 py-3">{lang === 'am' ? 'ደብር / ሰንበት ት/ቤት' : 'Parish / Sunday School'}</th>
                  <th className="px-5 py-3">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  <th className="px-5 py-3 text-right">{lang === 'am' ? 'ተግባራት' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-medium text-stone-900 dark:text-white flex items-center space-x-2">
                      <span>{u.fullName}</span>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 dark:text-slate-400 font-mono text-xs">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40'
                            : u.role === 'TEACHER'
                            ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40'
                            : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40'
                        }`}
                      >
                        {u.role === 'ADMIN'
                          ? (lang === 'am' ? 'አስተዳዳሪ' : 'Admin')
                          : u.role === 'TEACHER'
                          ? (lang === 'am' ? 'መምህር' : 'Teacher')
                          : (lang === 'am' ? 'ተማሪ' : 'Student')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {u.churchParish ? (
                        <span className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 rounded flex items-center space-x-1 w-fit">
                          <Church className="w-3 h-3 shrink-0" />
                          <span>{u.churchParish}</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 dark:text-slate-500 italic">
                          {lang === 'am' ? 'ያልተመደበ' : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium ${
                          u.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-transparent'
                            : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-transparent'
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" /> {lang === 'am' ? 'ንቁ' : 'Active'}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" /> {lang === 'am' ? 'የታገደ' : 'Inactive'}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                      {/* Assign Parish Button */}
                      <button
                        onClick={() => {
                          setParishModalUser(u);
                          setParishInput(u.churchParish || '');
                        }}
                        title={lang === 'am' ? 'ደብር / ሰንበት ት/ቤት መድብ' : 'Assign Sunday School Parish'}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800 transition cursor-pointer"
                      >
                        <Church className="w-3 h-3 inline mr-1" />
                        <span>{lang === 'am' ? 'ደብር' : 'Parish'}</span>
                      </button>

                      {/* Toggle status */}
                      <button
                        onClick={() => handleToggleStatus(u)}
                        title={
                          u.isActive
                            ? (lang === 'am' ? 'አግድ' : 'Deactivate')
                            : (lang === 'am' ? 'አንቃ' : 'Activate')
                        }
                        className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                          u.isActive
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60 dark:border-red-800'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 dark:border-emerald-800'
                        }`}
                      >
                        {u.isActive
                          ? (lang === 'am' ? 'አግድ' : 'Deactivate')
                          : (lang === 'am' ? 'አንቃ' : 'Activate')}
                      </button>

                      {/* Change Role */}
                      <button
                        onClick={() => {
                          setRoleChangeUser(u);
                          setSelectedRole(u.role);
                        }}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 transition cursor-pointer"
                      >
                        {lang === 'am' ? 'ሚና ቀይር' : 'Change Role'}
                      </button>

                      {/* Reset Password */}
                      <button
                        onClick={() => {
                          setPasswordResetUserId(u.id);
                          setNewPassword('');
                        }}
                        className="p-1 rounded text-stone-400 hover:text-amber-600 hover:bg-stone-100 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-slate-800 transition inline-block align-middle cursor-pointer"
                        title={lang === 'am' ? 'የይለፍ ቃል ቀይር' : 'Reset Password'}
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'አዲስ ተጠቃሚ መዝግብ' : 'Create New User'}</span>
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ሙሉ ስም' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder={lang === 'am' ? 'ለምሳሌ፡ ዮሐንስ ዳዊት' : 'e.g. Yohannes Dawit'}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ኢሜይል አድራሻ' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@eotc-andnet.org"
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የይለፍ ቃል (ቢያንስ 8 ፊደላት)' : 'Password (min 8 chars)'}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'ሚና' : 'Role'}
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="STUDENT">{lang === 'am' ? 'ተማሪ' : 'Student'}</option>
                  <option value="TEACHER">{lang === 'am' ? 'መምህር' : 'Teacher'}</option>
                  <option value="ADMIN">{lang === 'am' ? 'አስተዳዳሪ' : 'Admin'}</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  <span>{lang === 'am' ? 'መዝግብ' : 'Register'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordResetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'የይለፍ ቃል ቀይር' : 'Reset Password'}</span>
            </h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'አዲስ የይለፍ ቃል' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder={lang === 'am' ? 'ቢያንስ 8 ፊደላት' : 'At least 8 characters'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setPasswordResetUserId(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPassword.length < 8}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ቀይር' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'የተጠቃሚ ሚና ቀይር' : 'Change User Role'}</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {lang === 'am' ? 'ተጠቃሚ፡' : 'User:'} <strong className="text-stone-900 dark:text-white">{roleChangeUser.fullName}</strong>
            </p>
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'አዲስ ሚና ምረጥ' : 'Select New Role'}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="STUDENT">{lang === 'am' ? 'ተማሪ' : 'Student'}</option>
                  <option value="TEACHER">{lang === 'am' ? 'መምህር' : 'Teacher'}</option>
                  <option value="ADMIN">{lang === 'am' ? 'አስተዳዳሪ' : 'Admin'}</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRoleChangeUser(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'አረጋግጥ' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SUNDAY SCHOOL PARISH MODAL */}
      {parishModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Church className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'am' ? 'ሰንበት ት/ቤት / ደብር መድብ' : 'Assign Sunday School Parish'}</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              {lang === 'am' ? 'ተጠቃሚ፡' : 'User:'} <strong className="text-stone-900 dark:text-white">{parishModalUser.fullName}</strong> ({parishModalUser.role})
            </p>
            <form onSubmit={handleUpdateParish} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  {lang === 'am' ? 'የሰንበት ትምህርት ቤት / የደብር ስም *' : 'Parish / Sunday School Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'am' ? 'ምሳሌ፡ ደብረ ሲና እግዝእትነ ማርያም' : 'e.g. Debre Sina St. Mary'}
                  value={parishInput}
                  onChange={(e) => setParishInput(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-stone-500 dark:text-slate-500 mt-1">
                  {lang === 'am'
                    ? 'መምህሩ በዚህ ደብር የተመዘገቡ ተማሪዎችን ብቻ ማየትና መከታተል ይችላል።'
                    : 'The teacher will be scoped to access and monitor students in this Sunday School.'}
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setParishModalUser(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm transition cursor-pointer"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !parishInput.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm disabled:opacity-50 transition cursor-pointer"
                >
                  {lang === 'am' ? 'መድብ' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
