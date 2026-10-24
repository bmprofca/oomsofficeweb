import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiBell,
  FiBriefcase,
  FiChevronRight,
  FiClipboard,
  FiFileText,
  FiGrid,
  FiKey,
  FiLink,
  FiLock,
  FiPhoneCall,
  FiSearch,
  FiSettings,
  FiUserCheck,
  FiUsers,
  FiTrash2,
  FiCalendar,
} from "react-icons/fi";
import { Header, Sidebar } from "../components/header";
import { useUserPermissions } from "../utils/permission-helper";

const OFFICE_MODULES = [
  {
    title: "Appointments",
    description: "Schedule and manage client meetings",
    icon: FiCalendar,
    link: "/appointments",
    iconBg: "bg-white ring-1 ring-indigo-200",
    iconColor: "text-indigo-600",
    hover: "border-indigo-100 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/70 hover:shadow-md",
  },
  {
    title: "DSC Register",
    description: "Digital signature certificates",
    icon: FiKey,
    link: "/dsc-report",
    iconBg: "bg-white ring-1 ring-indigo-200",
    iconColor: "text-indigo-600",
    hover: "border-indigo-100 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/70 hover:shadow-md",
  },
  {
    title: "File Index",
    description: "Office document index",
    icon: FiFileText,
    link: "/file-index",
    iconBg: "bg-white ring-1 ring-emerald-200",
    iconColor: "text-emerald-600",
    hover: "border-emerald-100 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100/70 hover:shadow-md",
  },
  {
    title: "Important Links",
    description: "Quick-access resources",
    icon: FiLink,
    link: "/important-links",
    iconBg: "bg-white ring-1 ring-violet-200",
    iconColor: "text-violet-600",
    hover: "border-violet-100 bg-violet-50 hover:border-violet-300 hover:bg-violet-100/70 hover:shadow-md",
  },
  {
    title: "Password Groups",
    description: "Shared credentials vault",
    icon: FiLock,
    link: "/password-groups",
    iconBg: "bg-white ring-1 ring-amber-200",
    iconColor: "text-amber-600",
    hover: "border-amber-100 bg-amber-50 hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-md",
  },
  {
    title: "Group Firms",
    description: "Client group firms",
    icon: FiUsers,
    link: "/groups",
    iconBg: "bg-white ring-1 ring-sky-200",
    iconColor: "text-sky-600",
    hover: "border-sky-100 bg-sky-50 hover:border-sky-300 hover:bg-sky-100/70 hover:shadow-md",
  },
  {
    title: "Services",
    description: "Offerings and pricing",
    icon: FiGrid,
    link: "/services",
    iconBg: "bg-white ring-1 ring-rose-200",
    iconColor: "text-rose-600",
    hover: "border-rose-100 bg-rose-50 hover:border-rose-300 hover:bg-rose-100/70 hover:shadow-md",
  },
  {
    title: "Service Requests",
    description: "Client request queue",
    icon: FiClipboard,
    link: "/service-requests",
    iconBg: "bg-white ring-1 ring-teal-200",
    iconColor: "text-teal-600",
    hover: "border-teal-100 bg-teal-50 hover:border-teal-300 hover:bg-teal-100/70 hover:shadow-md",
  },
  {
    title: "Deleted Clients",
    description: "Restore soft-deleted clients",
    icon: FiTrash2,
    link: "/deleted-clients",
    iconBg: "bg-white ring-1 ring-orange-200",
    iconColor: "text-orange-600",
    hover: "border-orange-100 bg-orange-50 hover:border-orange-300 hover:bg-orange-100/70 hover:shadow-md",
  },
  {
    title: "Debtor Follow-up",
    description: "Assign debtors and reminders",
    icon: FiPhoneCall,
    link: "/follow-up",
    iconBg: "bg-white ring-1 ring-fuchsia-200",
    iconColor: "text-fuchsia-600",
    hover: "border-fuchsia-100 bg-fuchsia-50 hover:border-fuchsia-300 hover:bg-fuchsia-100/70 hover:shadow-md",
  },
  {
    title: "CA List",
    description: "Chartered accountant directory",
    icon: FiUserCheck,
    link: "/ca-list",
    iconBg: "bg-white ring-1 ring-cyan-200",
    iconColor: "text-cyan-600",
    hover: "border-cyan-100 bg-cyan-50 hover:border-cyan-300 hover:bg-cyan-100/70 hover:shadow-md",
  },
  {
    title: "Auto Payment Reminder",
    description: "Automated payment alerts",
    icon: FiBell,
    link: "/auto-reminder",
    iconBg: "bg-white ring-1 ring-lime-200",
    iconColor: "text-lime-600",
    hover: "border-lime-100 bg-lime-50 hover:border-lime-300 hover:bg-lime-100/70 hover:shadow-md",
  },
  {
    title: "Automation Center",
    description: "Automation options and enabled clients",
    icon: FiSettings,
    link: "/automations",
    absolute: true,
    iconBg: "bg-white ring-1 ring-indigo-200",
    iconColor: "text-indigo-600",
    hover: "border-indigo-100 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/70 hover:shadow-md",
    permission: "setting_view_edit",
  },
];

function ModuleCard({ module, index, onNavigate }) {
  const Icon = module.icon;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.2 }}
      whileHover={{ y: -1 }}
      onClick={() => onNavigate(module.link, module.absolute)}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${module.hover}`}
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${module.iconBg} ${module.iconColor}`}
      >
        <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold leading-snug text-gray-800 transition-colors group-hover:text-indigo-700">
          {module.title}
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] leading-snug text-gray-500">
          {module.description}
        </span>
      </span>

      <FiChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
    </motion.button>
  );
}

const OfficeAssistance = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const availableModules = OFFICE_MODULES.filter(
      (mod) => !mod.permission || check(mod.permission),
    );
    if (!q) return availableModules;
    return availableModules.filter(
      (mod) =>
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q),
    );
  }, [check, searchTerm]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  const handleNavigate = (link, absolute = false) => navigate(absolute ? link : `.${link}`);

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
                    <FiBriefcase className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-slate-900">
                      Office Assistance
                    </h1>
                  </div>
                </div>

                <div className="relative w-full shrink-0 sm:max-w-xs">
                  <label htmlFor="office-module-search" className="sr-only">
                    Search modules
                  </label>
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="office-module-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search modules…"
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
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    No modules found
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Try another term or browse all {OFFICE_MODULES.length}{" "}
                    modules.
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

export default OfficeAssistance;
