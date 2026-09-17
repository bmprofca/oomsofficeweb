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
  FiUserCheck,
  FiUsers,
  FiTrash2,
} from "react-icons/fi";
import { Header, Sidebar } from "../components/header";

const OFFICE_MODULES = [
  {
    title: "DSC Register",
    description: "Digital signature certificates",
    icon: FiKey,
    link: "/dsc-report",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    hover: "hover:border-blue-200 hover:bg-blue-50/40",
  },
  {
    title: "File Index",
    description: "Office document index",
    icon: FiFileText,
    link: "/file-index",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    hover: "hover:border-emerald-200 hover:bg-emerald-50/40",
  },
  {
    title: "Important Links",
    description: "Quick-access resources",
    icon: FiLink,
    link: "/important-links",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    hover: "hover:border-amber-200 hover:bg-amber-50/40",
  },
  {
    title: "Password Groups",
    description: "Shared credentials vault",
    icon: FiLock,
    link: "/password-groups",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    hover: "hover:border-indigo-200 hover:bg-indigo-50/40",
  },
  {
    title: "Group Firms",
    description: "Client group firms",
    icon: FiUsers,
    link: "/groups",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    hover: "hover:border-teal-200 hover:bg-teal-50/40",
  },
  {
    title: "Services",
    description: "Offerings and pricing",
    icon: FiGrid,
    link: "/services",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    hover: "hover:border-rose-200 hover:bg-rose-50/40",
  },
  {
    title: "Service Requests",
    description: "Client request queue",
    icon: FiClipboard,
    link: "/service-requests",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    hover: "hover:border-cyan-200 hover:bg-cyan-50/40",
  },
  {
    title: "Deleted Clients",
    description: "Restore soft-deleted clients",
    icon: FiTrash2,
    link: "/deleted-clients",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    hover: "hover:border-slate-300 hover:bg-slate-50",
  },
  {
    title: "Debtor Follow-up",
    description: "Assign debtors and reminders",
    icon: FiPhoneCall,
    link: "/follow-up",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    hover: "hover:border-sky-200 hover:bg-sky-50/40",
  },
  {
    title: "CA List",
    description: "Chartered accountant directory",
    icon: FiUserCheck,
    link: "/ca-list",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    hover: "hover:border-violet-200 hover:bg-violet-50/40",
  },
  {
    title: "Auto Payment Reminder",
    description: "Automated payment alerts",
    icon: FiBell,
    link: "/auto-reminder",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    hover: "hover:border-orange-200 hover:bg-orange-50/40",
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
      whileTap={{ scale: 0.985 }}
      onClick={() => onNavigate(module.link)}
      className={`group flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3.5 py-[0.7rem] text-left shadow-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${module.hover}`}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return OFFICE_MODULES;
    return OFFICE_MODULES.filter(
      (mod) =>
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q),
    );
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  const handleNavigate = (link) => navigate(`.${link}`);

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="mx-2 my-3 sm:mx-4 md:mx-8 md:my-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 md:px-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                    <FiBriefcase className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold leading-tight text-gray-800 md:text-lg">
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
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
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
