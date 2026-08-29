import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar, Header } from "../components/header";
import {
  FiClipboard,
  FiMessageSquare,
  FiUsers,
  FiClock,
  FiCheckSquare,
  FiFile,
  FiCalendar,
  FiUser,
  FiBriefcase,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { TbCurrencyRupee } from "react-icons/tb";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import axios from "axios";
import { useUserPermissions } from "../utils/permission-helper";

// Import tab components only
import DetailsTab from "../TaskComponent/DetailsTab";
import NotesTab from "../TaskComponent/NotesTab";
import StaffTab from "../TaskComponent/StaffTab";
import TimelogTab from "../TaskComponent/TimelogTab";
import SubtaskTab from "../TaskComponent/SubTaskTab";
import DocumentsTab from "../TaskComponent/DocumentTab";
import LedgerTab from "../TaskComponent/LedgerTab";
import { DetailsTabSkeleton } from "../TaskComponent/taskTabSkeletons";

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const SkeletonBone = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-200/90 ${className}`} />
);

/** Full-page skeleton matching task profile header + tabs + details layout. */
const TaskProfilePageSkeleton = ({ tabCount = 7 }) => {
  const tabPlaceholders = Array.from({ length: tabCount }, (_, i) => i);

  return (
    <div aria-busy="true" aria-label="Loading task profile">
      {/* Header card — mirrors live task summary */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <SkeletonBone className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-2">
              <SkeletonBone className="h-5 w-48 rounded sm:w-64" />
              <div className="flex flex-wrap gap-3">
                <SkeletonBone className="h-3.5 w-28 rounded" />
                <SkeletonBone className="h-3.5 w-32 rounded" />
                <SkeletonBone className="h-3.5 w-24 rounded" />
              </div>
            </div>
          </div>
          <SkeletonBone className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Tabs bar — mirrors horizontal tab strip */}
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex gap-1 overflow-x-auto overflow-y-hidden px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabPlaceholders.map((i) => (
            <div
              key={`tab-sk-${i}`}
              className="flex shrink-0 items-center gap-2 rounded-md px-4 py-2"
            >
              <SkeletonBone className="h-4 w-4 rounded" />
              <SkeletonBone className="h-3 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab content — mirrors Details tab layout */}
      <DetailsTabSkeleton />
    </div>
  );
};

const TaskProfile = () => {
  const { check } = useUserPermissions();
  const navigate = useNavigate();
  const { task_id, tab = "details" } = useParams();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [previousTaskId, setPreviousTaskId] = useState(null);
  const hasHydratedTaskRef = useRef(false);

  // Task data state from API
  const [taskData, setTaskData] = useState({
    task_id: "",
    client: {
      profile: {
        name: "",
      },
    },
    firm: {
      firm_name: "",
    },
    service: {
      name: "",
    },
    charges: {
      total: 0,
    },
    dates: {
      due_date: "",
      create_date: "",
    },
    billing_status: "pending",
    status: "in process",
    create_by: {
      name: "",
    },
    is_recurring: false,
  });

  // Fetch task data from API
  const fetchTaskData = useCallback(
    async (currentTaskId, { initial = false } = {}) => {
      const taskIdToFetch = currentTaskId || task_id;

      if (!taskIdToFetch) {
        setError("No task ID provided");
        if (initial) setInitialLoading(false);
        return;
      }

      const headers = getHeaders();
      if (!headers) {
        setError("Authentication headers missing. Please login again.");
        if (initial) setInitialLoading(false);
        return;
      }

      try {
        if (initial) {
          setInitialLoading(true);
          setHasLoadedOnce(false);
        }
        setError(null);

        const response = await axios.get(
          `${API_BASE_URL}/task/details/profile?task_id=${encodeURIComponent(taskIdToFetch)}`,
          { headers },
        );

        if (response.data.success && response.data.data) {
          setTaskData(response.data.data);
          setHasLoadedOnce(true);
        } else {
          setError(response.data.message || "Failed to fetch task data");
        }
      } catch (err) {
        console.error("Error fetching task data:", err);
        setError("Failed to load task details");
      } finally {
        if (initial) setInitialLoading(false);
      }
    },
    [task_id],
  );

  // Initial load / task switch — full-page skeleton
  useEffect(() => {
    if (task_id && task_id !== previousTaskId) {
      setPreviousTaskId(task_id);
      hasHydratedTaskRef.current = false;
      fetchTaskData(task_id, { initial: true });
    }
  }, [task_id, previousTaskId, fetchTaskData]);

  useEffect(() => {
    if (task_id && !tab) {
      navigate(`/task/profile/${task_id}/details`, { replace: true });
    }
  }, [task_id, tab, navigate]);

  useEffect(() => {
    if (!initialLoading && taskData?.task_id) {
      hasHydratedTaskRef.current = true;
    }
  }, [initialLoading, taskData?.task_id]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  // Animation variants
  const tabContentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  // Profile tabs
  const profileTabs = [
    { id: "details", name: "Details", icon: FiClipboard },
    { id: "notes", name: "Notes", icon: FiMessageSquare },
    { id: "staff", name: "Staff", icon: FiUsers },
    { id: "timelog", name: "Timelog", icon: FiClock },
    { id: "subtask", name: "Subtask", icon: FiCheckSquare },
    { id: "documents", name: "Documents", icon: FiFile },
    { id: "ledger", name: "Ledger", icon: TbCurrencyRupee },
  ];

  // Handle tab navigation
  const handleTabClick = (tabId) => {
    navigate(`/task/profile/${task_id}/${tabId}`);
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (tab) {
      case "details":
        return (
          <motion.div
            key="details"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <DetailsTab
              taskData={taskData}
              task_id={task_id}
              onTaskUpdated={() => fetchTaskData(task_id, { initial: false })}
            />
          </motion.div>
        );
      case "notes":
        return (
          <motion.div
            key="notes"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <NotesTab task_id={task_id} />
          </motion.div>
        );
      case "staff":
        return (
          <motion.div
            key="staff"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <StaffTab taskId={task_id} />
          </motion.div>
        );

      case "timelog":
        return (
          <motion.div
            key="timelog"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <TimelogTab task_id={task_id} />
          </motion.div>
        );
      case "subtask":
        return (
          <motion.div
            key="subtask"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <SubtaskTab task_id={task_id} />
          </motion.div>
        );
      case "documents":
        return (
          <motion.div
            key="documents"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <DocumentsTab task_id={task_id} />
          </motion.div>
        );
      case "ledger":
        return (
          <motion.div
            key="ledger"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <LedgerTab
              task_id={task_id}
              clientId={taskData?.client?.username}
              clientName={taskData?.client?.profile?.name}
              clientMobile={taskData?.client?.profile?.mobile}
              clientEmail={taskData?.client?.profile?.email}
              clientCountryCode={taskData?.client?.profile?.country_code || "91"}
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  const showFullPageSkeleton = initialLoading && !hasLoadedOnce;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
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

      {/* Main content — full-width shell (same as client profile) */}
      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="w-full px-2 sm:px-4 md:px-8 py-4 md:py-6">
          {showFullPageSkeleton && (
            <TaskProfilePageSkeleton tabCount={profileTabs.length} />
          )}

          {error && !showFullPageSkeleton && !hasLoadedOnce && (
            <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <FiX className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    Error Loading Task
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{error}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => fetchTaskData(task_id, { initial: true })}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-blue-700 hover:to-indigo-700"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}

          {!showFullPageSkeleton && hasLoadedOnce && !error && (
            <>
              {/* Simple Header Card */}
              <motion.div
                className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      <FiClipboard className="h-6 w-6 text-blue-600" />
                    </motion.div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">
                        {taskData.service?.name || "Task"}
                      </h1>
                      <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FiUser className="h-3 w-3" />
                          {taskData.client?.profile?.name || "N/A"}
                        </div>
                        <div className="flex items-center gap-1">
                          <FiBriefcase className="h-3 w-3" />
                          {taskData.firm?.firm_name || "N/A"}
                        </div>
                        <div className="flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          Due: {formatDate(taskData.dates?.due_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-100 px-4 py-2 font-semibold text-green-800">
                    Total:{" "}
                    {check("task_fees_view") ? (
                      `₹${taskData.charges?.total?.toLocaleString() || 0}`
                    ) : (
                      <span className="blur-[3.5px] select-none">₹99,999</span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Profile tabs */}
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex gap-1 overflow-x-auto overflow-y-hidden px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {profileTabs.map((tabItem) => {
                    const Icon = tabItem.icon;
                    const isActive = tab === tabItem.id;

                    return (
                      <button
                        key={tabItem.id}
                        type="button"
                        onClick={() => handleTabClick(tabItem.id)}
                        className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {tabItem.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {renderTabContent()}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskProfile;
