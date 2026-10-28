// Core Types for FinisPro Admin Dashboard

export interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'manager';
  status: 'active' | 'disabled' | 'pending';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  assignedCompanies: string[];
  assignedProjects: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: string;
  assignedCompany?: string;
  assignedProject?: string;
  assignedFloors?: string[];
  assignedRooms?: string[];
  status: 'active' | 'inactive';
  hourlyRate: number;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  description: string;
  industry?: string;
  status: 'active' | 'inactive' | 'pending';
  annualRevenue?: number;
  location?: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  address: string;
  publicLink?: {
    url: string;
    enabled: boolean;
    createdAt: string;
  };
  projectCount: number;
  createdAt: string;
  owner?: { id?: string; fullName?: string; email?: string; phone?: string } | null;
  subscription?: {
    planName: string;
    status: string;
    currentPeriodEnd?: string | null;
    hasSubscription: boolean;
  } | null;
  tenant?: {
    id?: string;
    name?: string;
    status?: string;
    subscriptionStatus?: string | null;
    currentPeriodEnd?: string | null;
    plan?: { id?: string; name?: string } | null;
  } | null;
}

export interface Project {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  type: 'apartment_building' | 'house';
  description: string;
  status: 'planning' | 'completed' | 'active' | 'delayed';
  startDate: string;
  endDate?: string;
  budget: number;
  address: string;
  publicLink?: {
    url: string;
    enabled: boolean;
    createdAt: string;
  };
  floors: Floor[];
  geofence?: Geofence;
  progress: number;
  team?: {
    name: string;
    image: string;
  }[];
  quotation?: any;
  createdAt: string;
}

export interface Floor {
  id: string;
  projectId: string;
  number: number;
  name: string;
  rooms: Room[];
}

export interface Room {
  id: string;
  floorId: string;
  number: string;
  name: string;
  roomGroup?: string;
  status: 'pending' | 'active' | 'completed';
  assignedWorkers: string[];
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  category: string;
  internalValue?: number; // Hidden from workers
  status: 'pending' | 'active' | 'completed';
  assignedTo?: string[];
  isCustom: boolean;
  approved: boolean;
  completedAt?: string;
  photos: Photo[];
}

export interface Photo {
  id: string;
  url: string;
  type: 'before' | 'after';
  taskId?: string;
  roomId?: string;
  uploadedBy: string;
  uploadedAt: string;
  approved: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  workDays: number[]; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  assignedWorkers: string[];
  createdAt: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  checkIn?: {
    time: string;
    location: Location;
  };
  checkOut?: {
    time: string;
    location: Location;
  };
  status: 'present' | 'absent' | 'late' | 'early_departure';
  hoursWorked: number;
  locations: LocationLog[];
}

export interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface LocationLog {
  timestamp: string;
  location: Location;
}

export interface TimeAdjustmentRequest {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  requestType: 'check_in' | 'check_out';
  originalTime: string;
  requestedTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface Geofence {
  id: string;
  projectId: string;
  projectName: string;
  coordinates: Array<{ lat: number; lng: number }>;
  radius?: number;
  enabled: boolean;
  createdAt: string;
}

export interface PayrollConfig {
  id: string;
  period: 'weekly' | 'biweekly' | 'monthly';
  cppEmployee: number; // Percentage
  cppEmployer: number;
  eiEmployee: number;
  eiEmployer: number;
  federalTax: number;
  provincialTax: number;
  wsibEmployer: number;
  vacationPay: number;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  workerId: string;
  workerName: string;
  period: string;
  startDate: string;
  endDate: string;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
  deductions: {
    cppEmployee: number;
    eiEmployee: number;
    federalTax: number;
    provincialTax: number;
  };
  employerContributions: {
    cppEmployer: number;
    eiEmployer: number;
    wsibEmployer: number;
  };
  vacationPay: number;
  netPay: number;
  status: 'draft' | 'approved' | 'paid';
  createdAt: string;
}

export interface Expense {
  id: string;
  workerId: string;
  workerName: string;
  amount: number;
  category: string;
  description: string;
  receiptUrl: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  projectId?: string;
  projectName?: string;
  taskId?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  type: 'payroll' | 'invoice' | 'performance' | 'expense';
  title: string;
  period: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  generatedBy: string;
  data: any;
}

export interface ChatConversation {
  id: string;
  type: 'individual' | 'group' | 'project';
  name: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: string[];
  timestamp: string;
  read: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  domain?: string;
  subscriptionPlan: string;
  status: 'active' | 'suspended' | 'trial';
  whiteLabel: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    customDomain?: string;
  };
  companyCount: number;
  userCount: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    companies: number;
    projects: number;
    users: number;
    storage: number; // GB
  };
  active: boolean;
}

export interface Invitation {
  id: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'manager';
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}
