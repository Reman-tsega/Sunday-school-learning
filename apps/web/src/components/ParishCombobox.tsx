'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import type { ParishDto } from '@eotc/shared';
import {
  Church,
  Search,
  Check,
  ChevronsUpDown,
  X,
  PlusCircle,
  MapPin,
} from 'lucide-react';

export interface ParishComboboxProps {
  value?: string | null;
  parishId?: string | null;
  onChange: (churchParish: string, parishId?: string | null) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function ParishCombobox({
  value = '',
  parishId = null,
  onChange,
  placeholder = 'ደብር ወይም ሰንበት ትምህርት ቤት ይምረጡ / ፈልጉ...',
  label = 'ደብርና ሰንበት ትምህርት ቤት (Sunday School)',
  helperText,
  required = false,
  disabled = false,
  className = '',
}: ParishComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [parishes, setParishes] = useState<ParishDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial parish list
  useEffect(() => {
    let isMounted = true;
    async function loadParishes() {
      try {
        setIsLoading(true);
        const res = await api.getParishes({ limit: 150 });
        if (isMounted && res?.parishes) {
          setParishes(res.parishes);
        }
      } catch (err) {
        console.warn('Could not preload parishes from API:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadParishes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter parishes locally based on query (supports Amharic and English)
  const filteredParishes = useMemo(() => {
    if (!searchTerm.trim()) {
      return parishes;
    }
    const term = searchTerm.toLowerCase().trim();
    return parishes.filter((p) => {
      const matchAmharic = p.amharicName?.toLowerCase().includes(term);
      const matchName = p.name?.toLowerCase().includes(term);
      const matchSundaySchool = p.sundaySchoolName?.toLowerCase().includes(term);
      const matchSubCity = p.subCity?.toLowerCase().includes(term);
      const matchDiocese = p.diocese?.toLowerCase().includes(term);
      return matchAmharic || matchName || matchSundaySchool || matchSubCity || matchDiocese;
    });
  }, [parishes, searchTerm]);

  // Check if current search term exactly matches an existing option
  const exactMatch = useMemo(() => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return parishes.some(
      (p) =>
        p.amharicName?.trim().toLowerCase() === term ||
        p.name?.trim().toLowerCase() === term ||
        p.sundaySchoolName?.trim().toLowerCase() === term
    );
  }, [parishes, searchTerm]);

  const handleSelect = (selected: ParishDto) => {
    const displayName = selected.amharicName || selected.name;
    onChange(displayName, selected.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleCustomUse = () => {
    if (!searchTerm.trim()) return;
    onChange(searchTerm.trim(), null);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Trigger / Input Shell */}
      <div
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
          isOpen
            ? 'border-amber-600 ring-2 ring-amber-500/20 shadow-sm'
            : 'border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Church className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          {value ? (
            <div className="truncate font-medium text-stone-900 dark:text-stone-100 text-sm">
              {value}
            </div>
          ) : (
            <span className="text-stone-400 dark:text-slate-500 text-sm truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition"
              title="አጽዳ / Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronsUpDown className="w-5 h-5 text-stone-400 dark:text-slate-500" />
        </div>
      </div>

      {helperText && (
        <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{helperText}</p>
      )}

      {/* Dropdown Drawer */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-stone-100 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/50">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-stone-400 dark:text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="በስም፣ በክፍለ ከተማ ወይም በሀገረ ስብከት ፈልጉ..."
                className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 dark:divide-slate-800/60 p-1">
            {isLoading && parishes.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 dark:text-slate-500">
                ደብራትን በመጫን ላይ... / Loading Sunday Schools...
              </div>
            ) : filteredParishes.length > 0 ? (
              filteredParishes.map((parish) => {
                const displayName = parish.amharicName || parish.name;
                const isSelected =
                  (parishId && parish.id === parishId) ||
                  (!parishId && value && value.trim().toLowerCase() === displayName.trim().toLowerCase());

                return (
                  <div
                    key={parish.id}
                    onClick={() => handleSelect(parish)}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium'
                        : 'hover:bg-stone-50 dark:hover:bg-slate-800 text-stone-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm leading-snug">
                          {parish.amharicName}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        )}
                      </div>

                      {parish.name && parish.name !== parish.amharicName && (
                        <div className="text-xs text-stone-500 dark:text-slate-400 truncate">
                          {parish.name}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {parish.subCity && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300">
                            <MapPin className="w-2.5 h-2.5 mr-0.5 opacity-60" />
                            {parish.subCity}
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 dark:text-slate-500">
                          {parish.diocese}
                        </span>
                        {parish.sundaySchoolName && (
                          <span className="inline-block text-[10px] px-1 rounded bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                            ሰንበት ት/ቤት
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 px-3 text-center text-xs text-stone-500 dark:text-slate-400">
                የተፈለገው ደብር በዝርዝሩ ውስጥ አልተገኘም / Sunday School not found.
              </div>
            )}

            {/* Creatable Option Fallback */}
            {searchTerm.trim().length > 1 && !exactMatch && (
              <div
                onClick={handleCustomUse}
                className="mt-1 px-3 py-2.5 rounded-lg cursor-pointer bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 transition flex items-center gap-2.5 border border-dashed border-amber-300 dark:border-amber-800"
              >
                <PlusCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">
                    «{searchTerm.trim()}» እንደ አዲስ ደብር ተጠቀም
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-300">
                    Use &quot;{searchTerm.trim()}&quot; as custom Sunday School
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
