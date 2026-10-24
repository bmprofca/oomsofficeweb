import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiChevronRight,
  FiDatabase,
  FiFileText,
  FiCalendar,
  FiLock,
  FiSearch,
  FiSettings,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { Header, Sidebar } from "../components/header";
import { useUserPermissions } from "../utils/permission-helper";

const SETTINGS_MODULES = [
  {
    title: "Staff List",
    description: "Add, edit & delete staff",
    icon: FiUsers,
    link: "/settings/staff-list",
    iconBg: "bg-white ring-1 ring-indigo-200",
    iconColor: "text-indigo-600",
    hover: "border-indigo-100 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/70 hover:shadow-md",
    permission: "setting_view_edit",
  },
  {
    title: "Admin",
    description: "Invite & manage branch admins",
    icon: FiUserCheck,
    link: "/settings/admin",
    iconBg: "bg-white ring-1 ring-emerald-200",
    iconColor: "text-emerald-600",
    hover: "border-emerald-100 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100/70 hover:shadow-md",
  },
  {
    title: "Staff Permissions",
    description: "Manage staff access rights",
    icon: FiShield,
    link: "/settings/permissions",
    iconBg: "bg-white ring-1 ring-violet-200",
    iconColor: "text-violet-600",
    hover: "border-violet-100 bg-violet-50 hover:border-violet-300 hover:bg-violet-100/70 hover:shadow-md",
    permission: "setting_view_edit",
  },
  {
    title: "Invoice Setting",
    description: "Voucher configuration",
    icon: FiFileText,
    link: "/settings/invoice-setting",
    iconBg: "bg-white ring-1 ring-amber-200",
    iconColor: "text-amber-600",
    hover: "border-amber-100 bg-amber-50 hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-md",
    permission: ["setting_view_edit", "finance_entry"],
  },
  {
    title: "Branch Settings",
    description: "Configure your branch details",
    icon: FiSettings,
    link: "/settings/branch-setting",
    iconBg: "bg-white ring-1 ring-sky-200",
    iconColor: "text-sky-600",
    hover: "border-sky-100 bg-sky-50 hover:border-sky-300 hover:bg-sky-100/70 hover:shadow-md",
    showWhenHeadBranch: true,
    permission: "setting_view_edit",
  },
  {
    title: "Google Calendar",
    description: "Connect this company's calendar for appointment invitations",
    icon: FiCalendar,
    link: "/settings/google-calendar",
    iconBg: "bg-white ring-1 ring-blue-200",
    iconColor: "text-blue-600",
    hover: "border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100/70 hover:shadow-md",
    adminOnly: true,
  },
  {
    title: "Backup & Export",
    description: "Generate and download database backups",
    icon: FiDatabase,
    link: "/settings/backup",
    iconBg: "bg-white ring-1 ring-rose-200",
    iconColor: "text-rose-600",
    hover: "border-rose-100 bg-rose-50 hover:border-rose-300 hover:bg-rose-100/70 hover:shadow-md",
    permission: "setting_view_edit",
  },
  {
    title: "AI Assistant",
    description: "Enable AI chat and set the API key",
    icon: FiZap,
    link: "/settings/ai-assistant",
    iconBg: "bg-white ring-1 ring-indigo-200",
    iconColor: "text-indigo-600",
    hover: "border-indigo-100 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/70 hover:shadow-md",
    adminOnly: true,
  },
];

function ModuleCard({ module, index, locked, onNavigate }) {
  const Icon = module.icon;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.2 }}
      whileHover={locked ? undefined : { y: -1 }}
      whileTap={locked ? undefined : { scale: 0.985 }}
      onClick={() => {
        if (!locked) onNavigate(module.link);
      }}
      disabled={locked}
      title={locked ? "Locked (no permission)" : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
        locked
          ? "cursor-not-allowed opacity-60 border-slate-200 bg-slate-50"
          : module.hover
      }`}
    >
      {locked ? (
        <span className="absolute right-2 top-2 rounded-full bg-slate-100 p-1 text-slate-400">
          <FiLock className="h-3 w-3" />
        </span>
      ) : null}

      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          locked ? "bg-slate-100 text-slate-400" : `${module.iconBg} ${module.iconColor}`
        }`}
      >
        <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[0.9375rem] font-semibold leading-snug transition-colors ${
            locked
              ? "text-slate-400"
              : "text-gray-800 group-hover:text-indigo-700"
          }`}
        >
          {module.title}
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] leading-snug text-gray-500">
          {module.description}
        </span>
      </span>

      <FiChevronRight
        className={`h-4 w-4 shrink-0 transition-colors ${
          locked ? "text-gray-200" : "text-gray-300 group-hover:text-indigo-500"
        }`}
      />
    </motion.button>
  );
}

const Settings = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");

  const userData = {
    isHeadBranch: true,
    isMainAdmin: true,
  };

  const visibleModules = useMemo(() => {
    return SETTINGS_MODULES.filter((mod) => {
      if (mod.showWhenHeadBranch && !userData.isHeadBranch) return false;
      return true;
    });
  }, [userData.isHeadBranch]);

  const filteredModules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return visibleModules;
    return visibleModules.filter(
      (mod) =>
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q),
    );
  }, [searchTerm, visibleModules]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  const isModuleLocked = (mod) => {
    // Branch-admin-only modules (also enforced by the server).
    if (mod.adminOnly) {
      return !(localStorage.getItem("branch_owned") === "true" || localStorage.getItem("branch_role") === "admin");
    }
    if (!mod.permission) return false;
    if (Array.isArray(mod.permission)) {
      return !mod.permission.some((p) => check(p));
    }
    return !check(mod.permission);
  };

  return (
    <div className="app-page">
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

      <div
        className={`min-h-screen pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? "md:pl-20" : "md:pl-[260px]"
        }`}
      >
        <div className="mx-3 my-3 sm:mx-5 sm:my-4 lg:mx-8 lg:my-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-white px-4 py-3.5 md:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                    <FiSettings className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-slate-900">
                      Application Settings
                    </h1>
                  </div>
                </div>

                <div className="relative w-full shrink-0 sm:max-w-xs">
                  <label htmlFor="settings-module-search" className="sr-only">
                    Search settings
                  </label>
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="settings-module-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search settings…"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500/25"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 md:p-4">
              {filteredModules.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredModules.map((mod, index) => (
                    <ModuleCard
                      key={mod.link}
                      module={mod}
                      index={index}
                      locked={isModuleLocked(mod)}
                      onNavigate={(link) => navigate(link)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    No settings found
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Try another term or browse all {visibleModules.length}{" "}
                    settings.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
