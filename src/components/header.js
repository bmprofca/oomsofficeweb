import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiBriefcase, FiChevronDown, FiCreditCard,
  FiPlus, FiBell, FiUser, FiSettings, FiHelpCircle,
  FiLogOut, FiPieChart, FiMessageSquare, FiUsers, FiRepeat,
  FiMail, FiZap, FiCpu, FiLock, FiChevronRight, FiX, FiHome, FiBarChart2
} from 'react-icons/fi';
import { NavLink, useLocation } from 'react-router-dom';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import { useWhatsappChannel } from '../pages/broadcast/whatsapp/useWhatsappChannel';
import { useUserPermissions } from '../utils/permission-helper';
import { useTaskCreate } from '../context/TaskCreateProvider';
import { toast } from 'react-hot-toast';

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
// 3. SwitchProjectModal Component (Moved inside)
// ==========================================
const SwitchProjectModal = ({ isOpen, onClose, onSelectCompany }) => {
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      const branchesJson = localStorage.getItem('user_branches');
      if (branchesJson) {
        try {
          const parsed = JSON.parse(branchesJson);
          setCompanies(parsed || []);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [isOpen]);

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(company.branch_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="relative z-50 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Switch Branch</h2>
            <p className="text-slate-500 text-sm mt-1">Select a branch to work with</p>
          </div>

          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search branches..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pl-10 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <FiHome size={16} className="text-slate-400" />
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((branch) => (
                <button
                  key={branch.branch_id}
                  onClick={() => {
                    onSelectCompany(branch);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-white p-4 text-left hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600">
                      <FiHome size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 flex items-center gap-2">
                        {branch.name}
                        {branch.owned && (
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                            Owned
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Branch ID: {branch.branch_id}</p>
                    </div>
                  </div>
                  <FiChevronRight size={16} className="text-slate-400" />
                </button>
              ))
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <FiHome size={20} className="text-slate-400" />
                </div>
                <p className="text-slate-500">No branches found</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. Helper Functions
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
  const isActive = isItemActive(item, currentPath);
  const isLocked = item.permission ? !checkPermission(item.permission) : false;
  const isDisabled = (requiresProject(item) && !hasProjects) || isLocked;
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
                  const isSubLocked = sub.permission ? !checkPermission(sub.permission) : false;
                  return (
                    <NavLink
                      key={idx}
                      to={isSubLocked ? '#' : sub.path}
                      onClick={(e) => {
                        if (isSubLocked) {
                          e.preventDefault();
                          toast.error('Need Access Permission');
                        } else if (isMobile) {
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={
                        `flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all duration-200 no-underline hover:no-underline ${
                          isSubLocked
                            ? 'text-slate-300 cursor-not-allowed hover:bg-transparent'
                            : isSubActive
                              ? 'text-indigo-700 font-semibold bg-indigo-50'
                              : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <span>{sub.title}</span>
                      {isSubLocked && <FiLock size={12} className="text-slate-300/80" />}
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
          if (isLocked) {
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
              {isDisabled && <FiLock size={12} className="text-slate-300" />}
            </div>
          </div>
        )}
        {isMini && hoveredMenu === item.key && (
          <div className="absolute left-16 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md shadow-lg z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
            {item.title} {isDisabled && '(Locked)'}
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
  const [switchProjectModalOpen, setSwitchProjectModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState('Select Branch');
  const [userProfile, setUserProfile] = useState({ name: 'User', email: '' });

  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const name = localStorage.getItem('user_name') || localStorage.getItem('user_username') || 'User';
    const email = localStorage.getItem('user_email') || '';
    setUserProfile({ name, email });

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

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_username');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_branches');
    localStorage.removeItem('branch_id');
    localStorage.removeItem('branch_name');
    localStorage.removeItem('branch_owned');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const handleSelectCompany = (company) => {
    if (!company) return;
    setSelectedCompany(company);
    setSelectedProjectName(company.name);
    try {
      localStorage.setItem('branch_id', company.branch_id);
      localStorage.setItem('branch_name', company.name);
      localStorage.setItem('branch_owned', company.owned ? 'true' : 'false');
      window.location.reload();
    } catch (error) {
      console.error('Failed to update selected branch', error);
    }
  };

  // Get user initials for avatar
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
    { title: 'My Profile', icon: <FiUser size={16} />, path: '/my-profile' },
    { title: 'Settings', icon: <FiSettings size={16} />, path: '#' },
    { title: 'Help & Support', icon: <FiHelpCircle size={16} />, path: '#' },
  ];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-indigo-100 bg-white/90 backdrop-blur-md transition-all duration-200">
        <div className="flex h-full items-center justify-between px-4 sm:px-6">
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              className="text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 p-2 rounded-md transition-colors focus:outline-none"
              onClick={window.innerWidth >= 768 ? toggleSidebar : () => setMobileMenuOpen(true)}
            >
              <FiMenu size={22} />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-lg shadow-md shadow-indigo-200">W</div>
              <span className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block font-sans">OOMS</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 md:gap-5">
            <button
              onClick={() => setSwitchProjectModalOpen(true)}
              className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all duration-200 group"
            >
              <FiHome size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="max-w-[120px] truncate">{selectedProjectName || selectedCompany?.name || 'Select Branch'}</span>
              <FiChevronDown size={14} className="text-slate-400" />
            </button>

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 shadow-sm hover:border-indigo-200 transition-colors cursor-default">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <FiCreditCard size={14} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-bold text-slate-700 font-mono">₹{Number(walletBalance).toFixed(2)}</span>
              </div>
              <button onClick={() => navigate('/wallet-recharge')} className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 transition-all shadow-md shadow-indigo-200">
                <FiPlus size={12} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <button className="relative p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
              <FiBell size={20} />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
            </button>

            <div className="relative">
              <button className="flex items-center gap-2 focus:outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-100 rounded-full transition-all" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-medium text-sm shadow-md shadow-indigo-200 border-2 border-white">{getUserInitials()}</div>
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-56 origin-top-right rounded-xl border border-slate-100 bg-white p-1 shadow-xl ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-sm font-semibold text-slate-900">{userProfile.name || 'User'}</p>
                      <p className="text-xs text-slate-500 truncate">{userProfile.email || ''}</p>
                    </div>
                    <button className="md:hidden flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" onClick={() => { setProfileDropdownOpen(false); setSwitchProjectModalOpen(true); }}>
                      <FiHome size={16} /> Switch Branch
                    </button>
                    {profileItems.map((item, index) => (
                      <NavLink key={index} to={item.path} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors no-underline hover:no-underline" onClick={() => setProfileDropdownOpen(false)}>
                        {item.icon} {item.title}
                      </NavLink>
                    ))}
                    <div className="my-1 h-px bg-slate-100"></div>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <FiLogOut size={16} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <SwitchProjectModal
        isOpen={switchProjectModalOpen}
        onClose={() => setSwitchProjectModalOpen(false)}
        onSelectCompany={handleSelectCompany}
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
        key: 'recurring-tasks', title: 'Recurring Tasks', icon: <FiRepeat size={18} />,
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
          { title: 'Attendance', path: '/staff/attendance', permission: 'staff_attendance' },
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