
import { addMonths, format, differenceInDays, addDays, isToday, isYesterday } from 'date-fns';
import { Client } from '../types';

// Custom implementation of parseISO as it is reported missing from date-fns
export const parseISO = (date: string | Date | number): Date => {
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  if (typeof date === 'string' && !date.includes('T')) {
    // Adding T12:00:00 ensures date-only strings are parsed in local time, avoiding timezone shifts
    return new Date(date + 'T12:00:00');
  }
  return new Date(date);
};

// Custom implementation of startOfDay as it is reported missing from date-fns
export const startOfDay = (date: string | Date | number): Date => {
  const d = new Date(parseISO(date));
  d.setHours(0, 0, 0, 0);
  return d;
};

// Custom implementation of startOfWeek as it is reported missing from date-fns
export const startOfWeek = (date: Date | string | number, options?: { weekStartsOn?: number }): Date => {
  const d = new Date(parseISO(date));
  const day = d.getDay();
  const weekStartsOn = options?.weekStartsOn || 0;
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const calculateExpiration = (startDate: string, months: number): string => {
  const date = parseISO(startDate);
  const expiration = addMonths(date, months);
  return format(expiration, 'yyyy-MM-dd');
};

export const calculateExpirationDays = (startDate: string, days: number): string => {
  const date = parseISO(startDate);
  const expiration = addDays(date, days);
  return format(expiration, 'yyyy-MM-dd');
};

export const formatDateBR = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
};

export const formatDateTimeBR = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    let prefix = '';
    if (isToday(date)) prefix = 'Hoje às ';
    else if (isYesterday(date)) prefix = 'Ontem às ';
    else prefix = format(date, 'dd/MM/yyyy') + ' às ';
    
    return prefix + format(date, 'HH:mm');
  } catch {
    return dateStr;
  }
};

export const getDaysSince = (dateStr: string): number => {
  const today = startOfDay(new Date());
  const date = startOfDay(parseISO(dateStr));
  return differenceInDays(today, date);
};

export const getStatus = (client: Client) => {
  // If explicitly set to inactive, that takes priority
  if (client.isActive === false) return 'INACTIVE';

  const today = startOfDay(new Date());
  const expiration = startOfDay(parseISO(client.expirationDate));
  const isExpired = differenceInDays(expiration, today) < 0;

  if (!isExpired) return 'ACTIVE';
  
  // If expired, check if a message was sent *on or after* the day it expired
  if (client.lastMessageDate) {
    const msgDate = startOfDay(parseISO(client.lastMessageDate));
    if (differenceInDays(msgDate, expiration) >= 0) {
      return 'MESSAGE_SENT';
    }
  }
  
  return 'EXPIRED';
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
