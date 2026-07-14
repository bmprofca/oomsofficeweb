import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiBriefcase, FiChevronDown, FiCreditCard,
  FiPlus, FiBell, FiUser, FiSettings, FiHelpCircle,
  FiLogOut, FiPieChart, FiMessageSquare, FiUsers, FiRepeat,
  FiMail, FiZap, FiCpu, FiLock, FiChevronRight, FiX, FiHome, FiBarChart2, FiSearch, FiPhone,
  FiLogIn, FiLogOut as FiLogOutIcon, FiClock
} from 'react-icons/fi';
import { NavLink, useLocation } from 'react-router-dom';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { useWhatsappChannel } from '../pages/broadcast/whatsapp/useWhatsappChannel';
import { useUserPermissions } from '../utils/permission-helper';
import { useTaskCreate } from '../context/TaskCreateProvider';
import { toast } from 'react-hot-toast';
import CreateBranch from './Modals/CreateBranch';
import SwitchBranchModal from './Modals/SwitchBranchModal';
import AttendancePunchSuccessModal from './Modals/AttendancePunchSuccessModal';
import { useSubscription, resetSubscriptionCache } from '../hooks/useSubscription';
import { loadUserProfileFromStorage } from '../utils/user-profile-storage';
import { applyBranchToSession, getStoredBranchRoleLabel } from '../services/branchSetupService';

// ==========================================
// 1. Constants & Styles (Modern Indigo Theme)
// ==========================================
const THEME = {
  active: "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm",
  inactive: "text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-600 border-transparent",
  locked: "text-slate-300 cursor-not-allowed hover:bg-transparent",
  iconActive: "text-indigo-600",
  iconInactive: "text-slate-400 group-hover:text-indigo-500"
};

// ==========================================
// 2. MOCK DATA & STORE
// ==========================================
// Mock Redux-like state
const mockState = {
  project: {
    walletBalance: 1250.50,
    status: 'succeeded'
  }
};

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

// Mock user data
const getMockUserData = () => {
  return {
    selected_project_id: 'proj_001',
    projects: {
      list: [
        { project_id: 'proj_001', name: 'My First Project' },
        { project_id: 'proj_002', name: 'Second Project' },
        { project_id: 'proj_003', name: 'Client Project' }
      ],
      project_count: 3
    },
    profile: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  };
};

// Mock API functions
const fetchUserProfile = async () => {
  return {
    profile: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  };
};

// ==========================================
// 3. Helper Functions
// ==========================================
const getUserData = () => {
  try {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : getMockUserData();
  } catch (error) {
    return getMockUserData();
  }
};

const requiresProject = (item) => {
  const protectedPaths = ['/live-chat', '/template', '/campaigns'];
  return protectedPaths.includes(item.path) ||
    (item.submenus && item.submenus.some(submenu => protectedPaths.includes(submenu.path)));
};

const isItemActive = (item, currentPath) => {
  if (item.path && item.path !== '#') {
    if (item.path === '/') return currentPath === '/' || currentPath === '';
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
  if (submenuPath === '/') return currentPath === '/' || currentPath === '';
  return submenuPath && submenuPath !== '#' && (currentPath === submenuPath || currentPath.startsWith(submenuPath + '/'));
};

// ==========================================
// 5. NavItem Component (Updated for Billing Badge) - Force rebuild cache
// ==========================================
const NavItem = ({ item, isMobile, isMinimized, isHovered, currentPath, openSubmenus, toggleSubmenu, setHoveredMenu, hoveredMenu, setMobileMenuOpen, hasProjects, unreadCount, pendingBillingCount, checkPermission }) => {
  const navigate = useNavigate();
  const { openTaskCreate } = useTaskCreate();
  const { hasAccess } = useSubscription();

  const getSubscriptionLevel = (key) => {
    if (key === 'whatsapp-live-chat') return 'live-chat';
    if (['dashboard', 'tasks', 'recurring-tasks', 'clients', 'billing', 'finance', 'broadcast', 'staff-management'].includes(key)) {
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
    } else if (createSubItem?.path) {
      navigate(createSubItem.path);
    }
    if (isMobile) setMobileMenuOpen(false);
  };

  // Render Submenu Item (Parent)
  if (hasSubmenu) {
    return (
      <div className="mb-1">
        <button
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
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group border
            ${isActive ? THEME.active : THEME.inactive}
            ${isMini ? 'justify-center px-2' : ''}`}
          onMouseEnter={() => isMini && setHoveredMenu(item.key)}
          onMouseLeave={() => isMini && setHoveredMenu(null)}
        >
          <div className={`flex items-center ${isMini ? 'justify-center w-full' : 'gap-3'}`}>
            <span className={`${isActive ? THEME.iconActive : THEME.iconInactive} transition-colors relative`}>
              {item.icon}
              {isMini && showBillingBadge && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white">
                  {pendingBillingCount > 9 ? '9+' : pendingBillingCount}
                </span>
              )}
            </span>
            {!isMini && <span>{item.title}</span>}
          </div>
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
                className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-indigo-50/50 transition-colors cursor-pointer"
              >
                <FiPlus size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              </span>
            ) : (
              <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <FiChevronRight size={16} className={isActive ? "text-indigo-400" : "text-slate-400"} />
              </motion.span>
            )
          )}

          {/* Tooltip for Mini Mode */}
          {isMini && hoveredMenu === item.key && (
            <div className="absolute left-16 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md shadow-lg z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
              {item.title}
              {showBillingBadge && ` • ${pendingBillingCount} Pending`}
            </div>
          )}
        </button>

        <AnimatePresence>
          {(!isMini && isOpen && !isTaskOrClientMenu) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="ml-5 pl-4 border-l-2 border-indigo-100 my-1 space-y-0.5">
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
                        `flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all duration-200 no-underline hover:no-underline ${isSubPermissionLocked
                          ? 'text-slate-300 cursor-not-allowed hover:bg-transparent'
                          : isSubActive
                            ? 'text-indigo-700 font-semibold bg-indigo-50'
                            : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <span>{sub.title}</span>
                      {isSubLocked && <FiLock size={12} className={isSubSubscriptionLocked ? "text-amber-500" : "text-slate-300/80"} />}
                    </NavLink>
                  )
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
    <div className="mb-1 relative">
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
        className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group border no-underline hover:no-underline
          ${isDisabled ? THEME.locked : isActive ? THEME.active : THEME.inactive}
          ${isMini ? 'justify-center px-2' : ''}`}
        onMouseEnter={() => isMini && setHoveredMenu(item.key)}
        onMouseLeave={() => isMini && setHoveredMenu(null)}
      >
        <span className={`${isMini ? '' : 'mr-3'} ${isDisabled ? 'text-slate-300' : isActive ? THEME.iconActive : THEME.iconInactive} transition-colors relative`}>
          {item.icon}
          {isMini && showUnreadBadge && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-green-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {isMini && showBillingBadge && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white">
              {pendingBillingCount > 9 ? '9+' : pendingBillingCount}
            </span>
          )}
        </span>
        {!isMini && (
          <div className="flex-1 flex items-center justify-between">
            <span>{item.title}</span>
            <div className="flex items-center gap-2">
              {showUnreadBadge && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {showBillingBadge && (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                  <span className="text-xs font-semibold">{pendingBillingCount}</span>
                  <span className="text-[10px] font-medium">Pending</span>
                </div>
              )}
              {isLocked && <FiLock size={12} className={isSubscriptionLocked ? "text-amber-500" : "text-slate-300"} />}
            </div>
          </div>
        )}
        {isMini && hoveredMenu === item.key && (
          <div className="absolute left-16 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md shadow-lg z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
            {item.title} {isLocked && '(Locked)'}
            {showBillingBadge && ` • ${pendingBillingCount} Pending`}
          </div>
        )}
      </NavLink>
    </div>
  );
};

// ==========================================
// 6. Header Component
// ==========================================
export const Header = ({ mobileMenuOpen, setMobileMenuOpen, isMinimized, setIsMinimized }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [switchProjectModalOpen, setSwitchProjectModalOpen] = useState(false);
  const [branchSetupOpen, setBranchSetupOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState('Select Branch');
  const [userProfile, setUserProfile] = useState({ name: 'User', mobile: '', roleLabel: 'Member' });
  const profileTriggerRef = useRef(null);
  const profilePanelRef = useRef(null);
  const notificationsTriggerRef = useRef(null);
  const notificationsPanelRef = useRef(null);
  const [profilePanelStyle, setProfilePanelStyle] = useState({ top: 0, right: 0 });
  const [attendanceStatus, setAttendanceStatus] = useState({
    is_staff: false,
    can_punch_in: false,
    can_punch_out: false,
    today: null,
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [punchActionLoading, setPunchActionLoading] = useState(null);
  const [punchSuccessModal, setPunchSuccessModal] = useState({
    isOpen: false,
    type: 'punch-in',
    message: '',
    punchInTime: null,
    punchOutTime: null,
    totalHours: null,
  });

  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);

  const iconButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30';

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

  const handleLogout = () => {
    setProfileDropdownOpen(false);
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
    navigate('/login');
  };

  const handleSelectCompany = (company) => {
    if (!company) return;
    setSelectedCompany(company);
    setSelectedProjectName(company.name);
    try {
      applyBranchToSession(company);
      setUserProfile((prev) => ({
        ...prev,
        roleLabel: getStoredBranchRoleLabel(),
      }));
      resetSubscriptionCache();
      window.location.reload();
    } catch (error) {
      console.error('Failed to update selected branch', error);
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

  const getLoggedInUsername = () =>
    localStorage.getItem('user_username') || localStorage.getItem('username') || '';

  const loadTodayAttendanceStatus = useCallback(async (options = {}) => {
    const { silent = false } = options;
    const headers = getHeaders();
    if (!headers?.username && !headers?.token) return;

    if (!silent) setAttendanceLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/today-status`, { headers });
      const result = await res.json();
      if (result.success && result.data) {
        setAttendanceStatus({
          is_staff: !!result.data.is_staff,
          can_punch_in: !!result.data.can_punch_in,
          can_punch_out: !!result.data.can_punch_out,
          today: result.data.today || null,
        });
      } else {
        setAttendanceStatus({
          is_staff: false,
          can_punch_in: false,
          can_punch_out: false,
          today: null,
        });
      }
    } catch (error) {
      console.error('Failed to load attendance status', error);
    } finally {
      if (!silent) setAttendanceLoading(false);
    }
  }, []);

  const runPunchAction = useCallback(async (action) => {
    const username = getLoggedInUsername();
    if (!username) {
      toast.error('Unable to identify logged-in user');
      return;
    }

    const headers = getHeaders();
    if (!headers) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    const submitPunch = async (latitude = null, longitude = null) => {
      setPunchActionLoading(action);
      try {
        const res = await fetch(`${API_BASE_URL}/attendance/${action}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ username, latitude, longitude }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || `Failed to ${action.replace('-', ' ')}`);
        }

        if (action === 'punch-in') {
          const punchInTime = result.data?.punch_in_time || new Date().toISOString();
          setAttendanceStatus((prev) => ({
            ...prev,
            can_punch_in: false,
            can_punch_out: true,
            today: {
              ...(prev.today || {}),
              punch_in_time: punchInTime,
              punch_out_time: null,
            },
          }));
          setProfileDropdownOpen(false);
          setPunchSuccessModal({
            isOpen: true,
            type: 'punch-in',
            message: result.message || 'Punch in recorded successfully.',
            punchInTime,
            punchOutTime: null,
            totalHours: null,
          });
        } else {
          const punchInTime = result.data?.punch_in || result.data?.punch_in_time || attendanceStatus.today?.punch_in_time;
          const punchOutTime = result.data?.punch_out || result.data?.punch_out_time || new Date().toISOString();
          setAttendanceStatus((prev) => ({
            ...prev,
            can_punch_in: false,
            can_punch_out: false,
            today: {
              ...(prev.today || {}),
              punch_in_time: punchInTime,
              punch_out_time: punchOutTime,
            },
          }));
          setProfileDropdownOpen(false);
          setPunchSuccessModal({
            isOpen: true,
            type: 'punch-out',
            message: result.message || 'Punch out recorded successfully.',
            punchInTime,
            punchOutTime,
            totalHours: result.data?.total_hours ?? null,
          });
        }

        await loadTodayAttendanceStatus({ silent: true });
      } catch (error) {
        toast.error(error.message || `Failed to ${action.replace('-', ' ')}`);
      } finally {
        setPunchActionLoading(null);
      }
    };

    if (!navigator.geolocation) {
      await submitPunch();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => submitPunch(position.coords.latitude, position.coords.longitude),
      () => submitPunch(),
      { timeout: 10000, maximumAge: 60000 },
    );
  }, [loadTodayAttendanceStatus, attendanceStatus.today?.punch_in_time]);

  useEffect(() => {
    if (!profileDropdownOpen) return undefined;
    loadTodayAttendanceStatus();
    return undefined;
  }, [profileDropdownOpen, loadTodayAttendanceStatus]);

  const profileItems = [
    { title: 'My Profile', icon: FiUser, path: '/my-profile' },
    { title: 'Settings', icon: FiSettings, path: '/settings' },
    { title: 'Help & Support', icon: FiHelpCircle, path: '/settings' },
  ];

  const branchLabel = selectedProjectName || selectedCompany?.name || 'Select Branch';

  const attendanceButtonState = useMemo(() => {
    if (!attendanceStatus.is_staff) {
      return { canPunchIn: false, canPunchOut: false, hasOpenPunch: false, isDayComplete: false };
    }

    const hasOpenPunch = Boolean(
      attendanceStatus.today?.punch_in_time && !attendanceStatus.today?.punch_out_time,
    );
    const isDayComplete = Boolean(
      attendanceStatus.today?.punch_in_time && attendanceStatus.today?.punch_out_time,
    );

    return {
      canPunchIn: !hasOpenPunch && !isDayComplete && attendanceStatus.can_punch_in,
      canPunchOut: hasOpenPunch || attendanceStatus.can_punch_out,
      hasOpenPunch,
      isDayComplete,
    };
  }, [attendanceStatus]);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedProfileTrigger = profileTriggerRef.current?.contains(event.target);
      const clickedProfilePanel = profilePanelRef.current?.contains(event.target);
      const clickedNotificationsTrigger = notificationsTriggerRef.current?.contains(event.target);
      const clickedNotificationsPanel = notificationsPanelRef.current?.contains(event.target);

      if (profileDropdownOpen && !clickedProfileTrigger && !clickedProfilePanel) {
        setProfileDropdownOpen(false);
      }

      if (notificationsOpen && !clickedNotificationsTrigger && !clickedNotificationsPanel) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen, notificationsOpen]);

  const renderAvatar = (size = 'sm') => {
    const sizeClass = size === 'lg' ? 'h-8 w-8 text-[11px]' : 'h-7 w-7 text-[10px]';
    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 font-semibold text-white shadow-sm ring-2 ring-white`}
      >
        {getUserInitials()}
      </div>
    );
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
          {/* Left: menu + brand */}
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              className={iconButtonClass}
              onClick={handleMenuClick}
              aria-label="Toggle navigation"
            >
              <FiMenu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="group flex h-8 items-center gap-2 rounded-lg px-1 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-xs font-bold text-white shadow-sm ring-1 ring-indigo-500/20">
                O
              </div>
              <span className="hidden text-sm font-bold tracking-tight text-slate-900 sm:block">OOMS</span>
            </button>
          </div>

          {/* Center: search (desktop) */}
          <div className="relative hidden max-w-md flex-1 lg:block">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients, tasks, modules..."
              className="h-8 w-full rounded-lg border border-slate-200/80 bg-slate-50/90 pl-9 pr-12 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1 py-px text-[10px] font-medium text-slate-400 xl:inline-block">
              /
            </kbd>
          </div>

          {/* Right: branch, wallet, actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSwitchProjectModalOpen(true)}
              className="hidden h-8 max-w-[160px] items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2 text-xs font-medium text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700 md:inline-flex"
            >
              <FiHome className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span className="truncate">{branchLabel}</span>
              <FiChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/wallet-recharge')}
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2 text-xs transition-all hover:border-indigo-200 hover:shadow-sm sm:inline-flex"
              title="Wallet balance"
            >
              <FiCreditCard className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="font-semibold text-slate-800 font-mono">
                ₹{Number(walletBalance).toFixed(2)}
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                <FiPlus className="h-3 w-3" />
              </span>
            </button>

            <button type="button" className={`${iconButtonClass} lg:hidden`} aria-label="Search">
              <FiSearch className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                ref={notificationsTriggerRef}
                type="button"
                className={`${iconButtonClass} relative`}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileDropdownOpen(false);
                }}
              >
                <FiBell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {notificationsOpen ? (
                <div
                  ref={notificationsPanelRef}
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Notifications</p>
                      <p className="text-xs text-slate-500">Important updates and alerts</p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                      Live
                    </span>
                  </div>
                  <div className="px-4 py-8 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <FiBell className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">You&apos;re all caught up</p>
                    <p className="mt-1 text-xs text-slate-500">No new notifications right now.</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden h-5 w-px bg-slate-200 sm:block" />

            <div className="relative">
              <button
                ref={profileTriggerRef}
                type="button"
                className={`flex h-8 max-w-[180px] items-center gap-1.5 rounded-lg border pl-1 pr-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${profileDropdownOpen
                  ? 'border-indigo-200 bg-indigo-50/60'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                onClick={() => {
                  setProfileDropdownOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                {renderAvatar('sm')}
                <span className="hidden truncate text-xs font-medium text-slate-800 md:block">
                  {userProfile.name || 'User'}
                </span>
                <FiChevronDown
                  className={`hidden h-3 w-3 shrink-0 text-slate-400 transition-transform md:block ${profileDropdownOpen ? 'rotate-180' : ''
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
                    className="fixed z-[9999] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]"
                    style={{
                      top: profilePanelStyle.top,
                      right: profilePanelStyle.right,
                    }}
                    role="menu"
                  >
                    <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        {renderAvatar('lg')}
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                          <p className="truncate text-sm font-semibold leading-none text-slate-900">
                            {userProfile.name || 'User'}
                          </p>
                          <span className="w-fit rounded border border-indigo-200 bg-indigo-50 px-1.5 py-px text-[10px] font-semibold uppercase leading-none tracking-wide text-indigo-700">
                            {userProfile.roleLabel || 'Member'}
                          </span>
                          {userProfile.mobile ? (
                            <p className="flex items-center gap-1 truncate text-xs leading-none text-slate-500">
                              <FiPhone className="h-3 w-3 shrink-0 text-slate-400" />
                              {userProfile.mobile}
                            </p>
                          ) : (
                            <p className="text-xs leading-none text-slate-400">Mobile not available</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        type="button"
                        className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 md:hidden"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setSwitchProjectModalOpen(true);
                        }}
                      >
                        <FiHome className="h-4 w-4 shrink-0 text-slate-400" />
                        Switch Branch
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
                              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors no-underline hover:no-underline ${isActive
                                ? 'bg-indigo-50 font-medium text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                            {item.title}
                          </NavLink>
                        );
                      })}

                      {attendanceStatus.is_staff ? (
                        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <FiClock className="h-3.5 w-3.5" />
                            Attendance
                          </div>
                          {attendanceLoading ? (
                            <p className="px-1 py-1 text-xs text-slate-500">Loading status...</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={!attendanceButtonState.canPunchIn || punchActionLoading !== null}
                                onClick={() => runPunchAction('punch-in')}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FiLogIn className="h-3.5 w-3.5" />
                                {punchActionLoading === 'punch-in' ? 'Punching in...' : 'Punch In'}
                              </button>
                              <button
                                type="button"
                                disabled={!attendanceButtonState.canPunchOut || punchActionLoading !== null}
                                onClick={() => runPunchAction('punch-out')}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FiLogOutIcon className="h-3.5 w-3.5" />
                                {punchActionLoading === 'punch-out' ? 'Punching out...' : 'Punch Out'}
                              </button>
                            </div>
                          )}
                          {attendanceButtonState.hasOpenPunch && !attendanceLoading ? (
                            <p className="mt-2 px-1 text-[11px] leading-snug text-slate-500">
                              You are punched in for today.
                            </p>
                          ) : null}
                          {attendanceButtonState.isDayComplete && !attendanceLoading ? (
                            <p className="mt-2 px-1 text-[11px] leading-snug text-slate-500">
                              Attendance completed for today.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="border-t border-slate-100 p-2">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
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

      <AttendancePunchSuccessModal
        isOpen={punchSuccessModal.isOpen}
        onClose={() => {
          setPunchSuccessModal((prev) => ({ ...prev, isOpen: false }));
          loadTodayAttendanceStatus({ silent: true });
        }}
        type={punchSuccessModal.type}
        message={punchSuccessModal.message}
        punchInTime={punchSuccessModal.punchInTime}
        punchOutTime={punchSuccessModal.punchOutTime}
        totalHours={punchSuccessModal.totalHours}
      />
    </>
  );
};

// ==========================================
// 7. Sidebar Component
// ==========================================
export const Sidebar = ({ mobileMenuOpen, setMobileMenuOpen, isMinimized, setIsMinimized }) => {
  const { check } = useUserPermissions();
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [pendingBillingCount, setPendingBillingCount] = useState(23); // Mock pending billing count
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

  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname]);

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

  // Mock function to fetch pending billing count (in real app, this would be an API call)
  useEffect(() => {
    // Simulate fetching pending billing count
    const fetchPendingBillingCount = async () => {
      // In real implementation, you would fetch from API
      // For now, we'll use mock data
      const mockPendingCount = 23; // This would come from an API
      setPendingBillingCount(mockPendingCount);
    };

    fetchPendingBillingCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPendingBillingCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const toggleSubmenu = (menuKey) => {
    setOpenSubmenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const handleSidebarHover = (hoverState) => {
    if (isMinimized) setIsHovered(hoverState);
  };

  const menuItems = useMemo(() => {
    const items = [
      { key: 'dashboard', title: 'Dashboard', icon: <FiHome size={18} />, path: '/' },
      {
        key: 'tasks', title: 'Tasks', icon: <FiUsers size={18} />,
        path: '/task/view',
        permission: 'task_',
        submenus: [
          { title: 'New Task', action: 'openTaskCreate', permission: 'task_create' },
          { title: 'View Task', path: '/task/view', permission: 'task_view' }
        ]
      },
      {
        key: 'recurring-tasks', title: 'Compliance', icon: <FiRepeat size={18} />,
        path: '/staff/recurring-tasks',
        permission: 'recurring_task_'
      },
      {
        key: 'clients', title: 'Clients', icon: <FiUsers size={18} />,
        path: '/client/view',
        permission: 'client_',
        submenus: [
          { title: 'New Client', path: '/client/create', permission: 'client_create' },
          { title: 'View Client', path: '/client/view', permission: 'client_view' }
        ]
      },
      {
        key: 'billing',
        title: 'Billing',
        icon: <FiBarChart2 size={18} />,
        path: '/billing',
        badgeCount: pendingBillingCount,
        badgeColor: 'bg-amber-500',
        badgeText: 'Pending',
        permission: 'finance_'
      },
      { key: 'finance', title: 'Finance', icon: <FiBarChart2 size={18} />, path: '/finance/voucher/', permission: 'finance_' },
      {
        key: 'staff-management', title: 'Staff Management', icon: <FiUsers size={18} />,
        permission: 'staff_',
        submenus: [
          { title: 'Staff', path: '/staff/view', permission: 'staff_view' },
          { title: 'Team Report', path: '/staff/team-report', permission: 'staff_report' },
          { title: 'Attendance', path: '/staff/attendance', permission: 'staff_attendance', subscriptionFeature: 'attendance-management' },
          { title: 'Assistance', path: '/staff/office-assistance', permission: 'office_assistance_' }
        ]
      },
      { key: 'broadcast', title: 'Broadcast', icon: <FiMessageSquare size={18} />, path: '/broadcast', permission: 'broadcast_' },
      ...(whatsappChannel === 'onechatting'
        ? [{
          key: 'whatsapp-live-chat',
          title: 'Live Chat',
          icon: <FiMessageSquare size={18} />,
          path: '/broadcast/whatsapp/onechatting/live-chat',
          permission: 'broadcast_'
        }]
        : []),
      { key: 'settings', title: 'Settings', icon: <FiSettings size={18} />, path: '/settings', permission: 'setting_' },
      { key: 'subscription', title: 'Subscription', icon: <FiCreditCard size={18} />, path: '/subscription', permission: 'subscription_' }
    ];

    return items;
  }, [whatsappChannel, pendingBillingCount]);

  return (
    <>
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} />
            <motion.div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl md:hidden flex flex-col" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <div className="h-16 flex items-center justify-between px-6 border-b border-indigo-100 bg-indigo-50/30">
                <span className="text-xl font-bold text-slate-800 font-sans">OOMS</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                  <FiX size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                {menuItems.map(item => (
                  <NavItem
                    key={item.key}
                    item={item}
                    isMobile={true}
                    currentPath={currentPath}
                    openSubmenus={openSubmenus}
                    toggleSubmenu={toggleSubmenu}
                    hasProjects={hasProjects}
                    setMobileMenuOpen={setMobileMenuOpen}
                    unreadCount={totalUnreadCount}
                    pendingBillingCount={pendingBillingCount}
                    checkPermission={check}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-white border-r border-indigo-100 z-40 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]"
        initial={false}
        animate={{ width: (isMinimized && !isHovered) ? 80 : 260 }}
        style={{ top: '64px', height: 'calc(100vh - 64px)' }}
        onMouseEnter={() => handleSidebarHover(true)}
        onMouseLeave={() => handleSidebarHover(false)}
      >
        <div className="flex-1 flex flex-col overflow-y-auto py-6 px-3 scrollbar-hide">
          <nav className="space-y-1">
            {menuItems.map(item => (
              <NavItem
                key={item.key}
                item={item}
                isMobile={false}
                isMinimized={isMinimized}
                isHovered={isHovered}
                currentPath={currentPath}
                openSubmenus={openSubmenus}
                toggleSubmenu={toggleSubmenu}
                setHoveredMenu={setHoveredMenu}
                hoveredMenu={hoveredMenu}
                hasProjects={hasProjects}
                unreadCount={totalUnreadCount}
                pendingBillingCount={pendingBillingCount}
                checkPermission={check}
              />
            ))}
          </nav>
        </div>

        {/* Contact Support section — hidden for now, to be implemented later */}
        {/* <AnimatePresence>
          {(!isMinimized || isHovered) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ delay: 0.1 }} className="p-4 border-t border-indigo-100">
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 text-xs border border-indigo-100 shadow-sm">
                <p className="font-semibold text-indigo-900 mb-1">Need help?</p>
                <p className="text-slate-600 mb-3 leading-relaxed">Check our docs or contact support for assistance.</p>
                <button className="w-full py-1.5 bg-white border border-indigo-200 text-indigo-600 font-medium rounded-md shadow-sm hover:bg-indigo-50 transition-colors">Contact Support</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence> */}
      </motion.div>
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;