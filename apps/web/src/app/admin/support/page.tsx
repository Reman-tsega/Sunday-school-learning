'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  User,
  Church,
  Phone,
  Mail,
  Loader2,
  ChevronLeft,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type {
  SupportTicketItem,
  TicketStatus,
  TicketCategory,
} from '@eotc/shared';

export default function AdminSupportPage() {
  const { lang } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Ticket
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicketItem | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTickets = async (maintainSelection = true) => {
    try {
      setIsLoading(true);
      const res = await api.adminListTickets({
        status: (statusFilter as TicketStatus) || undefined,
        category: (categoryFilter as TicketCategory) || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setTickets(res.tickets || []);

      if (maintainSelection && selectedTicketId) {
        // Keep selected
      } else if (res.tickets && res.tickets.length > 0 && !selectedTicketId) {
        // Auto-select first ticket on wide screens
        const first = res.tickets[0];
        if (typeof window !== 'undefined' && window.innerWidth >= 768 && first) {
          handleSelectTicket(first.id);
        }
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ጥያቄዎችን መጫን አልተቻለም' : 'Failed to load tickets'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(false);
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTickets(false);
  };

  const handleSelectTicket = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsLoadingTicket(true);
    try {
      const details = await api.getTicketDetails(ticketId);
      setActiveTicket(details);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'የጥያቄውን ዝርዝር መጫን አልተቻለም' : 'Failed to load ticket details'),
      });
    } finally {
      setIsLoadingTicket(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;

    try {
      setIsSendingReply(true);
      const newMsg = await api.addTicketMessage(selectedTicketId, replyText.trim());
      setReplyText('');

      // Optimistically append message to active ticket
      if (activeTicket) {
        setActiveTicket({
          ...activeTicket,
          status: activeTicket.status === 'OPEN' ? 'IN_PROGRESS' : activeTicket.status,
          messages: [...(activeTicket.messages || []), newMsg],
          messagesCount: (activeTicket.messagesCount || 0) + 1,
        });
      }

      setActionNotice({
        type: 'success',
        text: lang === 'am' ? 'ምላሽዎ በተሳካ ሁኔታ ተልኳል!' : 'Reply sent successfully!',
      });
      setTimeout(() => setActionNotice(null), 3000);

      // Refresh list in background
      loadTickets(true);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ምላሽ መላክ አልተቻለም' : 'Failed to send reply'),
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicketId || !activeTicket) return;
    try {
      setIsUpdatingStatus(true);
      const updated = await api.adminUpdateTicketStatus(selectedTicketId, newStatus);
      setActiveTicket({
        ...activeTicket,
        status: updated.status,
      });

      // Update in local tickets list
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicketId ? { ...t, status: updated.status } : t))
      );

      setActionNotice({
        type: 'success',
        text:
          lang === 'am'
            ? `የጥያቄው ሁኔታ ወደ ${getStatusLabel(newStatus, lang)} ተቀይሯል።`
            : `Ticket status updated to ${getStatusLabel(newStatus, lang)}.`,
      });
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || (lang === 'am' ? 'ሁኔታ መቀየር አልተቻለም' : 'Failed to update status'),
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'CLOSED':
        return 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700';
      default:
        return 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-700';
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
        return currentLang === 'am' ? 'በሂደት ላይ' : 'In Progress';
      case 'RESOLVED':
        return currentLang === 'am' ? 'ተፈቷል' : 'Resolved';
      case 'CLOSED':
        return currentLang === 'am' ? 'ተዘግቷል' : 'Closed';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 mb-1">
            <MessageSquare className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              {lang === 'am' ? 'የእርዳታና ድጋፍ መስጫ ዴስክ' : 'Customer Support Desk'}
            </h1>
          </div>
          <p className="text-sm text-stone-500 dark:text-slate-400">
            {lang === 'am'
              ? 'ከተማሪዎች የሚቀርቡ የትምህርት፣ የቴክኒክና የመመዝገቢያ ጥያቄዎችን ይመልከቱና በቀጥታ ምላሽ ይስጡ።'
              : 'Review and reply to curriculum, technical, and enrollment inquiries from students.'}
          </p>
        </div>

        <button
          onClick={() => loadTickets(true)}
          className="self-start md:self-auto px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          <span>{lang === 'am' ? 'አድስ' : 'Refresh'}</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button onClick={() => setActionNotice(null)} className="text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left Column: Tickets List */}
        <div
          className={`md:col-span-5 flex flex-col space-y-3 ${
            selectedTicketId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl shadow-xs">
            {[
              { id: '', label: lang === 'am' ? 'ሁሉም' : 'All' },
              { id: 'OPEN', label: lang === 'am' ? 'ክፍት' : 'Open' },
              { id: 'IN_PROGRESS', label: lang === 'am' ? 'በሂደት ላይ' : 'In Progress' },
              { id: 'RESOLVED', label: lang === 'am' ? 'ተፈቷል' : 'Resolved' },
              { id: 'CLOSED', label: lang === 'am' ? 'ተዘግቷል' : 'Closed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="grid grid-cols-2 gap-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'am' ? 'ፈልግ...' : 'Search...'}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-xs"
              />
            </form>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-2 px-3 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition shadow-xs"
            >
              <option value="">{lang === 'am' ? 'ሁሉም ዘርፎች' : 'All Categories'}</option>
              <option value="CURRICULUM">{lang === 'am' ? 'የትምህርት ይዘት' : 'Curriculum'}</option>
              <option value="TECHNICAL_OFFLINE">{lang === 'am' ? 'ቴክኒካል / ማውረድ' : 'Technical & Offline'}</option>
              <option value="ACCOUNT_ENROLLMENT">{lang === 'am' ? 'አካውንት እና ምዝገባ' : 'Account & Enrollment'}</option>
              <option value="GENERAL">{lang === 'am' ? 'አጠቃላይ' : 'General'}</option>
            </select>
          </div>

          {/* Tickets Scroll Area */}
          <div className="flex-1 bg-white/60 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-800 rounded-2xl overflow-y-auto max-h-[600px] divide-y divide-stone-200 dark:divide-slate-800/60 p-2 space-y-1.5 shadow-xs">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-stone-500 dark:text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">{lang === 'am' ? 'ጥያቄዎች በመጫን ላይ...' : 'Loading inquiries...'}</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-stone-500 dark:text-slate-400 text-xs space-y-1">
                <p className="font-semibold text-stone-700 dark:text-slate-300">
                  {lang === 'am' ? 'ምንም ጥያቄ አልተገኘም' : 'No tickets match filter'}
                </p>
                <p>{lang === 'am' ? 'ማጣሪያውን ቀይረው ይሞክሩ' : 'Try clearing filters'}</p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t.id)}
                  className={`p-3 rounded-xl cursor-pointer transition border ${
                    selectedTicketId === t.id
                      ? 'bg-amber-500/10 dark:bg-slate-800 border-amber-500/50 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800/80 hover:bg-stone-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
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

                  <p className="text-sm font-bold text-stone-900 dark:text-white line-clamp-1 mb-1">{t.subject}</p>

                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400 mb-1.5">
                    <span className="font-semibold text-stone-700 dark:text-slate-300">{t.userName}</span>
                    <span className="text-[11px] text-stone-400 dark:text-slate-500">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {t.churchParish && (
                    <div className="flex items-center space-x-1 text-[11px] text-amber-700 dark:text-amber-300/80 mb-1.5">
                      <Church className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">{t.churchParish}</span>
                    </div>
                  )}

                  {t.lastMessageSnippet && (
                    <p className="text-xs text-stone-600 dark:text-slate-400 line-clamp-2 bg-stone-50 dark:bg-slate-950/60 p-1.5 rounded-lg border border-stone-200 dark:border-slate-800/50">
                      {t.lastMessageSnippet}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Ticket Conversation & Reply */}
        <div
          className={`md:col-span-7 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xs ${
            !selectedTicketId ? 'hidden md:flex items-center justify-center' : 'flex'
          }`}
        >
          {!selectedTicketId ? (
            <div className="text-center p-12 text-stone-400 dark:text-slate-500 space-y-3">
              <MessageSquare className="w-12 h-12 mx-auto text-stone-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-stone-600 dark:text-slate-400">
                {lang === 'am'
                  ? 'ዝርዝሩን ለማየት እና ምላሽ ለመስጠት ከግራ በኩል ጥያቄ ይምረጡ'
                  : 'Select a support ticket from the left to read and reply'}
              </p>
            </div>
          ) : isLoadingTicket ? (
            <div className="py-24 flex flex-col items-center justify-center text-stone-500 dark:text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs">{lang === 'am' ? 'ውይይቱ በመጫን ላይ...' : 'Loading conversation...'}</p>
            </div>
          ) : activeTicket ? (
            <>
              {/* Ticket Header & Status Switcher */}
              <div className="p-4 border-b border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedTicketId(null)}
                      className="md:hidden p-1 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 rounded-lg hover:text-stone-900 dark:hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      #{activeTicket.ticketNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700 flex items-center space-x-1">
                      <Tag className="w-2.5 h-2.5 text-amber-500" />
                      <span>{getCategoryLabel(activeTicket.category, lang)}</span>
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-white leading-tight">
                    {activeTicket.subject}
                  </h2>
                </div>

                {/* Status Switcher Dropdown */}
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                    {lang === 'am' ? 'ሁኔታ፦' : 'Status:'}
                  </span>
                  <select
                    value={activeTicket.status}
                    disabled={isUpdatingStatus}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    className="py-1.5 px-3 bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-800 rounded-xl text-xs font-bold text-stone-900 dark:text-white focus:outline-none focus:border-amber-500 transition cursor-pointer shadow-xs"
                  >
                    <option value="OPEN">{lang === 'am' ? 'ክፍት (Open)' : 'Open'}</option>
                    <option value="IN_PROGRESS">{lang === 'am' ? 'በሂደት ላይ (In Progress)' : 'In Progress'}</option>
                    <option value="RESOLVED">{lang === 'am' ? 'ተፈቷል (Resolved)' : 'Resolved'}</option>
                    <option value="CLOSED">{lang === 'am' ? 'ተዘግቷል (Closed)' : 'Closed'}</option>
                  </select>
                </div>
              </div>

              {/* Student Context Card */}
              <div className="px-4 py-2.5 bg-stone-50 dark:bg-slate-950/40 border-b border-stone-200 dark:border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 dark:text-slate-400">
                <span className="flex items-center text-stone-900 dark:text-slate-200 font-semibold">
                  <User className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                  {activeTicket.userName}
                </span>
                <span className="flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-1 text-stone-400 dark:text-slate-500" />
                  {activeTicket.userEmail}
                </span>
                {activeTicket.phoneNumber && (
                  <span className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1 text-stone-400 dark:text-slate-500" />
                    {activeTicket.phoneNumber}
                  </span>
                )}
                {activeTicket.churchParish && (
                  <span className="flex items-center text-amber-700 dark:text-amber-300">
                    <Church className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                    {activeTicket.churchParish}
                  </span>
                )}
              </div>

              {/* Message Thread History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[380px] bg-stone-50/40 dark:bg-slate-950/20">
                {activeTicket.messages?.map((msg) => {
                  const isAdmin = msg.senderRole === 'ADMIN';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-2 mb-1 px-1 text-[11px]">
                        <span className="font-bold text-stone-700 dark:text-slate-300">
                          {isAdmin ? (lang === 'am' ? 'የአስተዳዳሪ ምላሽ' : 'Admin Support') : msg.senderName}
                        </span>
                        <span className="text-stone-400 dark:text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-xs ${
                          isAdmin
                            ? 'bg-amber-500 text-slate-950 rounded-tr-none font-medium'
                            : 'bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-100 rounded-tl-none border border-stone-200 dark:border-slate-700/80'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/80">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      lang === 'am'
                        ? 'ለተማሪው ይፋዊ ምላሽ እዚህ ይጻፉ...'
                        : 'Type an official support reply to the student...'
                    }
                    className="w-full p-3 pr-24 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="absolute right-2.5 bottom-3.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition flex items-center space-x-1.5 shadow-xs"
                  >
                    {isSendingReply ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{lang === 'am' ? 'ምላሽ ላክ' : 'Send'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
