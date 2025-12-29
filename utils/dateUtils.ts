
import { 
  addMonths, 
  format, 
  differenceInDays, 
  addDays, 
  isToday, 
  isYesterday 
} from 'date-fns';
// Importing problematic functions from subpaths as a fallback for environment-specific export issues
import parseISO from 'date-fns/parseISO';
import startOfDay from 'date-fns/startOfDay';
import { Client } from '../types';

export const calculateExpiration = (startDate: string, months: number): string => {
  try {
    const date = parseISO(startDate);
    const expiration = addMonths(date, months);
    return format(expiration, 'yyyy-MM-dd');
  } catch {
    return startDate;
  }
};

export const calculateExpirationDays = (startDate: string, days: number): string => {
  try {
    const date = parseISO(startDate);
    const expiration = addDays(date, days);
    return format(expiration, 'yyyy-MM-dd');
  } catch {
    return startDate;
  }
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
  try {
    const today = startOfDay(new Date());
    const date = startOfDay(parseISO(dateStr));
    return differenceInDays(today, date);
  } catch {
    return 0;
  }
};

export const getStatus = (client: Client) => {
  if (client.isActive === false) return 'INACTIVE';

  try {
    const today = startOfDay(new Date());
    const expiration = startOfDay(parseISO(client.expirationDate));
    const isExpired = differenceInDays(expiration, today) < 0;

    if (!isExpired) return 'ACTIVE';
    
    if (client.lastMessageDate) {
      const msgDate = startOfDay(parseISO(client.lastMessageDate));
      if (differenceInDays(msgDate, expiration) >= 0) {
        return 'MESSAGE_SENT';
      }
    }
  } catch (e) {
    return 'INACTIVE';
  }
  
  return 'EXPIRED';
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};