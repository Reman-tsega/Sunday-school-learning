'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Plus,
  Send,
  Loader2,
  ChevronLeft,
  LifeBuoy,
  X,
  HelpCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type {
  SupportTicketItem,
  TicketCategory,
  TicketStatus,
  UserProfile,
} from '@eotc/shared';

export default function StudentSupportPage() {
  const { lang } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal / Create Ticket state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: '',
    category: 'GENERAL' as TicketCategory,
    message: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Active Ticket Viewer state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicketItem | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Follow-up Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const checkAuthAndLoadTickets = async () => {
    try {
      setIsLoading(true);
      await api.init();
      const currentUser = api.getUser();
      setUser(currentUser);

      if (currentUser) {
        const myTickets = await api.getStudentTickets();
        setTickets(myTickets);
      }
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ጥያቄዎችን መጫን አልተቻለም' : 'Failed to load tickets'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoadTickets();
  }, []);

  const handleOpenThread = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsLoadingThread(true);
    try {
      const details = await api.getTicketDetails(ticketId);
      setActiveTicket(details);
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ውይይቱን መክፈት አልተቻለም' : 'Failed to load conversation'),
      });
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.subject.trim() || !createForm.message.trim()) return;

    try {
      setIsCreating(true);
      const newTicket = await api.createSupportTicket({
        subject: createForm.subject.trim(),
        category: createForm.category,
        message: createForm.message.trim(),
      });

      setTickets([newTicket, ...tickets]);
      setShowCreateModal(false);
      setCreateForm({ subject: '', category: 'GENERAL', message: '' });
      setSelectedTicketId(newTicket.id);
      setActiveTicket(newTicket);

      setStatusNotice({
        type: 'success',
        text:
          lang === 'am'
            ? 'ጥያቄዎ በተሳካ ሁኔታ ቀርቧል! አስተዳዳሪዎች ሲመልሱ እዚህ ያዩታል።'
            : 'Your support ticket was submitted! You will see administrator responses here.',
      });
      setTimeout(() => setStatusNotice(null), 5000);
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ጥያቄ ማቅረብ አልተቻለም' : 'Failed to create ticket'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    try {
      setIsSendingReply(true);
      const newMsg = await api.addTicketMessage(selectedTicketId, replyText.trim());
      setReplyText('');

      if (activeTicket) {
        setActiveTicket({
          ...activeTicket,
          messages: [...(activeTicket.messages || []), newMsg],
          messagesCount: (activeTicket.messagesCount || 0) + 1,
        });
      }

      setStatusNotice({
        type: 'success',
        text: lang === 'am' ? 'መልእክትዎ ተልኳል!' : 'Your message has been sent!',
      });
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'መልእክት መላክ አልተቻለም' : 'Failed to send message'),
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'CLOSED':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getCategoryLabel = (category: TicketCategory, currentLang: string) => {
    switch (category) {
      case 'CURRICULUM':
        return currentLang === 'am' ? 'የትምህርት ይዘት' : 'Curriculum';
      case 'TECHNICAL_OFFLINE':
        return currentLang === 'am' ? 'ቴክኒካል / ማውረድ' : 'Technical & Offline';
      case 'ACCOUNT_ENROLLMENT':
        return currentLang === 'am' ? 'አካውንት እና ምዝገባ' : 'Account & Enrollment';
      case 'GENERAL':
      default:
        return currentLang === 'am' ? 'አጠቃላይ' : 'General';
    }
  };

  const getStatusLabel = (status: TicketStatus, currentLang: string) => {
    switch (status) {
      case 'OPEN':
        return currentLang === 'am' ? 'ክፍት' : 'Open';
      case 'IN_PROGRESS':
        return currentLang === 'am' ? 'ምላሽ በመጠበቅ ላይ' : 'In Progress';
      case 'RESOLVED':
        return currentLang === 'am' ? 'ተፈቷል' : 'Resolved';
      case 'CLOSED':
        return currentLang === 'am' ? 'ተዘግቷል' : 'Closed';
      default:
        return status;
    }
  };

  if (!isLoading && !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <LifeBuoy className="w-16 h-16 text-amber-400 mx-auto" />
        <h1 className="text-2xl font-bold text-white">
          {lang === 'am' ? 'የእርዳታ መስኮት ለመጠቀም ይግቡ' : 'Sign in to access Helpdesk'}
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          {lang === 'am'
            ? 'ለትምህርት ክፍልዎ፣ ለፈተናዎች ወይም ለቴክኒካል ጉዳዮች ጥያቄ ለመጠየቅ እና ከአስተዳዳሪዎች ጋር ለመወያየት እባክዎ በአካውንትዎ ይግቡ።'
            : 'To submit support inquiries, report issues, and converse with platform administrators, please sign in.'}
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition inline-block shadow-lg"
          >
            {lang === 'am' ? 'ይግቡ' : 'Sign In'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-amber-400">
            <LifeBuoy className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {lang === 'am' ? 'የእርዳታና ድጋፍ መስኮት' : 'Student Support & Helpdesk'}
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            {lang === 'am'
              ? 'ስለ ስርዓተ ትምህርቱ፣ ስለ መጻሕፍት ማውረድ ወይም ስለ መለያዎ ማንኛውንም ጥያቄ ይጠይቁ፤ የአስተዳዳሪዎችን ይፋዊ ምላሽ እዚህ ያግኙ።'
              : 'Ask questions about curriculum, offline textbook downloads, or account enrollments, and receive verified answers from administrators.'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="self-start sm:self-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-2 transition shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'am' ? 'አዲስ ጥያቄ ጠይቅ' : 'Ask a Question'}</span>
        </button>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
            statusNotice.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : 'bg-red-950/90 border-red-800 text-red-200'
          }`}
        >
          <span>{statusNotice.text}</span>
          <button onClick={() => setStatusNotice(null)} className="text-slate-400 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[560px]">
        {/* Left Column: My Tickets List */}
        <div
          className={`md:col-span-5 flex flex-col space-y-3 ${
            selectedTicketId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-300 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>{lang === 'am' ? 'የእርስዎ ጥያቄዎች' : 'My Support Tickets'}</span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              {tickets.length} {lang === 'am' ? 'ጥያቄዎች' : 'tickets'}
            </span>
          </div>

          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-y-auto max-h-[560px] divide-y divide-slate-800/60 p-2 space-y-1.5 shadow-sm">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs">{lang === 'am' ? 'ጥያቄዎችዎን በመጫን ላይ...' : 'Loading your inquiries...'}</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-20 text-center text-slate-400 p-6 space-y-3">
                <HelpCircle className="w-12 h-12 mx-auto text-slate-600 mb-1" />
                <p className="font-semibold text-slate-300">
                  {lang === 'am' ? 'እስካሁን ምንም ጥያቄ አልጠየቁም' : 'No support tickets yet'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {lang === 'am'
                    ? 'ጥያቄ ወይም እርዳታ ካስፈለግዎ "አዲስ ጥያቄ ጠይቅ" የሚለውን ይጫኑ።'
                    : 'If you need help with anything, click "Ask a Question" above.'}
                </p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleOpenThread(t.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition border ${
                    selectedTicketId === t.id
                      ? 'bg-slate-800 border-amber-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      #{t.ticketNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                        t.status
                      )}`}
                    >
                      {getStatusLabel(t.status, lang)}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white line-clamp-1 mb-1">{t.subject}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                      {getCategoryLabel(t.category, lang)}
                    </span>
                    <span className="text-slate-500">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {t.lastMessageSnippet && (
                    <p className="text-xs text-slate-400 line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
                      {t.lastMessageSnippet}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Ticket Conversation Thread */}
        <div
          className={`md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl ${
            !selectedTicketId ? 'hidden md:flex items-center justify-center' : 'flex'
          }`}
        >
          {!selectedTicketId ? (
            <div className="text-center p-12 text-slate-500 space-y-3">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">
                {lang === 'am'
                  ? 'ዝርዝሩን ለማየት እና ምላሾችን ለማንበብ ከግራ በኩል ጥያቄዎን ይምረጡ'
                  : 'Select an inquiry from the left to read responses and follow up'}
              </p>
            </div>
          ) : isLoadingThread ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs">{lang === 'am' ? 'ውይይቱ በመጫን ላይ...' : 'Loading thread...'}</p>
            </div>
          ) : activeTicket ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedTicketId(null)}
                      className="md:hidden p-1 bg-slate-800 text-slate-300 rounded-lg hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      #{activeTicket.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {getCategoryLabel(activeTicket.category, lang)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {activeTicket.subject}
                  </h2>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider shrink-0 ${getStatusBadge(
                    activeTicket.status
                  )}`}
                >
                  {getStatusLabel(activeTicket.status, lang)}
                </span>
              </div>

              {/* Thread Conversation */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[360px] bg-slate-950/30">
                {activeTicket.messages?.map((msg) => {
                  const isAdmin = msg.senderRole === 'ADMIN';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center space-x-2 mb-1 px-1 text-[11px]">
                        <span className={`font-bold ${isAdmin ? 'text-amber-400' : 'text-slate-300'}`}>
                          {isAdmin
                            ? lang === 'am'
                              ? 'የአስተዳዳሪ ይፋዊ ምላሽ ✞'
                              : 'Admin Support Response ✞'
                            : lang === 'am'
                            ? 'የእርስዎ መልእክት'
                            : 'You'}
                        </span>
                        <span className="text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                          isAdmin
                            ? 'bg-amber-500/20 text-amber-100 border border-amber-500/40 rounded-tl-none font-medium'
                            : 'bg-slate-800 text-slate-100 rounded-tr-none border border-slate-700'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Composer */}
              <form onSubmit={handleSendFollowUp} className="p-3 border-t border-slate-800 bg-slate-950/80">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      lang === 'am'
                        ? 'ተጨማሪ ጥያቄ ወይም ምላሽ እዚህ ይጻፉ...'
                        : 'Type your reply or follow-up question here...'
                    }
                    className="w-full p-3 pr-24 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="absolute right-2.5 bottom-3.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition flex items-center space-x-1.5 shadow-md"
                  >
                    {isSendingReply ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{lang === 'am' ? 'ላክ' : 'Send'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>

      {/* New Support Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2 text-amber-400">
                <LifeBuoy className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">
                  {lang === 'am' ? 'አዲስ የእርዳታ ጥያቄ ያቅርቡ' : 'Submit Support Inquiry'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'am' ? 'የጥያቄው አርዕስት' : 'Subject'} *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  placeholder={
                    lang === 'am'
                      ? 'ምሳሌ፦ ምዕራፍ 2 መጽሐፍ ማውረድ አልቻልኩም'
                      : 'e.g. Cannot download Chapter 2 textbook'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'am' ? 'የጥያቄው ዘርፍ' : 'Category'} *
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, category: e.target.value as TicketCategory })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="GENERAL">{lang === 'am' ? 'አጠቃላይ (General)' : 'General'}</option>
                  <option value="CURRICULUM">
                    {lang === 'am' ? 'የትምህርት ይዘት (Curriculum)' : 'Curriculum'}
                  </option>
                  <option value="TECHNICAL_OFFLINE">
                    {lang === 'am' ? 'ቴክኒካል / ማውረድ (Technical & Offline)' : 'Technical & Offline'}
                  </option>
                  <option value="ACCOUNT_ENROLLMENT">
                    {lang === 'am' ? 'አካውንት እና ምዝገባ (Account & Enrollment)' : 'Account & Enrollment'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'am' ? 'የጥያቄው ዝርዝር መልእክት' : 'Detailed Message'} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  placeholder={
                    lang === 'am'
                      ? 'ያጋጠመዎትን ችግር ወይም ጥያቄዎን በዝርዝር እዚህ ይግለጹ...'
                      : 'Explain your question or problem in detail...'
                  }
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{lang === 'am' ? 'ጥያቄውን ላክ' : 'Submit Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
