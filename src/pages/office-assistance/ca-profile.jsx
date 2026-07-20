import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiChevronRight,
  FiCheckSquare,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiMail,
  FiMaximize2,
  FiMinimize2,
  FiPhone,
  FiRefreshCw,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Header, Sidebar } from "../../components/header";
import ProfileTab from "../../CAComponents/ProfileTab";
import TaskTab from "../../CAComponents/TaskTab";
import LedgerTab from "../../CAComponents/LedgerTab";
import BillingTab from "../../CAComponents/BillingTab";
import { fetchCaDetailsProfile } from "../../services/caService";

const EMPTY_CA_DATA = {
  name: "",
  care_of: "",
  guardian_name: "",
  date_of_birth: "",
  gender: "",
  mobile: "",
  country_code: "91",
  email: "",
  pan_number: "",
  image: null,
  is_active: true,
  state: "",
  district: "",
  city: "",
  village_town: "",
  pincode: "",
  address_line_1: "",
  address_line_2: "",
  balance: 0,
  debit: 0,
  credit: 0,
};

const TabLink = ({ to, icon: Icon, label, isActive, onClick }) => (
  <motion.button
    type="button"
    onClick={() => onClick(to)}
    className={`flex flex-col items-center justify-center rounded-lg p-3 transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
        : "border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`}
    whileHover={{ scale: 1.03, y: -1 }}
    whileTap={{ scale: 0.98 }}
  >
    <Icon className="mb-1 h-4 w-4" />
    <span className="text-center text-xs font-medium leading-tight">
      {label}
    </span>
  </motion.button>
);

const CompactTabIcon = ({ to, icon: Icon, label, isActive, onClick }) => (
  <motion.button
    type="button"
    onClick={() => onClick(to)}
    className={`flex min-w-[70px] flex-col items-center justify-center rounded-lg p-2 transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
        : "border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`}
    whileHover={{ scale: 1.05, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <Icon className="mx-auto mb-1 h-4 w-4" />
    <span className="w-full text-center text-[10px] font-medium leading-tight">
      {label}
    </span>
  </motion.button>
);

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const CAProfile = () => {
  const { username: usernameParam, tab = "profile" } = useParams();
  const username = decodeURIComponent(usernameParam || "").trim();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [tabsMinimized, setTabsMinimized] = useState(() => {
    const saved = localStorage.getItem("caTabsMinimized");
    return saved ? JSON.parse(saved) : true;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previousUsername, setPreviousUsername] = useState(null);
  const [caData, setCaData] = useState(EMPTY_CA_DATA);

  const profileTabs = [
    { id: "profile", name: "Profile", icon: FiUser },
    { id: "tasks", name: "Tasks", icon: FiCheckSquare },
    { id: "billing", name: "Billing", icon: FiFileText },
    { id: "ledger", name: "Ledger", icon: FiDollarSign },
  ];

  const fetchCaData = useCallback(
    async (currentUsername) => {
      const usernameToFetch = currentUsername || username;

      if (!usernameToFetch) {
        setError("No username provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await fetchCaDetailsProfile(usernameToFetch);

        if (result?.success && result.data) {
          const apiData = result.data;
          setCaData({
            name: apiData.basic?.name || "",
            care_of: apiData.basic?.care_of || "",
            guardian_name: apiData.basic?.guardian_name || "",
            date_of_birth: apiData.basic?.date_of_birth || "",
            gender: apiData.basic?.gender || "",
            mobile: apiData.basic?.mobile || "",
            country_code: apiData.basic?.country_code || "91",
            email: apiData.basic?.email || "",
            pan_number: apiData.basic?.pan_number || "",
            image: apiData.basic?.image || null,
            is_active: Boolean(apiData.basic?.is_active),
            state: apiData.basic?.address?.state || "",
            district: apiData.basic?.address?.district || "",
            city: apiData.basic?.address?.city || "",
            village_town: apiData.basic?.address?.village_town || "",
            pincode: apiData.basic?.address?.pincode || "",
            address_line_1: apiData.basic?.address?.address_line_1 || "",
            address_line_2: apiData.basic?.address?.address_line_2 || "",
            balance: apiData.transactional?.balance ?? 0,
            debit: apiData.transactional?.debit ?? 0,
            credit: apiData.transactional?.credit ?? 0,
          });
        } else {
          setError(result?.message || "Failed to fetch CA profile");
        }
      } catch (err) {
        console.error("CA profile fetch:", err);
        if (err.response?.status === 404) {
          setError(`CA with username "${usernameToFetch}" not found.`);
        } else if (err.response?.status === 401) {
          setError("Unauthorized. Please login again.");
        } else {
          setError(
            err.response?.data?.message ||
              (err.request
                ? "No response from server. Please check your connection."
                : err.message) ||
              "Failed to fetch CA profile",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [username],
  );

  useEffect(() => {
    if (username && username !== previousUsername) {
      setCaData(EMPTY_CA_DATA);
      setError(null);
      setPreviousUsername(username);
      fetchCaData(username);
    }

    if (username && !tab) {
      navigate(
        `/staff/office-assistance/ca-profile/${encodeURIComponent(username)}/profile`,
        {
          replace: true,
        },
      );
    }
  }, [username, tab, previousUsername, fetchCaData, navigate]);

  useEffect(() => {
    if (username && !previousUsername) {
      setPreviousUsername(username);
      fetchCaData(username);
    }
  }, [username, previousUsername, fetchCaData]);

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem("caTabsMinimized", JSON.stringify(tabsMinimized));
  }, [tabsMinimized]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  const handleEditField = (field, value) => {
    setCaData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTabClick = (tabId) => {
    navigate(
      `/staff/office-assistance/ca-profile/${encodeURIComponent(username)}/${tabId}`,
    );
  };

  const renderTabContent = () => {
    const tabMap = {
      profile: "profile",
      tasks: "tasks",
      billing: "billing",
      ledger: "ledger",
    };
    const componentKey = tabMap[tab] || "profile";

    const tabComponents = {
      profile: (
        <ProfileTab
          caData={caData}
          onEdit={handleEditField}
          loading={loading}
          caUsername={username}
          onRefresh={() => fetchCaData(username)}
        />
      ),
      tasks: <TaskTab caUsername={username} />,
      billing: <BillingTab caUsername={username} />,
      ledger: (
        <LedgerTab
          caUsername={username}
          caName={caData.name}
          caEmail={caData.email}
          caMobile={caData.mobile}
          caCountryCode={caData.country_code}
        />
      ),
    };

    return tabComponents[componentKey] || tabComponents.profile;
  };

  const tabLabel = profileTabs.find((t) => t.id === tab)?.name || "Profile";

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

      <div
        className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {loading && (
              <div className="mb-6 flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 shadow-md">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="font-medium text-gray-600">
                  Loading CA profile...
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <FiX className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Error Loading Profile
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{error}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fetchCaData(username)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/staff/office-assistance/ca-list")}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && (
              <>
                <nav
                  className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-slate-500 sm:text-sm"
                  aria-label="Breadcrumb"
                >
                  <button
                    type="button"
                    onClick={() => navigate("/staff/office-assistance/ca-list")}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FiHome
                      className="h-3.5 w-3.5 shrink-0 opacity-70"
                      aria-hidden
                    />
                    Chartered Accountants
                  </button>
                  <FiChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-slate-300"
                    aria-hidden
                  />
                  <span className="max-w-[12rem] truncate font-medium text-slate-800 sm:max-w-xs">
                    {caData.name || "—"}
                  </span>
                  <FiChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-slate-300"
                    aria-hidden
                  />
                  <span className="text-slate-600">{tabLabel}</span>
                </nav>

                <motion.section
                  className="mb-4 px-3 py-2.5 sm:px-4 sm:py-3"
                  style={{
                    borderRadius: "1rem",
                    background:
                      "linear-gradient(145deg, #f8fafc 0%, #e8ecfe 38%, #f1edff 100%)",
                    border: "1px solid rgba(199, 210, 254, 0.95)",
                    boxShadow:
                      "0 1px 3px rgba(49, 46, 129, 0.08), 0 0 0 1px rgba(30, 27, 75, 0.045)",
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  aria-label="CA summary"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200/90 sm:h-11 sm:w-11">
                        {caData.image ? (
                          <img
                            src={caData.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <FiUser className="h-[18px] w-[18px]" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Chartered Accountant
                        </p>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <h1 className="min-w-0 max-w-full truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-lg">
                            {caData.name || "—"}
                          </h1>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${
                              caData.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-amber-200 bg-amber-50 text-amber-900"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                caData.is_active
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              }`}
                              aria-hidden
                            />
                            {caData.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex w-full flex-col px-2 py-1.5 text-left sm:w-auto sm:min-w-[6.5rem] sm:text-right"
                      style={{
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(255, 255, 255, 0.9)",
                        backgroundColor: "rgba(255, 255, 255, 0.88)",
                        boxShadow: "0 1px 2px rgba(49, 46, 129, 0.07)",
                        backdropFilter: "blur(2px)",
                      }}
                      role="status"
                      aria-label="Account balance"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Balance
                      </span>
                      <span
                        className={`mt-0.5 text-center text-sm font-semibold tabular-nums tracking-tight sm:text-base ${
                          Number(caData.balance ?? 0) < 0
                            ? "text-rose-700"
                            : Number(caData.balance ?? 0) > 0
                              ? "text-emerald-700"
                              : "text-slate-800"
                        }`}
                      >
                        {Number(caData.balance ?? 0) < 0
                          ? `- ₹${Math.abs(caData.balance).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}`
                          : `₹${Number(caData.balance ?? 0).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}`}
                      </span>
                    </div>
                  </div>
                  <dl
                    className="mt-3 grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-4"
                    style={{ borderTop: "1px solid rgba(199, 210, 254, 0.8)" }}
                  >
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2"
                      style={{
                        background: "rgba(238, 242, 255, 0.72)",
                        border: "1px solid rgba(199, 210, 254, 0.9)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Guardian
                      </dt>
                      <dd className="mt-0.5 truncate text-xs font-medium text-slate-900 sm:text-[13px]">
                        {(() => {
                          const prefix = (caData.care_of || "").trim();
                          const gname = (caData.guardian_name || "").trim();
                          const line = [prefix, gname]
                            .filter(Boolean)
                            .join(" ")
                            .trim();
                          return line || "—";
                        })()}
                      </dd>
                    </div>
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2"
                      style={{
                        background: "rgba(236, 254, 255, 0.72)",
                        border: "1px solid rgba(186, 230, 253, 0.9)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Date of birth
                      </dt>
                      <dd className="mt-0.5 text-xs font-medium tabular-nums text-slate-900 sm:text-[13px]">
                        {formatDate(caData.date_of_birth) || "—"}
                      </dd>
                    </div>
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2 sm:col-span-2 lg:col-span-1"
                      style={{
                        background: "rgba(241, 245, 249, 0.88)",
                        border: "1px solid rgba(203, 213, 225, 0.95)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Phone
                      </dt>
                      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-900 sm:text-[13px]">
                        <FiPhone
                          className="h-3.5 w-3.5 shrink-0 text-slate-500"
                          aria-hidden
                        />
                        <span className="min-w-0 truncate">
                          {caData.mobile
                            ? `+${caData.country_code || "91"} ${caData.mobile}`
                            : "—"}
                        </span>
                      </dd>
                    </div>
                    <div
                      className="min-w-0 rounded-lg px-2.5 py-2 sm:col-span-2 lg:col-span-1"
                      style={{
                        background: "rgba(240, 249, 255, 0.8)",
                        border: "1px solid rgba(186, 230, 253, 0.9)",
                      }}
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </dt>
                      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-900 sm:text-[13px]">
                        <FiMail
                          className="h-3.5 w-3.5 shrink-0 text-slate-500"
                          aria-hidden
                        />
                        <span className="min-w-0 truncate">
                          {caData.email || "—"}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </motion.section>

                <motion.div
                  className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between p-3">
                    {tabsMinimized ? (
                      <>
                        <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
                          {profileTabs.map((tabItem) => {
                            const Icon = tabItem.icon;
                            return (
                              <CompactTabIcon
                                key={tabItem.id}
                                to={tabItem.id}
                                icon={Icon}
                                label={tabItem.name}
                                isActive={tab === tabItem.id}
                                onClick={handleTabClick}
                              />
                            );
                          })}
                        </div>
                        <motion.button
                          type="button"
                          onClick={() => setTabsMinimized(false)}
                          className="ml-1 shrink-0 rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Show full tabs"
                        >
                          <FiMaximize2 className="h-4 w-4" />
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                          {profileTabs.map((tabItem) => {
                            const Icon = tabItem.icon;
                            return (
                              <TabLink
                                key={tabItem.id}
                                to={tabItem.id}
                                icon={Icon}
                                label={tabItem.name}
                                isActive={tab === tabItem.id}
                                onClick={handleTabClick}
                              />
                            );
                          })}
                        </div>
                        <motion.button
                          type="button"
                          onClick={() => setTabsMinimized(true)}
                          className="ml-1 shrink-0 rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Minimize tabs"
                        >
                          <FiMinimize2 className="h-4 w-4" />
                        </motion.button>
                      </>
                    )}
                  </div>
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full min-w-0 text-sm"
                  >
                    {renderTabContent()}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CAProfile;
