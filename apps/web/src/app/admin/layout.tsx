import React from 'react';
import type { Metadata } from 'next';
import AdminShell from './AdminShell';

export const metadata: Metadata = {
  title: 'የአስተዳዳሪ ፖርታል — EOTC Learning Platform',
  description: 'Curriculum authoring, user management, and package publishing studio',
};

// Use flexible props typing to avoid React 18/19 monorepo duplicate types conflict in Next.js build
export default function AdminLayout(props: any) {
  return <AdminShell>{props.children}</AdminShell>;
}
