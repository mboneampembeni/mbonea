/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateRemainingDays(endDate: string): number {
  const end = parseISO(endDate);
  const now = new Date();
  if (isPast(end)) return 0;
  return differenceInDays(end, now);
}

export function getLeaseStatus(endDate: string, urgentThreshold: number = 2) {
  const remainingDays = calculateRemainingDays(endDate);
  if (remainingDays <= 0) return 'expired';
  if (remainingDays <= urgentThreshold) return 'urgent';
  if (remainingDays <= 30) return 'expiring';
  return 'active';
}

export function formatPhone(phone: string): string {
  // Simple phone formatter for display (4-3-3 for 10 digits)
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{4})(\d{3})(\d{3})$/);
  if (match) {
    return match[1] + ' ' + match[2] + ' ' + match[3];
  }
  return phone;
}
