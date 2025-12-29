
export interface Renewal {
  id: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  value: number;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  user: string;
  whatsapp: string;
  value: number;
  durationMonths: number;
  startDate: string;
  expirationDate: string;
  totalPaidValue: number;
  lastMessageDate?: string;
  renewalHistory: Renewal[];
  isActive?: boolean;
}

export interface AppSettings {
  messageTemplateUpcoming: string;
  messageTemplateExpired: string;
}

export enum ClientCategory {
  ACTIVE = 'Ativo',
  EXPIRED = 'Vencido',
  MESSAGE_SENT = 'Já enviei mensagem',
  INACTIVE = 'Inativo'
}

export interface DashboardStats {
  activeCount: number;
  expiredCount: number;
  messageSentCount: number;
  inactiveCount: number;
  revenueForecast: number;
  totalRevenue: number;
  averageRevenue: number;
  revenueLast30Days: number;
  totalMonthsSigned: number;
}
