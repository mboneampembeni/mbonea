/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LeaseRecord {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  recordedAt: string;
}

export interface Plant {
  id: string; // A, B, C, D, E
  name: string;
  contactName: string;
  contactPhone: string;
  history: LeaseRecord[];
}

export type Theme = 'light' | 'dark';

export interface AppState {
  plants: Plant[];
  theme: Theme;
}
