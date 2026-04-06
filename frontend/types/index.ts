import React from 'react';

export interface Team {
  id: string;
  name: string;
  accessKey?: string;
  credits: number;
  strikes: number;
  isEliminated: boolean;
  role: 'TEAM' | 'ADMIN';
  members?: string[];
  createdAt: string;
  _count?: {
    submissions: number;
    bids: number;
  };
  error?: string;
}

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | React.ReactNode;
  color?: 'primary' | 'success' | 'danger';
}
