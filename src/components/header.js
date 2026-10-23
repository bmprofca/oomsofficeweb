import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiBriefcase, FiChevronDown, FiCreditCard,
  FiPlus, FiUser, FiSettings, FiHelpCircle,
  FiLogOut, FiUsers, FiRepeat,
  FiLock, FiChevronRight, FiX, FiHome, FiBarChart2, FiPhone,
  FiClock, FiMonitor, FiCheckSquare, FiFileText, FiBookOpen,
  FiRadio, FiMessageCircle, FiSidebar, FiMapPin,
} from 'react-icons/fi';
import { NavLink, useLocation } from 'react-router-dom';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { useWhatsappChannel } from '../hooks/useWhatsappChannel';
import { useUserPermissions } from '../utils/permission-helper';
import { useTaskCreate } from '../context/TaskCreateProvider';
import { useClientCreate } from '../context/ClientCreateProvider';
import { toast } from 'react-hot-toast';
import CreateBranch from './Modals/CreateBranch';
import SwitchBranchModal from './Modals/SwitchBranchModal';
import AttendanceModal from './Modals/AttendanceModal';
import { useSubscription } from '../hooks/useSubscription';
import { loadUserProfileFromStorage } from '../utils/user-profile-storage';
import { getStoredBranchRoleLabel, resolveBranchRole } from '../services/branchSetupService';
import { performBranchSwitch } from '../utils/branchSwitch';
import { clearKeepAliveCache } from '../app/KeepAlive';
import BranchSwitchOverlay from './BranchSwitchOverlay';
import HeaderGlobalSearch from './HeaderGlobalSearch';
import { clearNavValueCache, useNavCachedState } from '../utils/navValueCache';
import HeaderNotifications from './HeaderNotifications';
import AiHeaderButton from './ai/AiHeaderButton';
import ConfirmActionModal from './ConfirmActionModal';

function isStoredBranchAdmin() {
  try {
    const branchId = localStorage.getItem('branch_id');
    const branchesJson = localStorage.getItem('user_branches');
    const branches = branchesJson ? JSON.parse(branchesJson) : [];
    const activeBranch = Array.isArray(branches)
      ? branches.find((branch) => String(branch.branch_id || branch.id) === String(branchId))
      : null;
    if (activeBranch) {
      return resolveBranchRole(activeBranch) === 'admin';
    }
  } catch (error) {
    console.error('Failed to resolve branch admin role', error);
  }
  const role = String(localStorage.getItem('branch_role') || '').trim().toLowerCase();
  return localStorage.getItem('branch_owned') === 'true' || role === 'admin' || role === 'owner';
}

// ==========================================
// 1. Constants & Styles
// ==========================================
// Each menu item gets its own colour: a soft tinted chip normally, solid when active.
// Literal class strings so Tailwind keeps them.
const ITEM_TONES = {
  dashboard: { chip: 'bg-indigo-50 text-indigo-600', solid: 'bg-indigo-600 text-white', row: 'bg-indigo-50 text-indigo-900' },
  tasks: { chip: 'bg-violet-50 text-violet-600', solid: 'bg-violet-600 text-white', row: 'bg-violet-50 text-violet-900' },
  'recurring-tasks': { chip: 'bg-teal-50 text-teal-600', solid: 'bg-teal-600 text-white', row: 'bg-teal-50 text-teal-900' },
  clients: { chip: 'bg-sky-50 text-sky-600', solid: 'bg-sky-600 text-white', row: 'bg-sky-50 text-sky-900' },
  billing: { chip: 'bg-amber-50 text-amber-600', solid: 'bg-amber-500 text-white', row: 'bg-amber-50 text-amber-900' },
  finance: { chip: 'bg-emerald-50 text-emerald-600', solid: 'bg-emerald-600 text-white', row: 'bg-emerald-50 text-emerald-900' },
  assistance: { chip: 'bg-orange-50 text-orange-600', solid: 'bg-orange-500 text-white', row: 'bg-orange-50 text-orange-900' },
  'staff-management': { chip: 'bg-rose-50 text-rose-600', solid: 'bg-rose-600 text-white', row: 'bg-rose-50 text-rose-900' },
  broadcast: { chip: 'bg-fuchsia-50 text-fuchsia-600', solid: 'bg-fuchsia-600 text-white', row: 'bg-fuchsia-50 text-fuchsia-900' },
  'voice-call-history': { chip: 'bg-cyan-50 text-cyan-600', solid: 'bg-cyan-600 text-white', row: 'bg-cyan-50 text-cyan-900' },
  'whatsapp-live-chat': { chip: 'bg-green-50 text-green-600', solid: 'bg-green-600 text-white', row: 'bg-green-50 text-green-900' },
  settings: { chip: 'bg-slate-100 text-slate-600', solid: 'bg-slate-700 text-white', row: 'bg-slate-100 text-slate-900' },
  subscription: { chip: 'bg-pink-50 text-pink-600', solid: 'bg-pink-600 text-white', row: 'bg-pink-50 text-pink-900' },
  'help-support': { chip: 'bg-lime-50 text-lime-700', solid: 'bg-lime-600 text-white', row: 'bg-lime-50 text-lime-900' },
};
const DEFAULT_TONE = { chip: 'bg-slate-100 text-slate-600', solid: 'bg-indigo-600 text-white', row: 'bg-indigo-50 text-indigo-900' };
const toneOf = (key) => ITEM_TONES[key] || DEFAULT_TONE;

const THEME = {
  active: 'bg-indigo-100 text-indigo-700 font-semibold',
  inactive: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  locked: 'text-slate-300 cursor-not-allowed hover:bg-transparent',
  iconActive: 'text-indigo-600',
  iconInactive: 'text-slate-400 group-hover:text-slate-600',
};

// ==========================================
// 2. MOCK DATA & STORE
// ==========================================
// Mock database helper
const mockDbHelper = {
  init: async () => true,
  getChats: async () => [
    { id: 1, name: "John Doe", unread_count: 3 },
    { id: 2, name: "Jane Smith", unread_count: 0 },
    { id: 3, name: "Support", unread_count: 5 }
  ],
  setOnDataChange: (callback) => {
    // Mock listener
    const interval = setInterval(() => {
      callback('chats', 'update', {});
    }, 10000);
    return () => clearInterval(interval);
  }
};

// ==========================================
// 3. Helper Functions
// ==========================================
const requiresProject = (item) => {
  const protectedPaths = ['/live-chat', '/template', '/campaigns'];
  return protectedPaths.includes(item.path) ||
    (item.submenus && item.submenus.some(submenu => protectedPaths.includes(submenu.path)));
};

const isItemActive = (item, currentPath) => {
  if (item.path && item.path !== '#') {
    if (item.path === '/') return currentPath === '/';
    return currentPath === item.path || currentPath.startsWith(item.path + '/');
  }
  if (item.submenus) {
    return item.submenus.some(submenu =>
      submenu.path && submenu.path !== '#' &&
      (currentPath === submenu.path || currentPath.startsWith(submenu.path + '/'))
    );
  }
  return false;
};

const isSubmenuItemActive = (submenuPath, currentPath) => {
  if (submenuPath === '/') return currentPath === '/';
  return submenuPath && submenuPath !== '#' && (currentPath === submenuPath || currentPath.startsWith(submenuPath + '/'));
};

const CountPill = ({ value, tone = 'brand' }) => {
  const tones = {
    brand: 'bg-indigo-600 text-white',
    amber: 'bg-amber-500 text-white',
    green: 'bg-emerald-500 text-white',
  };
  return (
    <span className={`inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums leading-none ${tones[tone] || tones.brand}`}>
      {value > 99 ? '99+' : value}
    </span>
  );
};

const MiniBadge = ({ value, tone }) => (
  <span className={`absolute -top-1.5 -right-1.5 ring-2 ring-white rounded-full ${tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'} text-white text-[9px] font-bold min-w-[15px] h-[15px] px-1 flex items-center justify-center`}>
    {value > 9 ? '9+' : value}
  </span>
);

const MiniTooltip = ({ children }) => (
  <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg animate-fade-in">
    {children}
    <span className="absolute left-[-4px] top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-900" />
  </div>
);

// ==========================================
// 5. NavItem Component
// ==========================================
const NavItem = ({ item, isMobile, isMinimized, isHovered, currentPath, openSubmenus, toggleSubmenu, setHoveredMenu, hoveredMenu, setMobileMenuOpen, hasProjects, unreadCount, pendingBillingCount, checkPermission }) => {
  const navigate = useNavigate();
  const { openTaskCreate } = useTaskCreate();
  const { openClientCreate } = useClientCreate();
  const { hasAccess } = useSubscription();
  const tone = toneOf(item.key);

  const getSubscriptionLevel = (key) => {
    if (key === 'whatsapp-live-chat') return 'live-chat';
    if (['dashboard', 'tasks', 'recurring-tasks', 'clients', 'billing', 'finance', 'assistance', 'broadcast', 'staff-management'].includes(key)) {
      return 'core';
    }
    return null;
  };

  const getSubmenuSubscriptionLevel = (sub) => sub?.subscriptionFeature || null;

  const subLevel = getSubscriptionLevel(item.key);
  const isSubscriptionLocked = subLevel ? !hasAccess(subLevel) : false;
  const isPermissionLocked = item.permission ? !checkPermission(item.permission) : false;
  const isLocked = isPermissionLocked || isSubscriptionLocked;
  const isDisabled = (requiresProject(item) && !hasProjects) || isPermissionLocked;

  const isActive = isItemActive(item, currentPath);
  const hasSubmenu = item.submenus && item.submenus.length > 0;
  const isOpen = isMobile ? openSubmenus[`mobile-${item.key}`] : openSubmenus[item.key];
  const isMini = !isMobile && isMinimized && !isHovered;
  const showUnreadBadge = item.key === 'live-chat' && unreadCount > 0;
  const showBillingBadge = item.key === 'billing' && pendingBillingCount > 0;
  const isTaskOrClientMenu = item.key === 'tasks' || item.key === 'clients';
  const createSubItem =
    item.submenus?.find((s) => s.action === 'openTaskCreate' || String(s.path || '').includes('/create')) ||
    item.submenus?.[0];

  const handleQuickCreate = (e) => {
    e.stopPropagation();
    if (item.key === 'tasks') {
      openTaskCreate({ onNavigateToTaskList: () => navigate('/task/view') });
    } else if (item.key === 'clients') {
      openClientCreate();
    } else if (createSubItem?.path) {
      navigate(createSubItem.path);
    }
    if (isMobile) setMobileMenuOpen(false);
  };

  const rowBase = `relative w-full flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150 group select-none ${isMini ? 'h-10 justify-center px-0' : 'h-9 pl-1.5 pr-2 gap-2.5'}`;
  const activeBar = null;

  // Render Submenu Item (Parent)
  if (hasSubmenu) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (isTaskOrClientMenu) {
              if (item.path) {
                navigate(item.path);
                if (isMobile) setMobileMenuOpen(false);
              }
              return;
            }
            if (!isMini) toggleSubmenu(isMobile ? `mobile-${item.key}` : item.key);
          }}
          className={`${rowBase} ${isActive ? `${tone.row} font-semibold` : THEME.inactive}`}
          onMouseEnter={() => isMini && setHoveredMenu(item.key)}
          onMouseLeave={() => isMini && setHoveredMenu(null)}
          aria-expanded={!isMini && !isTaskOrClientMenu ? Boolean(isOpen) : undefined}
        >
          {activeBar}
          <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors [&>svg]:h-[15px] [&>svg]:w-[15px] ${isActive ? tone.solid : tone.chip}`}>
            {item.icon}
            {isMini && showBillingBadge && <MiniBadge value={pendingBillingCount} tone="amber" />}
          </span>
          {!isMini && <span className="flex-1 truncate text-left">{item.title}</span>}
          {!isMini && (
            isTaskOrClientMenu ? (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Create ${item.title}`}
                title={`Create ${item.title}`}
                onClick={handleQuickCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleQuickCreate(e);
                  }
                }}
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${isActive
                  ? 'border-white/0 bg-white text-slate-700 shadow-sm hover:text-indigo-600'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'}`}
              >
                <FiPlus size={14} />
              </span>
            ) : (
              <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.18 }} className="flex items-center">
                <FiChevronRight size={14} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
              </motion.span>
            )
          )}

          {isMini && hoveredMenu === item.key && (
            <MiniTooltip>
              {item.title}
              {showBillingBadge && ` • ${pendingBillingCount} pending`}
            </MiniTooltip>
          )}
        </button>

        <AnimatePresence initial={false}>
          {(!isMini && isOpen && !isTaskOrClientMenu) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="relative ml-[21px] mt-0.5 mb-1 space-y-0.5 border-l border-slate-200 pl-3">
                {item.submenus.map((sub, idx) => {
                  const isSubActive = isSubmenuItemActive(sub.path, currentPath);
                  const isSubPermissionLocked = sub.permission ? !checkPermission(sub.permission) : false;
                  const subFeature = getSubmenuSubscriptionLevel(sub);
                  const isSubSubscriptionLocked = subFeature ? !hasAccess(subFeature) : false;
                  const isSubLocked = isSubPermissionLocked || isSubSubscriptionLocked;
                  return (
                    <NavLink
                      key={idx}
                      to={isSubPermissionLocked ? '#' : sub.path}
                      onClick={(e) => {
                        if (isSubPermissionLocked) {
                          e.preventDefault();
                          toast.error('Need Access Permission');
                        } else if (isMobile) {
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={
                        `relative flex h-8 items-center justify-between rounded-md px-2.5 text-[12.5px] transition-colors no-underline hover:no-underline ${isSubPermissionLocked
                          ? 'text-slate-300 cursor-not-allowed hover:bg-transparent'
                          : isSubActive
                            ? 'bg-indigo-100 font-semibold text-indigo-700'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      {isSubActive ? (
                        <span className="absolute -left-[15.5px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-indigo-600 ring-2 ring-white" aria-hidden />
                      ) : null}
                      <span className="truncate">{sub.title}</span>
                      {isSubLocked && <FiLock size={11} className={isSubSubscriptionLocked ? 'text-amber-500' : 'text-slate-300'} />}
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render Single Link Item
  return (
    <div className="relative">
      <NavLink to={isDisabled ? '#' : item.path} onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          if (isPermissionLocked) {
            toast.error('Need Access Permission');
          }
        } else if (isMobile) {
          setMobileMenuOpen(false);
        }
      }}
        className={`${rowBase} no-underline hover:no-underline ${isDisabled ? THEME.locked : isActive ? `${tone.row} font-semibold` : THEME.inactive}`}
        onMouseEnter={() => isMini && setHoveredMenu(item.key)}
        onMouseLeave={() => isMini && setHoveredMenu(null)}
      >
        {activeBar}
        <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors [&>svg]:h-[15px] [&>svg]:w-[15px] ${isDisabled ? 'bg-slate-50 text-slate-300' : isActive ? tone.solid : tone.chip}`}>
          {item.icon}
          {isMini && showUnreadBadge && <MiniBadge value={unreadCount} tone="green" />}
          {isMini && showBillingBadge && <MiniBadge value={pendingBillingCount} tone="amber" />}
        </span>
        {!isMini && (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span className="truncate">{item.title}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              {showUnreadBadge && <CountPill value={unreadCount} tone="green" />}
              {showBillingBadge && <CountPill value={pendingBillingCount} tone="amber" />}
              {isLocked && <FiLock size={11} className={isSubscriptionLocked ? 'text-amber-500' : 'text-slate-300'} />}
            </div>
          </div>
        )}
        {isMini && hoveredMenu === item.key && (
          <MiniTooltip>
            {item.title} {isLocked && '(Locked)'}
            {showBillingBadge && ` • ${pendingBillingCount} pending`}
          </MiniTooltip>
        )}
      </NavLink>
    </div>
  );
};

// ==========================================
// 6. Header Component
// ==========================================
export const Header = ({ mobileMenuOpen, setMobileMenuOpen, isMinimized, setIsMinimized }) => {
  const headerLocation = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [switchProjectModalOpen, setSwitchProjectModalOpen] = useState(false);
  const [branchSetupOpen, setBranchSetupOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState('Select Branch');
  const [userProfile, setUserProfile] = useState({ name: 'User', mobile: '', roleLabel: 'Member' });
  const profileTriggerRef = useRef(null);
  const profilePanelRef = useRef(null);
  const [profilePanelStyle, setProfilePanelStyle] = useState({ top: 0, right: 0 });
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutAllSessions, setLogoutAllSessions] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);

  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useNavCachedState('wallet_balance', 0);

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30';

  useEffect(() => {
    const storedProfile = loadUserProfileFromStorage();
    setUserProfile({
      name: storedProfile.name || localStorage.getItem('user_name') || 'User',
      mobile: storedProfile.mobile || localStorage.getItem('user_mobile') || '',
      roleLabel: getStoredBranchRoleLabel(),
    });

    const activeBranchName = localStorage.getItem('branch_name');
    if (activeBranchName) {
      setSelectedProjectName(activeBranchName);
    }
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const headers = await getHeaders();
        if (!headers) return;
        const res = await fetch(`${API_BASE_URL}/wallet/balance`, { headers });
        const result = await res.json();
        if (result.success) {
          setWalletBalance(result.data.balance);
        }
      } catch (error) {
        console.error('Failed to fetch wallet balance', error);
      }
    };
    fetchBalance();

    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    if (setIsMinimized) setIsMinimized(!isMinimized);
  };

  const handleMenuClick = () => {
    if (window.innerWidth >= 768) {
      toggleSidebar();
      return;
    }
    setMobileMenuOpen(true);
  };

  const performLogout = async (allSessions = false) => {
    const token = localStorage.getItem('user_token');
    const username = localStorage.getItem('user_username');

    try {
      if (token && username) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token,
            username,
          },
          body: JSON.stringify({ all_sessions: Boolean(allSessions) }),
        });
      }
    } catch (error) {
      console.warn('Web logout API request failed; continuing with local logout.', error);
    }

    localStorage.removeItem('user_token');
    localStorage.removeItem('user_username');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_branches');
    localStorage.removeItem('branch_id');
    localStorage.removeItem('branch_name');
    localStorage.removeItem('branch_owned');
    localStorage.removeItem('branch_role');
    localStorage.removeItem('user_mobile');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('userData');
    clearNavValueCache();
    clearKeepAliveCache();
    navigate('/login');
  };

  const openLogoutModal = () => {
    setProfileDropdownOpen(false);
    setLogoutAllSessions(false);
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    if (logoutSubmitting) return;
    setLogoutSubmitting(true);
    try {
      await performLogout(logoutAllSessions);
    } finally {
      setLogoutSubmitting(false);
      setLogoutModalOpen(false);
    }
  };

  const handleSelectCompany = async (company) => {
    if (!company) return;
    setSelectedCompany(company);
    setSelectedProjectName(company.name);
    setSwitchProjectModalOpen(false);
    try {
      await performBranchSwitch(company, { reload: true });
    } catch (error) {
      console.error('Failed to update selected branch', error);
      toast.error(error.message || 'Failed to switch branch');
    }
  };

  const getUserInitials = () => {
    if (userProfile.name) {
      const names = userProfile.name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return userProfile.name.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const profileItems = [
    { title: 'My Profile', icon: FiUser, path: '/my-profile' },
    { title: 'Active sessions', icon: FiMonitor, path: '/sessions' },
  ];

  const branchLabel = selectedProjectName || selectedCompany?.name || 'Select Branch';
  const showAttendanceMenu = useMemo(() => {
    if (selectedCompany) {
      return resolveBranchRole(selectedCompany) !== 'admin';
    }
    return !isStoredBranchAdmin();
  }, [selectedCompany, selectedProjectName]);

  useEffect(() => {
    if (!showAttendanceMenu) setAttendanceModalOpen(false);
  }, [showAttendanceMenu]);

  const updateProfilePanelPosition = useCallback(() => {
    if (!profileTriggerRef.current) return;
    const rect = profileTriggerRef.current.getBoundingClientRect();
    setProfilePanelStyle({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    if (!profileDropdownOpen) return undefined;

    updateProfilePanelPosition();
    window.addEventListener('resize', updateProfilePanelPosition);
    window.addEventListener('scroll', updateProfilePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updateProfilePanelPosition);
      window.removeEventListener('scroll', updateProfilePanelPosition, true);
    };
  }, [profileDropdownOpen, updateProfilePanelPosition]);

  // Profile menu: close on any outside press (capture phase, touch included),
  // Escape, a click into an iframe and on navigation.
  useEffect(() => {
    if (!profileDropdownOpen) return undefined;
    const handlePointerDown = (event) => {
      if (profileTriggerRef.current?.contains(event.target)) return;
      if (profilePanelRef.current?.contains(event.target)) return;
      setProfileDropdownOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setProfileDropdownOpen(false);
    };
    const handleBlur = () => {
      if (document.activeElement?.tagName === 'IFRAME') setProfileDropdownOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [profileDropdownOpen]);

  // Close the profile menu when the route changes.
  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [headerLocation.pathname]);

  const renderAvatar = (size = 'sm') => {
    const sizeClass = size === 'lg' ? 'h-10 w-10 text-xs' : 'h-7 w-7 text-[10px]';
    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-full bg-indigo-500 font-semibold text-white ring-2 ring-white shadow-sm`}
      >
        {getUserInitials()}
      </div>
    );
  };

  const pillClass =
    'inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50';

  return (
    <>
      <header
        data-app-header
        className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200 bg-white"
      >
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
          {/* Left: menu + brand */}
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              className={iconButtonClass}
              onClick={handleMenuClick}
              aria-label="Toggle navigation"
              title="Toggle navigation"
            >
              <FiMenu className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-10 items-center gap-2.5 rounded-lg px-1.5 transition-colors hover:bg-slate-50"
              aria-label="Go to dashboard"
            >
              <img
                src="/logo512.png"
                alt=""
                className="h-8 w-8 rounded-lg object-contain ring-1 ring-slate-900/5"
                draggable="false"
              />
              <span className="hidden flex-col items-start leading-none sm:flex">
                <span className="font-display text-[16px] font-extrabold tracking-tight text-slate-900">OOMS</span>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">ONESAAS CLOUD</span>
              </span>
            </button>
          </div>

          {/* Center: global search */}
          <HeaderGlobalSearch />

          {/* Right: branch, wallet, actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setSwitchProjectModalOpen(true)}
              className={`${pillClass} hidden max-w-[190px] md:inline-flex`}
              title="Switch branch"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                <FiMapPin className="h-3 w-3" />
              </span>
              <span className="truncate">{branchLabel}</span>
              <FiChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/wallet-recharge')}
              className={`${pillClass} hidden pr-1.5 sm:inline-flex`}
              title="Wallet balance — tap to recharge"
            >
              <FiCreditCard className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="font-mono text-[12.5px] font-semibold tabular-nums text-slate-900">
                ₹{Number(walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white">
                <FiPlus className="h-3 w-3" />
              </span>
            </button>

            <AiHeaderButton />

            <HeaderNotifications
              iconButtonClass={iconButtonClass}
              onOpenChange={(isOpen) => {
                if (isOpen) setProfileDropdownOpen(false);
              }}
            />

            <div className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />

            <div className="relative">
              <button
                ref={profileTriggerRef}
                type="button"
                className={`flex h-9 max-w-[200px] items-center gap-2 rounded-lg border pl-1 pr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${profileDropdownOpen
                  ? 'border-indigo-200 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                onClick={() => {
                  setProfileDropdownOpen((open) => !open);
                }}
              >
                {renderAvatar('sm')}
                <span className="hidden min-w-0 flex-col items-start leading-tight md:flex">
                  <span className="max-w-[120px] truncate text-xs font-semibold text-slate-800">
                    {userProfile.name || 'User'}
                  </span>
                  <span className="max-w-[120px] truncate text-[10px] text-slate-500">
                    {userProfile.roleLabel || 'Member'}
                  </span>
                </span>
                <FiChevronDown
                  className={`hidden h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform md:block ${profileDropdownOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {profileDropdownOpen && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    aria-hidden="true"
                    onMouseDown={() => setProfileDropdownOpen(false)}
                  />
                  <div
                    ref={profilePanelRef}
                    className="fixed z-[9999] w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop animate-fade-in"
                    style={{
                      top: profilePanelStyle.top,
                      right: profilePanelStyle.right,
                    }}
                    role="menu"
                  >
                    <div className="border-b border-slate-100 px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {renderAvatar('lg')}
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-sm font-semibold leading-5 text-slate-900">
                            {userProfile.name || 'User'}
                          </p>
                          <p className="m-0 mt-1 flex items-center gap-1.5 truncate text-xs leading-4 text-slate-500">
                            <span className="ui-badge ui-badge-brand !h-[18px] !px-1.5 !text-[10px]">{userProfile.roleLabel || 'Member'}</span>
                            {userProfile.mobile ? (
                              <span className="truncate">{userProfile.mobile}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
                        <FiMapPin className="h-3 w-3 shrink-0 text-indigo-500" />
                        <span className="truncate font-medium">{branchLabel}</span>
                      </div>
                    </div>

                    <div className="p-1.5">
                      {showAttendanceMenu ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setAttendanceModalOpen(true);
                          }}
                        >
                          <FiClock className="h-4 w-4 shrink-0 text-slate-400" />
                          Attendance
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setSwitchProjectModalOpen(true);
                        }}
                      >
                        <FiHome className="h-4 w-4 shrink-0 text-slate-400" />
                        Switch branch
                      </button>

                      {profileItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.title}
                            to={item.path}
                            role="menuitem"
                            onClick={() => setProfileDropdownOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors no-underline hover:no-underline ${isActive
                                ? 'bg-indigo-50 font-medium text-indigo-700'
                                : 'text-slate-700 hover:bg-slate-100'
                              }`
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                            {item.title}
                          </NavLink>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 p-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={openLogoutModal}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <FiLogOut className="h-4 w-4 shrink-0" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          </div>
        </div>
      </header>

      <SwitchBranchModal
        isOpen={switchProjectModalOpen}
        onClose={() => setSwitchProjectModalOpen(false)}
        onSelectCompany={handleSelectCompany}
        onOpenBranchSetup={() => {
          setSwitchProjectModalOpen(false);
          setBranchSetupOpen(true);
        }}
      />

      {showAttendanceMenu ? (
        <AttendanceModal
          isOpen={attendanceModalOpen}
          onClose={() => setAttendanceModalOpen(false)}
          branchName={branchLabel}
          branchId={selectedCompany?.branch_id || localStorage.getItem('branch_id') || ''}
        />
      ) : null}

      <CreateBranch
        isOpen={branchSetupOpen}
        onClose={() => setBranchSetupOpen(false)}
        onSuccess={(newBranch) => {
          handleSelectCompany({
            branch_id: newBranch.branch_id,
            name: newBranch.branch_name || newBranch.name,
            owned: true,
            role: 'admin',
          });
          setBranchSetupOpen(false);
        }}
      />

      <BranchSwitchOverlay />

      <ConfirmActionModal
        isOpen={logoutModalOpen}
        title="Sign Out"
        heading="Sign out of your account?"
        message="You will need to sign in again to access your account."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        loading={logoutSubmitting}
        tone="danger"
        icon={FiLogOut}
        onCancel={() => {
          if (!logoutSubmitting) setLogoutModalOpen(false);
        }}
        onConfirm={confirmLogout}
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 px-3.5 py-3">
          <input
            type="checkbox"
            checked={logoutAllSessions}
            disabled={logoutSubmitting}
            onChange={(e) => setLogoutAllSessions(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800">
              Logout from all sessions
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Sign out on this device and every other device where you are logged in.
            </span>
          </span>
        </label>
      </ConfirmActionModal>
    </>
  );
};

// ==========================================
// 7. Sidebar Component
// ==========================================
const SectionLabel = ({ children, mini }) => (
  mini ? (
    <div className="mx-auto my-2 h-px w-6 bg-slate-200 first:hidden" aria-hidden />
  ) : (
    <p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </p>
  )
);

export const Sidebar = ({ mobileMenuOpen, setMobileMenuOpen, isMinimized, setIsMinimized }) => {
  const { check } = useUserPermissions();
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [pendingBillingCount, setPendingBillingCount] = useNavCachedState('pending_billing_count', 0);
  const whatsappChannel = useWhatsappChannel();

  const hasProjects = useMemo(() => {
    const branchId = localStorage.getItem('branch_id');
    const branchesJson = localStorage.getItem('user_branches');
    if (branchId) return true;
    if (branchesJson) {
      try {
        const parsed = JSON.parse(branchesJson);
        return parsed && parsed.length > 0;
      } catch (e) {
        return false;
      }
    }
    return false;
  }, []);

  const location = useLocation();
  // Every page mounts its own Sidebar, so this must be correct on the first
  // render — mirroring it into state via an effect painted '' (= Dashboard
  // active) for a frame on each navigation.
  const currentPath = location.pathname;

  // Fetch and calculate total unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const chats = await mockDbHelper.getChats();
        const totalUnread = chats.reduce((total, chat) => {
          const unreadValueRaw = Number(chat.unread_count ?? 0);
          const unreadCount = Number.isFinite(unreadValueRaw) ? Math.max(0, unreadValueRaw) : 0;
          return total + unreadCount;
        }, 0);
        setTotalUnreadCount(totalUnread);
      } catch (error) {
        setTotalUnreadCount(0);
      }
    };

    fetchUnreadCount();

    // Set up mock listener
    const unsubscribe = mockDbHelper.setOnDataChange(() => {
      fetchUnreadCount();
    });

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchUnreadCount, 5000);

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      clearInterval(interval);
    };
  }, []);

  // Pending billing badge: completed tasks not yet billed (GET /billing/pending-count).
  // Refreshes on mount, every 60s, on navigation, and when the billing page
  // dispatches "ooms:billing-updated" after raising or skipping bills.
  const fetchPendingBillingCount = useCallback(async () => {
    try {
      const headers = await getHeaders();
      if (!headers || !localStorage.getItem('branch_id')) return;
      const res = await fetch(`${API_BASE_URL}/billing/pending-count`, { headers });
      if (!res.ok) return;
      const result = await res.json();
      if (result?.success) {
        setPendingBillingCount(Math.max(0, Number(result.data?.pending) || 0));
      }
    } catch (error) {
      // Keep the last known value on network/DB hiccups
    }
  }, []);

  useEffect(() => {
    fetchPendingBillingCount();
    const interval = setInterval(fetchPendingBillingCount, 60000);
    const onBillingUpdated = () => fetchPendingBillingCount();
    window.addEventListener('ooms:billing-updated', onBillingUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ooms:billing-updated', onBillingUpdated);
    };
  }, [fetchPendingBillingCount]);

  useEffect(() => {
    fetchPendingBillingCount();
  }, [location.pathname, fetchPendingBillingCount]);

  const toggleSubmenu = (menuKey) => {
    setOpenSubmenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const handleSidebarHover = (hoverState) => {
    if (isMinimized) setIsHovered(hoverState);
  };

  const menuSections = useMemo(() => {
    const branchAdmin = isStoredBranchAdmin();
    const sections = [
      {
        label: 'Overview',
        items: [
          { key: 'dashboard', title: 'Dashboard', icon: <FiHome size={17} />, path: '/' },
        ],
      },
      {
        label: 'Work',
        items: [
          {
            key: 'tasks', title: 'Tasks', icon: <FiCheckSquare size={17} />,
            path: '/task/view',
            permission: 'task_',
            submenus: [
              { title: 'New Task', action: 'openTaskCreate', permission: 'task_create' },
              { title: 'View Task', path: '/task/view', permission: 'task_view' }
            ]
          },
          {
            key: 'recurring-tasks', title: 'Compliance', icon: <FiRepeat size={17} />,
            path: '/compliance',
            permission: 'recurring_task_'
          },
          {
            key: 'clients', title: 'Clients', icon: <FiUsers size={17} />,
            path: '/client/view',
            permission: 'client_',
            submenus: [
              { title: 'New Client', path: '/client/create', permission: 'client_create' },
              { title: 'View Client', path: '/client/view', permission: 'client_view' }
            ]
          },
        ],
      },
      {
        label: 'Finance',
        items: [
          {
            key: 'billing',
            title: 'Billing',
            icon: <FiFileText size={17} />,
            path: '/billing',
            badgeCount: pendingBillingCount,
            badgeColor: 'bg-amber-500',
            badgeText: 'Pending',
            permission: 'finance_'
          },
          { key: 'finance', title: 'Finance', icon: <FiBarChart2 size={17} />, path: '/finance/voucher/', permission: 'finance_' },
        ],
      },
      {
        label: 'Office',
        items: [
          {
            key: 'assistance',
            title: 'Assistance',
            icon: <FiBriefcase size={17} />,
            path: '/office-assistance',
            permission: 'office_assistance_'
          },
          {
            key: 'staff-management', title: 'Staff Management', icon: <FiBookOpen size={17} />,
            permission: 'staff_',
            submenus: [
              { title: 'Attendance', path: '/staff/attendance', permission: 'staff_view' },
              { title: 'Team Report', path: '/staff/team-report', permission: 'staff_report' },
              { title: 'Staff', path: '/staff/view', permission: 'staff_view' },
            ]
          },
        ],
      },
      ...(branchAdmin ? [{
        label: 'Reports',
        items: [
          { key: 'executive-summary', title: 'Executive Summary', icon: <FiFileText size={17} />, path: '/reports/executive-summary' },
        ],
      }] : []),
      {
        label: 'Communication',
        items: [
          { key: 'broadcast', title: 'Broadcast', icon: <FiRadio size={17} />, path: '/broadcast/whatsapp', permission: 'broadcast_' },
          { key: 'voice-call-history', title: 'Call History', icon: <FiPhone size={17} />, path: '/voice-call-history' },
          ...(whatsappChannel === 'onechatting'
            ? [{
              key: 'whatsapp-live-chat',
              title: 'Live Chat',
              icon: <FiMessageCircle size={17} />,
              path: '/broadcast/whatsapp/onechatting/live-chat',
              permission: 'broadcast_'
            }]
            : []),
        ],
      },
      {
        label: 'System',
        items: [
          { key: 'settings', title: 'Settings', icon: <FiSettings size={17} />, path: '/settings', permission: 'setting_' },
          { key: 'subscription', title: 'Subscription', icon: <FiCreditCard size={17} />, path: '/subscription', permission: 'subscription_' },
          { key: 'help-support', title: 'Help & Support', icon: <FiHelpCircle size={17} />, path: '/help-support' },
        ],
      },
    ];

    return sections;
  }, [whatsappChannel, pendingBillingCount]);

  const renderNav = (isMobile) => (
    <nav className="space-y-0.5" aria-label="Primary">
      {menuSections.map((section) => (
        <div key={section.label} className="pt-4 first:pt-0">
          <SectionLabel mini={!isMobile && isMinimized && !isHovered}>{section.label}</SectionLabel>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                isMobile={isMobile}
                isMinimized={isMinimized}
                isHovered={isHovered}
                currentPath={currentPath}
                openSubmenus={openSubmenus}
                toggleSubmenu={toggleSubmenu}
                setHoveredMenu={setHoveredMenu}
                hoveredMenu={hoveredMenu}
                hasProjects={hasProjects}
                setMobileMenuOpen={setMobileMenuOpen}
                unreadCount={totalUnreadCount}
                pendingBillingCount={pendingBillingCount}
                checkPermission={check}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const isMini = isMinimized && !isHovered;

  return (
    <>
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} />
            <motion.div className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-2xl md:hidden" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}>
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
                <div className="flex items-center gap-2.5">
                  <img src="/logo512.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
                  <div className="flex flex-col leading-none">
                    <span className="font-display text-[16px] font-extrabold tracking-tight text-slate-900">OOMS</span>
                    <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">ONESAAS CLOUD</span>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Close menu">
                  <FiX size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                {renderNav(true)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.aside
        className="hidden md:fixed md:inset-y-0 md:z-40 md:flex md:flex-col border-r border-slate-200 bg-white"
        data-app-sidebar
        initial={false}
        animate={{ width: isMini ? 80 : 260 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        style={{ top: '64px', height: 'calc(100vh - 64px)' }}
        onMouseEnter={() => handleSidebarHover(true)}
        onMouseLeave={() => handleSidebarHover(false)}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-hide">
          {renderNav(false)}
        </div>

        <div className="shrink-0 border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={() => setIsMinimized && setIsMinimized(!isMinimized)}
            className={`flex w-full items-center rounded-lg text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${isMini ? 'h-9 justify-center' : 'h-9 gap-2.5 px-2.5'}`}
            title={isMinimized ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiSidebar size={16} className="shrink-0 text-slate-400" />
            {!isMini && <span>{isMinimized ? 'Expand sidebar' : 'Collapse sidebar'}</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

// ==========================================
// 8. Main Layout Wrapper (Default Export)
// ==========================================
const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="app-page font-sans text-slate-900">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <main
        className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
          }`}
      >
        <div className="app-content mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
