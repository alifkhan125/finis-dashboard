import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/utils';
import {
  LayoutDashboard, Users, HardHat,
  Settings, LogOut, UserCog,
  Clock, MapPin, MessageSquare, Building, FileBarChart, X, Briefcase, Package, DollarSign, Calculator,
  ChevronRight, ScrollText, CalendarClock,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuth, selectAuthUser } from '@/store/authSlice';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { config } from '@/config/env';

const menuItems = [
  {
    section: 'Main Menu',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Users, label: 'Companies', path: '/companies' },
      { icon: Briefcase, label: 'Projects', path: '/projects' }
    ]
  },
  {
    section: 'Team Management',
    items: [
      { icon: UserCog, label: 'Admins', path: '/admins' },
      { icon: Users, label: 'Managers', path: '/managers' },
      { icon: HardHat, label: 'Workers', path: '/workforce' }
    ]
  },
  {
    section: 'Time & Payroll',
    items: [
      { icon: Clock, label: 'Time Tracking', path: '/time-tracking' },
      { icon: MapPin, label: 'Geofencing', path: '/geofencing' },
      { icon: Calculator, label: 'Payroll', path: '/payroll' }
    ]
  },
  {
    section: 'Financial',
    items: [
      { icon: FileBarChart, label: 'Reports', path: '/reports' },
      { icon: ScrollText, label: 'Quotes Library', path: '/quotes' },
      { icon: DollarSign, label: 'Expenses', path: '/expenses' }
    ]
  },
  {
    section: 'Tools',
    items: [
      { icon: Package, label: 'Inventory', path: '/inventory' },
      { icon: MessageSquare, label: 'Messages', path: '/chat' }
    ]
  },
  {
    section: 'SaaS Management',
    items: [
      { icon: Users, label: 'Users', path: '/users' },
      { icon: Building, label: 'Tenants', path: '/tenants' },
      { icon: DollarSign, label: 'Subscription Plans', path: '/subscription-plans' }
    ]
  }
];
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authUser = useAppSelector(selectAuthUser);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isSuperAdmin = authUser?.role === 'super_admin';

  const filteredMenuItems = useMemo(() => {
    const superAdminHiddenPaths = new Set([
      '/companies',
      '/projects',
      '/admins',
      '/managers',
      '/workforce',
      '/time-tracking',
      '/time-tracking/adjustments',
      '/geofencing',
      '/inventory',
      '/reports',
      '/quotes',
      '/payroll',
      '/expenses',
    ]);

    return menuItems.map(section => {
      const items = section.items
        .filter(item => {
          if (!isSuperAdmin && (item.path === '/tenants' || item.path === '/admins' || item.path === '/users')) {
            return false;
          }
          if (isSuperAdmin && superAdminHiddenPaths.has(item.path)) {
            return false;
          }
          return true;
        })
        .map(item => {
          if (!isSuperAdmin && item.path === '/subscription-plans') {
            return { ...item, label: 'My Subscription', path: '/subscription-plans' };
          }
          return item;
        });

      const sectionTitle = (!isSuperAdmin && (section.section === 'SaaS Management' || section.section === 'SAAS MANAGEMENT'))
        ? 'Subscription'
        : section.section;

      return {
        ...section,
        section: sectionTitle,
        items,
      };
    }).filter(section => section.items.length > 0);
  }, [isSuperAdmin]);

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `${config.apiBaseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  };

  const handleLogout = () => {
    dispatch(clearAuth());
    onClose();
    navigate('/login', { replace: true });
  };

  const handleSettingsNavigate = (activeTab?: 'profile' | 'account' | 'security') => {
    navigate('/settings', activeTab ? { state: { activeTab } } : undefined);
    if (window.innerWidth < 1024) onClose();
  };

  const handlePublicPageNavigate = (slug: 'about-us' | 'faq' | 'privacy-policy' | 'terms-and-conditions') => {
    navigate(`/settings/content/${slug}`);
    if (window.innerWidth < 1024) onClose();
  };

  return <aside className={cn(
    "fixed left-0 top-0 z-40 h-screen w-[280px] border-r border-gray-100 bg-white text-gray-600 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-xl lg:shadow-none",
    isOpen ? "translate-x-0" : "-translate-x-full invisible lg:visible"
  )}>
    {/* Logo & Close Button (Mobile) */}
    <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D4F6D] to-[#163f57] text-white shadow-md shadow-blue-900/10">
          <HardHat className="h-6 w-6" />
        </div>
        <div>
          <span className="text-xl font-black tracking-tight text-gray-900">FINIS</span>
          <span className="ml-1 text-[10px] font-bold tracking-widest text-[#1D4F6D] uppercase">PRO</span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-50"
      >
        <X className="h-6 w-6" />
      </button>
    </div>

    {/* Navigation */}
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
      {filteredMenuItems.map(section => <div key={section.section}>
        <h3 className="mb-4 px-4 text-xs font-semibold capitalize tracking-wider text-gray-400">
          {section.section}
        </h3>
        <div className="space-y-1">
          {section.items.map(item => <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className={({
              isActive
            }) => cn('flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200', isActive ? 'bg-blue-50 text-primary shadow-sm ring-1 ring-blue-100' : 'hover:bg-gray-50 hover:text-gray-900')}
          >
            <item.icon className="h-5 w-5" />
            <span className="flex-1">{item.label}</span>
          </NavLink>)}
        </div>
      </div>)}

      {/* Others Section */}
      <div>
        <h3 className="mb-4 px-4 text-xs font-semibold capitalize tracking-wider text-gray-400">
          Others
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => setSettingsOpen((current) => !current)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200',
              settingsOpen
                ? 'border-[#1D4F6D]/10 bg-gradient-to-r from-[#1D4F6D]/8 to-sky-50 text-[#1D4F6D] shadow-sm'
                : 'border-transparent text-gray-700 hover:border-gray-100 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <span className={cn('grid h-8 w-8 place-items-center rounded-xl transition-colors', settingsOpen ? 'bg-[#1D4F6D]/10 text-[#1D4F6D]' : 'bg-gray-100 text-gray-500')}>
              <Settings className="h-4 w-4" />
            </span>
            <span className="flex-1 text-left">Settings</span>
            <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', settingsOpen ? 'rotate-90 text-[#1D4F6D]' : 'rotate-0 text-gray-300')} />
          </button>
          <div className={cn('overflow-hidden transition-all duration-300', settingsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')}>
            <div className="ml-4 mt-3 space-y-2 border-l-2 border-dashed border-[#1D4F6D]/15 pl-4">
              <button
                onClick={() => handleSettingsNavigate('profile')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-[#1D4F6D]/6 hover:text-[#1D4F6D]"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D4F6D]/30 ring-4 ring-[#1D4F6D]/5" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => handlePublicPageNavigate('terms-and-conditions')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-[#1D4F6D]/6 hover:text-[#1D4F6D]"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D4F6D]/30 ring-4 ring-[#1D4F6D]/5" />
                <span>Terms &amp; Condition</span>
              </button>
              <button
                onClick={() => handlePublicPageNavigate('privacy-policy')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-[#1D4F6D]/6 hover:text-[#1D4F6D]"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D4F6D]/30 ring-4 ring-[#1D4F6D]/5" />
                <span>Privacy Policy</span>
              </button>
              <button
                onClick={() => handlePublicPageNavigate('about-us')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-[#1D4F6D]/6 hover:text-[#1D4F6D]"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D4F6D]/30 ring-4 ring-[#1D4F6D]/5" />
                <span>About Us</span>
              </button>
              <button
                onClick={() => handlePublicPageNavigate('faq')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-[#1D4F6D]/6 hover:text-[#1D4F6D]"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D4F6D]/30 ring-4 ring-[#1D4F6D]/5" />
                <span>FAQ</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    {/* User Profile */}
    <div className="border-t border-gray-100 p-4 m-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
          <AvatarImage src={resolveAvatarUrl(authUser?.avatarUrl) || undefined} />
          <AvatarFallback>
            {(authUser?.fullName ?? 'U').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold text-gray-900 capitalize">
            {authUser?.fullName ?? 'User'}
          </p>
          <p className="truncate text-xs text-gray-500">{authUser?.email ?? 'No email'}</p>
        </div>
        <button className="text-gray-400 hover:text-gray-600" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  </aside>;
}
