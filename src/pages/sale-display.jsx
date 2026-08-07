import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiEdit2,
  FiFileText,
  FiX,
  FiChevronDown,
  FiEye,
  FiPercent,
  FiLayers,
  FiLock,
  FiDownload,
  FiMoreVertical,
  FiShare2,
} from "react-icons/fi";
import { PiExportBold } from "react-icons/pi";
import { TbCurrencyRupee } from "react-icons/tb";
import { PiFilePdfDuotone, PiMicrosoftExcelLogoDuotone } from "react-icons/pi";
import { AiOutlineMail } from "react-icons/ai";
import { FaWhatsapp } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import { Header, Sidebar } from "../components/header";
import { useUserPermissions } from "../utils/permission-helper";
import EmailSelectionModal from "../components/email-selection";
import MobileSelectionModal from "../components/mobile-selection";
import { SaleForm } from "../components/Modals/CreateTransactions";
import { EditTransactionModalManager } from "../components/Modals/EditTransactions";
import {
  ViewTransactionModalManager,
  isTaskOriginSale,
  resolveSaleTaskId,
} from "../components/Modals/ViewTransactions";
import { DateRangePickerField } from "../components/PortalDatePicker";
import TablePagination from "../components/TablePagination";
import DocumentShareModal from "../components/Modals/DocumentShareModal";
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import axios from "axios";
import ExportModal from "../finance/sale-exportModal";
import toast from "react-hot-toast";

const ViewSales = () => {
  const navigate = useNavigate();
  const { check } = useUserPermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [sales, setSales] = useState([]);
  const [saleFormModal, setSaleFormModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [summary, setSummary] = useState({
    count: 0,
    net: 0,
    tax: 0,
    total: 0,
  });

  // View Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // State for dropdown menus
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const actionAnchorRef = useRef(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [shareSale, setShareSale] = useState(null);
  const [showDocumentShareModal, setShowDocumentShareModal] = useState(false);
  const [exportModal, setExportModal] = useState({
    open: false,
    type: "",
    data: null,
  });

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState([]);
  const [exportColumns, setExportColumns] = useState([]);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");

  const [isWhatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Reset to page 1 when search, date range, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, fromDate, toDate, itemsPerPage]);

  // Persist sidebar minimized state
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Lock page scroll for mobile sidebar only
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  /** ISO YYYY-MM-DD → DD/MM/YYYY for export payload (legacy backend shape) */
  const isoToDdMmYyyy = (iso) => {
    if (!iso || typeof iso !== "string") return "";
    const [y, m, d] = iso.split("T")[0].split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  };

  // Fetch sales data from API
  const fetchSalesData = useCallback(async () => {
    if (!fromDate || !toDate) return;

    setLoading(true);

    try {
      const params = {
        page_no: currentPage,
        limit: itemsPerPage,
        from_date: fromDate,
        to_date: toDate,
        search: debouncedSearchTerm || "",
      };

      const headers = await getHeaders();
      const response = await axios.get(`${API_BASE_URL}/sale/list`, {
        params,
        headers,
      });

      if (response.data.success) {
        const salesData = response.data.data || [];
        setSales(salesData);

        // Set pagination from meta
        const meta = response.data.meta || {};
        const total = Number(meta.total) || 0;
        const limit = Number(meta.limit) || itemsPerPage;
        const totalPagesFromMeta =
          meta.total_pages != null && meta.total_pages !== ""
            ? Math.max(1, Number(meta.total_pages) || 1)
            : Math.max(1, Math.ceil(total / (limit || 1)));

        setTotalRecords(total);
        setTotalPages(totalPagesFromMeta);
        setIsLastPage(Boolean(meta.is_last_page));
        setCurrentPage((prev) =>
          Math.min(Math.max(1, prev), totalPagesFromMeta),
        );

        // Set summary from stats
        const stats = response.data.stats || {};
        if (stats.amount && typeof stats.amount === "object") {
          setSummary({
            count: Number(stats.count) || 0,
            net: Number(stats.amount.net) || 0,
            tax: Number(stats.amount.tax) || 0,
            total: Number(stats.amount.total) || 0,
          });
        } else {
          setSummary({
            count: Number(stats.count) || 0,
            net: Number(stats.amount) || 0,
            tax: 0,
            total: Number(stats.amount) || 0,
          });
        }
      } else {
        console.error("API returned success false");
        setSales([]);
        setTotalRecords(0);
        setTotalPages(1);
        setIsLastPage(true);
        setSummary({ count: 0, net: 0, tax: 0, total: 0 });
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setSales([]);
      setTotalRecords(0);
      setTotalPages(1);
      setIsLastPage(true);
      setSummary({ count: 0, net: 0, tax: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, debouncedSearchTerm, currentPage, itemsPerPage]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Prepare data for export
  const prepareExportData = () => {
    const exportDataList = [];
    const exportColumnsConfig = [];

    // Build columns for export
    const columns = [
      { header: "Sl No", key: "sl_no", width: 10 },
      { header: "Date", key: "date", width: 15 },
      { header: "Invoice No", key: "invoice_no", width: 20 },
      { header: "Party Name", key: "party_name", width: 25 },
      { header: "Total Value (₹)", key: "total_value", width: 18 },
      { header: "Tax (₹)", key: "tax", width: 15 },
      { header: "Grand Total (₹)", key: "grand_total", width: 18 },
      { header: "Payment Mode", key: "payment_mode", width: 15 },
      { header: "Status", key: "status", width: 12 },
    ];

    exportColumnsConfig.push(...columns);

    // Build data rows from current sales
    sales.forEach((sale, index) => {
      const partyName =
        sale.sale_type === "client"
          ? sale.sale_party?.name || "N/A"
          : sale.sale_type === "bank"
            ? sale.sale_party?.holder || "N/A"
            : "N/A";

      const row = {
        sl_no: (currentPage - 1) * itemsPerPage + index + 1,
        date: sale.transaction_date
          ? new Date(sale.transaction_date).toLocaleDateString("en-GB")
          : "N/A",
        invoice_no: sale.invoice_no || "N/A",
        party_name: partyName,
        total_value: parseFloat(sale.calculation?.total || sale.amount || 0),
        tax: parseFloat(sale.calculation?.gst_value || 0),
        grand_total: parseFloat(
          sale.calculation?.grand_total || sale.amount || 0,
        ),
        payment_mode:
          sale.sale_type === "client"
            ? "Client"
            : sale.sale_type === "bank"
              ? "Bank Transfer"
              : "Other",
        status: "Completed",
      };
      exportDataList.push(row);
    });

    return { data: exportDataList, columns: exportColumnsConfig };
  };

  // Handle export click for modal
  const handleExportClick = () => {
    const { data, columns } = prepareExportData();

    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    setExportData(data);
    setExportColumns(columns);
    setExportModalOpen(true);
  };

  // Handle view sale details
  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setViewModalOpen(true);
    setShowActionMenu(null);
    actionAnchorRef.current = null;
    setActionMenuPosition(null);
  };

  // Download invoice PDF via POST /invoice/generate
  const handleDownloadInvoice = async (sale) => {
    const invoiceId = sale?.invoice_id;
    if (!invoiceId) {
      toast.error("Invoice ID not available for this sale");
      return;
    }

    setShowActionMenu(null);
    actionAnchorRef.current = null;
    setActionMenuPosition(null);
    setDownloadingInvoice(true);

    const toastId = toast.loading("Generating invoice…");
    try {
      const headers = getHeaders();
      if (!headers) {
        toast.error("Please log in again to download the invoice", {
          id: toastId,
        });
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/invoice/generate`,
        { invoice_id: invoiceId, type: "sale", response: "pdf" },
        { headers, responseType: "blob" },
      );

      const filename = `invoice-${sale.invoice_no || invoiceId}.pdf`;
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Invoice downloaded", { id: toastId });
    } catch (error) {
      console.error("Invoice download error:", error);
      let message = error.message || "Failed to download invoice";
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed.message || message;
        } catch {
          // keep default message
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      toast.error(message, { id: toastId });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleOpenShareSale = (sale) => {
    if (!sale?.invoice_id) {
      toast.error("Invoice ID not available for this sale");
      return;
    }
    if (sale.sale_type !== "client") {
      toast.error("Share is available for client sales only");
      return;
    }
    setShowActionMenu(null);
    actionAnchorRef.current = null;
    setActionMenuPosition(null);
    setShareSale(sale);
    setShowDocumentShareModal(true);
  };

  const handleShareSaleSend = useCallback(
    async ({ channels, mobile, email, country_code }) => {
      if (!shareSale?.invoice_id) {
        throw new Error("Invoice ID not available");
      }
      const response = await axios.post(
        `${API_BASE_URL}/invoice/share`,
        {
          invoice_id: shareSale.invoice_id,
          type: "sale",
          channels,
          mobile,
          email,
          country_code,
        },
        { headers: getHeaders() },
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to share invoice");
      }
      return response.data;
    },
    [shareSale],
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handlePageChange = (newPage) => {
    const n = Math.floor(Number(newPage));
    if (!Number.isFinite(n)) return;
    const maxPage = Math.max(1, totalPages);
    setCurrentPage(Math.min(Math.max(1, n), maxPage));
  };

  const handleSaleSuccess = (saleData) => {
    console.log("Sale created successfully:", saleData);
    fetchSalesData();
  };

  const handleEmailSubmit = (email) => {
    setSelectedEmail(email);
    setIsEmailModalOpen(false);
    console.log("Selected email:", email);
  };

  const handleWhatsappSubmit = (number) => {
    setSelectedWhatsapp(number);
    setWhatsappModalOpen(false);
    console.log("Selected number:", number);
  };

  // Handle other exports (print, whatsapp, email)
  const handleOtherExport = async (type, data = null) => {
    setExportModal({ open: true, type, data });

    setTimeout(async () => {
      try {
        const headers = await getHeaders();
        const exportDataPayload = {
          type: type,
          data: data || sales,
          date_range:
            fromDate && toDate
              ? `${isoToDdMmYyyy(fromDate)} - ${isoToDdMmYyyy(toDate)}`
              : "",
          search: searchTerm,
        };

        const response = await axios.post(
          `${API_BASE_URL}/sale/export`,
          exportDataPayload,
          {
            headers,
            responseType: type === "pdf" ? "blob" : "json",
          },
        );

        if (type === "pdf") {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `sales_report_${new Date().toISOString()}.pdf`,
          );
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } else if (type === "excel") {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `sales_report_${new Date().toISOString()}.xlsx`,
          );
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } else {
          toast.success(`${type.toUpperCase()} export completed successfully!`);
        }
      } catch (error) {
        console.error(`Error exporting ${type}:`, error);
        toast.error(`Failed to export ${type}. Please try again.`);
      } finally {
        setExportModal({ open: false, type: "", data: null });
      }
    }, 100);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!check("finance_balance_view")) {
      return "*.*";
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "0.00";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const openEditModal = (record) => {
    setEditRecord(record);
    setEditModalOpen(true);
    setShowActionMenu(null);
    actionAnchorRef.current = null;
    setActionMenuPosition(null);
    setViewModalOpen(false);
  };

  const handleSaleEditAction = (sale) => {
    if (!check("finance_entry_edit")) {
      toast.error("Need Access Permission");
      return;
    }
    if (isTaskOriginSale(sale)) {
      const taskId = resolveSaleTaskId(sale);
      if (!taskId) {
        toast.error("Task ID not found for this sale");
        return;
      }
      setShowActionMenu(null);
      actionAnchorRef.current = null;
      setActionMenuPosition(null);
      setViewModalOpen(false);
      setSelectedSale(null);
      navigate(`/task/profile/${encodeURIComponent(taskId)}/details`);
      return;
    }
    openEditModal(sale);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditRecord(null);
  };

  const handleEditSubmit = () => {
    closeEditModal();
    fetchSalesData();
  };

  // Get sale party name
  const getSalePartyName = (sale) => {
    if (sale.sale_type === "client" && sale.sale_party) {
      return sale.sale_party.name || "";
    }
    if (sale.sale_type === "bank" && sale.sale_party) {
      return sale.sale_party.holder || sale.sale_party.bank || "";
    }
    return "";
  };

  // Get sale type display name
  const getSaleTypeDisplay = (saleType) => {
    const typeMap = {
      client: "Client",
      bank: "Bank",
      cash: "Cash",
      savings: "Savings",
      current: "Current",
      loan: "Loan",
      capital: "Capital",
    };
    return typeMap[saleType] || saleType;
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedSale(null);
  };

  const computeActionMenuPosition = useCallback((anchorEl, options = {}) => {
    if (!anchorEl) return null;

    const itemCount = Math.max(1, Number(options.itemCount) || 4);
    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 176;
    const menuHeight = 8 + itemCount * 36;
    const gap = 8;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const space = {
      top: rect.top - margin,
      bottom: vh - rect.bottom - margin,
      right: vw - rect.right - margin,
      left: rect.left - margin,
    };

    const fits = {
      top: space.top >= menuHeight + gap,
      bottom: space.bottom >= menuHeight + gap,
      right: space.right >= menuWidth + gap,
      left: space.left >= menuWidth + gap,
    };

    const preferred = ["top", "bottom", "right", "left"];
    let placement = preferred.find((p) => fits[p]);

    if (!placement) {
      placement = preferred.reduce(
        (best, p) => (space[p] > space[best] ? p : best),
        "bottom",
      );
    }

    let top = 0;
    let left = 0;

    if (placement === "top") {
      top = rect.top - menuHeight - gap;
      left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === "bottom") {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - menuWidth / 2;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - menuHeight / 2;
      left = rect.right + gap;
    } else {
      top = rect.top + rect.height / 2 - menuHeight / 2;
      left = rect.left - menuWidth - gap;
    }

    const clampedLeft = Math.max(
      margin,
      Math.min(left, vw - menuWidth - margin),
    );
    const clampedTop = Math.max(
      margin,
      Math.min(top, vh - menuHeight - margin),
    );
    const anchorCenterX = rect.left + rect.width / 2;
    const anchorCenterY = rect.top + rect.height / 2;

    return {
      top: clampedTop,
      left: clampedLeft,
      placement,
      arrowX: Math.max(
        12,
        Math.min(menuWidth - 12, anchorCenterX - clampedLeft),
      ),
      arrowY: Math.max(
        12,
        Math.min(menuHeight - 12, anchorCenterY - clampedTop),
      ),
    };
  }, []);

  const handleActionClick = useCallback(
    (e, invoiceId) => {
      e.stopPropagation();
      if (showActionMenu === invoiceId) {
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
        return;
      }
      actionAnchorRef.current = e.currentTarget;
      setActionMenuPosition(
        computeActionMenuPosition(e.currentTarget, { itemCount: 4 }),
      );
      setShowActionMenu(invoiceId);
      setShowAddDropdown(false);
    },
    [showActionMenu, computeActionMenuPosition],
  );

  const activeSale = useMemo(
    () => sales.find((s) => s.invoice_id === showActionMenu) || null,
    [sales, showActionMenu],
  );

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowAddDropdown(false);
      setShowActionMenu(null);
      actionAnchorRef.current = null;
      setActionMenuPosition(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!showActionMenu || !actionAnchorRef.current) return undefined;

    const updatePosition = () => {
      setActionMenuPosition(
        computeActionMenuPosition(actionAnchorRef.current, { itemCount: 4 }),
      );
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setShowActionMenu(null);
        actionAnchorRef.current = null;
        setActionMenuPosition(null);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showActionMenu, computeActionMenuPosition]);

  // List rows are server-paginated; `sales` is already the current page from the API
  const currentItems = sales;

  // Skeleton loader component
  const SkeletonRow = () => (
    <tr className="border-b border-slate-100 animate-pulse">
      <td className="p-3 text-center">
        <div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div>
      </td>
      <td className="p-3 text-center">
        <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
      </td>
      <td className="p-3 text-center">
        <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
      </td>
      <td className="p-3 text-center">
        <div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div>
      </td>
      <td className="p-3 text-center">
        <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
      </td>
      <td className="p-3 text-center">
        <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
      </td>
      <td className="p-3 text-center">
        <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
      </td>
      <td className="p-3 text-center">
        <div className="h-6 bg-slate-200 rounded w-10 mx-auto"></div>
      </td>
    </tr>
  );

  // Skeleton Loading Component for full page
  const SkeletonLoader = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[4.25rem] animate-pulse rounded-xl border border-slate-200 bg-slate-100/80 sm:h-[4.5rem]"
              />
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/40">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="flex gap-3">
                  <div className="h-10 bg-gray-200 rounded w-40"></div>
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="border-b border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      {[...Array(8)].map((_, i) => (
                        <th key={i} className="text-center p-3">
                          <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="p-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="mb-4">
                    <div className="h-12 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show skeleton while loading
  if (loading && sales.length === 0) {
    return <SkeletonLoader />;
  }

  if (!check("finance_report")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
        >
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiLock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Access Denied
            </h3>
            <p className="text-slate-500 text-sm">
              You need the Finance Report access permission to view this report.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
        <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
          {/* Summary stats */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[
              {
                key: "count",
                label: "No. of sales",
                value: String(summary.count),
                icon: FiLayers,
                cardClass:
                  "bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white",
              },
              {
                key: "net",
                label: "Net amount",
                value: `₹${formatCurrency(summary.net)}`,
                icon: TbCurrencyRupee,
                cardClass:
                  "bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 text-white",
              },
              {
                key: "tax",
                label: "Tax amount",
                value: `₹${formatCurrency(summary.tax)}`,
                icon: FiPercent,
                cardClass:
                  "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white",
              },
              {
                key: "total",
                label: "Total amount",
                value: `₹${formatCurrency(summary.total)}`,
                icon: TbCurrencyRupee,
                cardClass:
                  "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 text-white",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className={`overflow-hidden rounded-xl border border-white/10 p-3 sm:p-3.5 ${card.cardClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-[11px]">
                        {card.label}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">
                        {card.value}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-lg p-1.5 bg-white/20">
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Sale register — flat (no card shell) */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/70"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-100/90 via-white to-indigo-50/40 py-2.5 pl-3 pr-0 sm:pl-4 sm:pr-0">
              <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 lg:min-w-0 lg:flex-1 lg:flex-nowrap lg:items-center lg:gap-x-4">
                  <h5 className="shrink-0 text-sm font-bold tracking-tight text-slate-800 sm:text-base mr-4 sm:mr-6 lg:mr-8">
                    Sale Register
                  </h5>
                  <input
                    type="text"
                    placeholder="Search…"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="h-9 w-full min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-w-[18rem] lg:min-w-[22rem] xl:min-w-[28rem]"
                  />
                  <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-auto sm:min-w-[10rem] sm:max-w-[14rem] sm:overflow-x-auto lg:max-w-[14rem] xl:max-w-[16rem]">
                    <DateRangePickerField
                      value={{ start: fromDate, end: toDate }}
                      onChange={(range) => {
                        setFromDate(range?.start || "");
                        setToDate(range?.end || "");
                      }}
                      placeholder="Select date range"
                      mode="range"
                      initialTab="quick"
                      defaultQuickKey="tm"
                      quickOptionKeys={["tw", "lw", "lm", "tm", "lf", "fy"]}
                      showRangeHint={false}
                      showResetButton={false}
                      truncateRangeLabel={false}
                      buttonClassName="w-full min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 focus:outline-none transition-all"
                      wrapperClassName="w-full min-w-0"
                    />
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto lg:pl-1">
                  <div className="dropdown-container relative shrink-0">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddDropdown(!showAddDropdown);
                      }}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow sm:h-10 sm:px-3"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PiExportBold className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">Export</span>
                      <FiChevronDown
                        className={`h-3.5 w-3.5 shrink-0 opacity-90 transition-transform ${showAddDropdown ? "rotate-180" : ""}`}
                      />
                    </motion.button>
                    <AnimatePresence>
                      {showAddDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="py-1">
                            <button
                              onClick={handleExportClick}
                              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                            >
                              <div className="p-1.5 bg-red-50 rounded mr-2 group-hover:bg-red-100 transition-colors">
                                <PiFilePdfDuotone className="w-3.5 h-3.5 text-red-500" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-xs">
                                  Export as PDF
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={handleExportClick}
                              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                            >
                              <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                <PiMicrosoftExcelLogoDuotone className="w-3.5 h-3.5 text-green-500" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-xs">
                                  Export as Excel
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={() => setWhatsappModalOpen(true)}
                              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                            >
                              <div className="p-1.5 bg-green-50 rounded mr-2 group-hover:bg-green-100 transition-colors">
                                <FaWhatsapp className="w-3.5 h-3.5 text-green-500" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-xs">
                                  Share via WhatsApp
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={() => setIsEmailModalOpen(true)}
                              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-all duration-150 group"
                            >
                              <div className="p-1.5 bg-blue-50 rounded mr-2 group-hover:bg-blue-100 transition-colors">
                                <AiOutlineMail className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-xs">
                                  Share via Email
                                </div>
                              </div>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => {
                      if (!check("finance_entry")) {
                        toast.error("Need Access Permission");
                      } else {
                        setSaleFormModal(true);
                      }
                    }}
                    className={`mr-2 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow sm:mr-3 sm:h-10 sm:px-3 ${
                      !check("finance_entry")
                        ? "opacity-60 cursor-not-allowed hover:from-emerald-600 hover:to-emerald-700"
                        : ""
                    }`}
                    whileHover={check("finance_entry") ? { scale: 1.02 } : {}}
                    whileTap={check("finance_entry") ? { scale: 0.98 } : {}}
                  >
                    {!check("finance_entry") ? (
                      <FiLock className="h-4 w-4 shrink-0" />
                    ) : (
                      <FiPlus className="h-4 w-4 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">Create</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200">
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[60px]">
                      Sl No
                    </th>
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                      Date
                    </th>
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[200px]">
                      Particulars
                    </th>
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[120px]">
                      Invoice No
                    </th>
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                      Total Value
                    </th>
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                      Tax
                    </th>
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[100px]">
                      Grand Total
                    </th>
                    <th className="text-center p-3 font-semibold text-slate-700 text-[10px] uppercase tracking-wider min-w-[80px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    [...Array(5)].map((_, index) => <SkeletonRow key={index} />)
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-8 text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-3 bg-slate-100 rounded-full mb-3">
                            <FiFileText className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-slate-600 text-sm font-medium mb-1">
                            No sales records found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((sale, index) => {
                      const actualIndex =
                        (currentPage - 1) * itemsPerPage + index;
                      const firstServiceName = sale.items?.[0]?.service?.name;

                      return (
                        <motion.tr
                          key={sale.invoice_id || sale.sale_id || index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15 }}
                          className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/70"} hover:bg-indigo-50/40 transition-colors duration-150`}
                        >
                          <td className="text-center p-3 align-middle">
                            <div className="text-slate-700 font-medium text-xs">
                              {actualIndex + 1}
                            </div>
                          </td>
                          <td className="text-center p-3 align-middle">
                            <div className="font-medium text-slate-700 text-xs">
                              {formatDate(sale.transaction_date)}
                            </div>
                          </td>
                          <td className="text-center p-3 align-middle">
                            <div className="mx-auto max-w-[200px]">
                              <div className="text-slate-800 font-semibold text-xs">
                                {getSalePartyName(sale) || "N/A"}
                              </div>
                              <div className="flex flex-col items-center gap-1 mt-1">
                                {sale.is_task ? (
                                  <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Task
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Direct
                                  </span>
                                )}
                              </div>
                              {firstServiceName && (
                                <div className="text-slate-500 text-[10px] mt-1 truncate max-w-[200px] mx-auto">
                                  {firstServiceName}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-center p-3 align-middle">
                            <span className="inline-flex items-center justify-center bg-slate-100 text-slate-800 font-bold px-3 py-1.5 rounded text-xs border border-slate-200">
                              {sale.invoice_no}
                            </span>
                          </td>
                          <td className="text-center p-3 align-middle">
                            <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px]">
                              ₹
                              {formatCurrency(
                                sale.calculation?.total || sale.amount || 0,
                              )}
                            </span>
                          </td>
                          <td className="text-center p-3 align-middle">
                            <span className="inline-flex items-center justify-center bg-amber-50 text-amber-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px]">
                              ₹
                              {formatCurrency(sale.calculation?.gst_value || 0)}
                            </span>
                          </td>
                          <td className="text-center p-3 align-middle">
                            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-800 font-bold px-3 py-1.5 rounded text-xs min-w-[90px]">
                              ₹
                              {formatCurrency(
                                sale.calculation?.grand_total ||
                                  sale.amount ||
                                  0,
                              )}
                            </span>
                          </td>
                          <td className="text-center p-3 align-middle">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                aria-label="Actions"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors duration-150 border border-slate-200 hover:border-indigo-300"
                                onClick={(e) =>
                                  handleActionClick(e, sale.invoice_id)
                                }
                              >
                                <FiMoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {!loading &&
                (currentItems.length > 0 || totalRecords > 0) &&
                totalPages > 0 && (
                  <TablePagination
                    page={currentPage}
                    limit={itemsPerPage}
                    total={totalRecords}
                    totalPages={totalPages}
                    isLastPage={isLastPage}
                    rowOptions={[5, 10, 20, 50, 100]}
                    defaultRows={20}
                    onPageChange={handlePageChange}
                    onLimitChange={setItemsPerPage}
                  />
                )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      {showActionMenu &&
        activeSale &&
        actionMenuPosition &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[99999] overflow-hidden"
            style={{
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
              height: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute w-2.5 h-2.5 bg-white border-slate-200 rotate-45"
              style={{
                left:
                  actionMenuPosition.placement === "left" ||
                  actionMenuPosition.placement === "right"
                    ? undefined
                    : `${actionMenuPosition.arrowX - 5}px`,
                top:
                  actionMenuPosition.placement === "bottom"
                    ? "-5px"
                    : actionMenuPosition.placement === "top"
                      ? undefined
                      : `${actionMenuPosition.arrowY - 5}px`,
                bottom:
                  actionMenuPosition.placement === "top" ? "-5px" : undefined,
                right:
                  actionMenuPosition.placement === "left" ? "-5px" : undefined,
                borderTopWidth:
                  actionMenuPosition.placement === "bottom" ? "1px" : "0",
                borderLeftWidth:
                  actionMenuPosition.placement === "bottom" ? "1px" : "0",
                borderBottomWidth:
                  actionMenuPosition.placement === "top" ? "1px" : "0",
                borderRightWidth:
                  actionMenuPosition.placement === "left"
                    ? "1px"
                    : actionMenuPosition.placement === "right"
                      ? "1px"
                      : "0",
              }}
            />
            <button
              type="button"
              onClick={() => handleViewSale(activeSale)}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
            >
              <FiEye className="w-4 h-4 text-indigo-600" />
              Details
            </button>
            <button
              type="button"
              className={`w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-2 transition-colors ${
                !check("finance_entry_edit")
                  ? "cursor-not-allowed opacity-60 hover:bg-transparent"
                  : ""
              }`}
              onClick={() => handleSaleEditAction(activeSale)}
            >
              {!check("finance_entry_edit") ? (
                <FiLock className="w-4 h-4 text-slate-400" />
              ) : (
                <FiEdit2 className="w-4 h-4 text-blue-600" />
              )}
              {isTaskOriginSale(activeSale) ? "Edit (Task)" : "Edit"}
            </button>
            <button
              type="button"
              disabled={downloadingInvoice}
              onClick={() => handleDownloadInvoice(activeSale)}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-green-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingInvoice ? (
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiDownload className="w-4 h-4 text-green-600" />
              )}
              {downloadingInvoice ? "Downloading…" : "Download"}
            </button>
            <button
              type="button"
              onClick={() => handleOpenShareSale(activeSale)}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 flex items-center gap-2 transition-colors"
            >
              <FiShare2 className="w-4 h-4 text-teal-600" />
              Share
            </button>
          </motion.div>,
          document.body,
        )}

      <DocumentShareModal
        isOpen={showDocumentShareModal}
        onClose={() => {
          setShowDocumentShareModal(false);
          setShareSale(null);
        }}
        title="Share Invoice"
        subtitle={
          shareSale
            ? `Invoice ${shareSale.invoice_no || shareSale.invoice_id}`
            : undefined
        }
        recipientLabel={
          shareSale?.sale_party?.name
            ? `To ${shareSale.sale_party.name}`
            : undefined
        }
        defaultMobile={shareSale?.sale_party?.mobile || ""}
        defaultEmail={shareSale?.sale_party?.email || ""}
        defaultCountryCode={shareSale?.sale_party?.country_code || "91"}
        onSend={handleShareSaleSend}
      />

      <SaleForm
        isOpen={saleFormModal}
        onClose={() => setSaleFormModal(false)}
        onSuccess={handleSaleSuccess}
        mode="modal"
      />
      <EmailSelectionModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSubmit={handleEmailSubmit}
      />
      <MobileSelectionModal
        isOpen={isWhatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        onSubmit={handleWhatsappSubmit}
      />

      <ViewTransactionModalManager
        modalType="SALE"
        isOpen={viewModalOpen}
        record={selectedSale}
        onClose={closeViewModal}
        formatCurrency={formatCurrency}
        canEdit={check("finance_entry_edit")}
        onEdit={handleSaleEditAction}
        onDownload={handleDownloadInvoice}
        onShare={handleOpenShareSale}
        isDownloading={downloadingInvoice}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          setExportData([]);
          setExportColumns([]);
        }}
        exportData={exportData}
        columns={exportColumns}
        jobType="sales_report"
      />

      <EditTransactionModalManager
        modalType="SALE"
        isOpen={editModalOpen}
        onClose={closeEditModal}
        editRecord={editRecord}
        onSubmit={handleEditSubmit}
        formatCurrency={formatCurrency}
      />

      {/* Export Confirmation Modal (for other exports) */}
      <AnimatePresence>
        {exportModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PiExportBold className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Exporting {exportModal.type.toUpperCase()}
                </h3>
                <p className="text-slate-600 mb-6 text-sm">
                  Your {exportModal.type} export is being processed...
                </p>
                <div className="flex justify-center space-x-2 mb-6">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500">
                  This will only take a moment...
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewSales;
