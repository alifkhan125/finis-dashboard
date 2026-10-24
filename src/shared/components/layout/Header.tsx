import { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown, LogOut, Settings, Menu, Sparkles, Building2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/shared/components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { NotificationOverlay } from './NotificationOverlay';
import { SearchOverlay } from './SearchOverlay';
import { Dropdown } from '@/shared/components/ui/Dropdown';
import { cn } from '@/shared/utils';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAuth,
  selectAuthUser,
  selectIsSwitched,
  switchToCompany,
  returnFromSwitched,
} from '@/store/authSlice';
import {
  useSwitchToMyCompanyMutation,
  useReturnToSuperAdminMutation,
} from '@/store/teamManagementApi';
import { config } from '@/config/env';

const searchableItems = [
  { id: 'p1', title: 'Skyline Tower', category: 'Project' as const, path: '/projects/1' },
  { id: 'p2', title: 'Harbor View', category: 'Project' as const, path: '/projects/2' },
  { id: 'c1', title: 'Finis Ltd', category: 'Company' as const, path: '/companies/1' },
  { id: 'w1', title: 'Sarah Connor', category: 'Worker' as const, path: '/workforce/1' },
  { id: 'r1', title: 'Monthly Payroll Log', category: 'Report' as const, path: '/reports' },
];

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const isSwitched = useAppSelector(selectIsSwitched);
  const isSuperAdmin = authUser?.role === 'super_admin';

  const [switchToMyCompany, { isLoading: isSwitching }] = useSwitchToMyCompanyMutation();
  const [returnToSuperAdmin, { isLoading: isReturning }] = useReturnToSuperAdminMutation();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const filteredResults = searchQuery.length > 1
    ? searchableItems.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchToMyCompany = async () => {
    try {
      const res = await switchToMyCompany().unwrap();
      if (res?.accessToken && res?.user) {
        dispatch(switchToCompany({ token: res.accessToken, user: res.user }));
        navigate('/', { replace: true });
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch to company:', err);
    }
  };

  const handleReturnToSuperAdmin = async () => {
    try {
      const res = await returnToSuperAdmin().unwrap();
      if (res?.accessToken && res?.user) {
        dispatch(returnFromSwitched({ token: res.accessToken, user: res.user }));
        navigate('/', { replace: true });
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to return to super admin:', err);
    }
  };

  const profileItems = [
    ...(isSuperAdmin && !isSwitched
      ? [
          {
            label: isSwitching ? 'Switching...' : 'Switch to My Company',
            icon: Building2,
            onClick: handleSwitchToMyCompany,
          },
        ]
      : []),
    ...(isSwitched
      ? [
          {
            label: isReturning ? 'Switching...' : 'Switch to Super Admin',
            icon: RotateCcw,
            onClick: handleReturnToSuperAdmin,
          },
        ]
      : []),
    {
      label: 'Notifications',
      icon: Bell,
      onClick: () => navigate('/notifications'),
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => navigate('/settings'),
    },
    {
      label: 'Logout',
      icon: LogOut,
      onClick: () => {
        dispatch(clearAuth());
        navigate('/login', { replace: true });
      },
      variant: 'destructive' as const,
    },
  ];

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `${config.apiBaseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  };

  const handleNotificationClick = (notification: { link?: string }) => {
    setIsNotificationsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/70 bg-[linear-gradient(90deg,rgba(255,255,255,0.82)_0%,rgba(240,247,252,0.95)_45%,rgba(232,244,252,0.92)_100%)] px-4 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:px-8">
      <div className="flex h-20 items-center justify-between gap-4">
      <div className="flex flex-1 items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-2xl p-2.5 text-gray-500 transition-all hover:bg-[#1D4F6D]/5 hover:text-[#1D4F6D] lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="flex items-center gap-2 truncate text-sm font-bold tracking-tight text-gray-900 sm:text-xl">
          <span className="hidden sm:inline">Welcome to</span>
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-[#1D4F6D]/10 bg-[linear-gradient(135deg,rgba(29,79,109,0.08)_0%,rgba(56,130,246,0.08)_100%)] px-2.5 py-1 text-[#1D4F6D] shadow-[0_10px_24px_-18px_rgba(29,79,109,0.5)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-extrabold">Finis Ltd.</span>
          </span>
          <span className="hidden lg:inline text-gray-500">Admin Dashboard</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Search Toggle */}
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className={cn(
            'relative rounded-2xl p-2.5 transition-all duration-200 md:hidden',
            isSearchOpen ? 'bg-[rgba(29,79,109,0.08)] text-[#1D4F6D]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
          )}
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Global Search Overlay (Full screen on mobile when open) */}
        {isSearchOpen && (
          <div className="md:hidden fixed inset-0 z-[110] bg-white animate-in slide-in-from-top-4 duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => setIsSearchOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <Menu className="h-6 w-6 rotate-90" /> {/* Back icon approximation */}
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  autoFocus
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-transparent focus:bg-white transition-all rounded-xl"
                />
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-xs font-bold text-[#1D4F6D] uppercase"
              >
                Close
              </button>
            </div>
            <div className="p-2">
              <SearchOverlay
                query={searchQuery}
                results={filteredResults}
                onClose={() => setIsSearchOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Desktop Search */}
        <div className="relative hidden w-64 md:block xl:w-96" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search projects, workers, or tasks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="h-11 rounded-2xl border border-transparent bg-gray-50 pl-10 transition-all focus:bg-white focus:shadow-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                Clear
              </button>
            )}
          </div>
          {isSearchOpen && (
            <SearchOverlay
              query={searchQuery}
              results={filteredResults}
              onClose={() => setIsSearchOpen(false)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={cn(
                'relative rounded-2xl p-2.5 transition-all duration-200',
                isNotificationsOpen ? 'bg-[rgba(29,79,109,0.08)] text-[#1D4F6D]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
              )}
            </button>
            {isNotificationsOpen && (
              <NotificationOverlay
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onNotificationClick={handleNotificationClick}
                onClose={() => setIsNotificationsOpen(false)}
              />
            )}
          </div>

          <div className="mx-1 h-8 w-px bg-gray-200" />

          <Dropdown
            align="right"
            items={profileItems}
            trigger={
              <button className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(244,248,252,0.96)_100%)] p-1.5 pl-3 transition-all hover:border-[#1D4F6D]/20 hover:bg-white hover:shadow-sm">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-black leading-none text-gray-900 transition-colors group-hover:text-[#1D4F6D]">
                    {authUser?.fullName ?? 'User'}
                  </p>
                  <p className="mt-1.5 text-[10px] font-bold leading-none text-gray-400">
                    {authUser?.role ?? 'Member'}
                  </p>
                </div>
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-gray-100 transition-all group-hover:ring-[#1D4F6D]/20">
                  <AvatarImage src={resolveAvatarUrl(authUser?.avatarUrl) || undefined} />
                  <AvatarFallback className="bg-gray-100 text-[10px] font-black">
                    {(authUser?.fullName ?? 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition-all group-hover:text-[#1D4F6D]" />
              </button>
            }
          />
        </div>
      </div>
      </div>
    </header>
  );
}
