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
  projectConfig?: {
    houseType?: 'whole_house' | 'sections';
    sections?: string[];
  };
  description: string;
  status: 'planning' | 'completed' | 'active' | 'delayed' | 'suspended' | 'on_hold';
  priority?: string | null;
  startDate: string;
  endDate?: string;
  budget: number;
  spent?: number | null;
  remaining?: number | null;
  address: string;
  client?: {
    companyId?: string;
    companyName?: string;
    logoUrl?: string | null;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    primaryContact?: any;
  };
  publicLink?: {
    url: string;
    enabled: boolean;
    createdAt: string;
  };
  floors: Floor[];
  tasks?: Task[];
  geofence?: Geofence;
  progress: number;
  hasBudget: boolean;
  team?: {
    name: string;
    role?: string;
    image: string;
  }[];
  counts?: {
    tasks: number;
    teamMembers: number;
    floors: number;
  };
  quotation?: any;
  createdAt: string;
}

export interface Floor {
  id: string;
  projectId: string;
  number: number;
  name: string;
  type?: 'floor' | 'section';
  status?: string;
  progress?: number;
  totalRooms?: number;
  taskCounts?: { total: number; completed: number; inProgress: number; notStarted: number };
  rooms: Room[];
  tasks?: Task[];
}
export interface Room {
  id: string;
  floorId: string;
  number: string;
  name: string;
  type?: string;
  sizeSqft?: number | null;
  roomGroup?: string;
  status: 'pending' | 'active' | 'completed';
  progress?: number;
  assignedWorkers: string[];
  tasks: Task[];
  taskCounts?: { total: number; completed: number; inProgress: number; notStarted: number };
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
  priority?: 'low' | 'medium' | 'high';
  startDate?: string;
  dueDate?: string;
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
  subtotal: number;
  tax: number;
  totalAmount: number;
  amount?: number;
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
  participants: string[]; // User IDs
  participantDetails?: Array<{
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role?: string | null;
  }>;
  lastMessage?: ChatMessage;
  unreadCount: number;
  status: 'active' | 'closed';
  isBlocked?: boolean;
  blockedByMe?: boolean;
  blockedByOther?: boolean;
  projectId?: string; // For type: 'project'
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: 'admin' | 'manager' | 'worker';
    senderAvatarUrl?: string | null;
    content: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
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
  refId?: string | null;
  refType?: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  unitType: string;
  quantity: number;
  reorderThreshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  category?: string;
  lastUpdated: string;
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  quantityMoved: number;
  type: 'usage' | 'restock' | 'adjustment';
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskName?: string;
  handledBy: string;
  handledByName: string;
  timestamp: string;
  notes?: string;
}

export interface DamageReport {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  photoUrl?: string;
  notes: string;
  reportedBy: string;
  reportedByName: string;
  accountability: string; // Worker or Manager name
  projectId?: string;
  projectName?: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved';
}
