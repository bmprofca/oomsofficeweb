import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Button, Card, Col, Form, Row, Spinner, Table, Badge, Modal, Tab, Tabs, InputGroup, Dropdown } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FaUsers, FaFileExcel,FaLayerGroup, FaTasks, FaPlus, FaTrash, FaFileImport,
  FaSearch, FaEnvelope, FaPaperPlane, FaCheckDouble, FaEye,
  FaClock, FaUserCheck, FaFilter, FaChevronDown, FaTimes,
  FaCheck, FaCircle, FaSpinner, FaHourglassHalf, FaUserClock,
  FaBuilding, FaMoneyBillWave, FaCalendarAlt, FaGlobe,
  FaServer, FaCode, FaBolt, FaClipboardList, FaArrowLeft,
  FaExclamationCircle, FaInfoCircle, FaCheckCircle, FaShieldAlt,
  FaSlidersH
} from 'react-icons/fa';
import { FiHome, FiChevronRight, FiSend } from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import { emailApi, normalizeList } from './emailApi';
import axios from 'axios';
import API_BASE from '../../../utils/api-controller';
import getHeaders from '../../../utils/get-headers';
import BulkEmailImportModal from './BulkEmailImportModal';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const newRecipient = () => ({ recipient_name: '', recipient_email: '', variable_values_json: '{}' });

// ─── Inline Styles ───────────────────────────────────────────────────────────
const styles = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  .ebc-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #f0f2f7;
    min-height: 100vh;
  }

  .ebc-page-title {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.4px;
    color: #111827;
  }
  .ebc-page-subtitle {
    font-size: 0.8rem;
    color: #6b7280;
    margin-top: 2px;
  }

  /* Section cards */
  .ebc-section {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    margin-bottom: 20px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .ebc-section-header {
    padding: 18px 24px 16px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .ebc-section-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: #111827;
    letter-spacing: 0.2px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ebc-section-title .ebc-icon-box {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 0.7rem;
    flex-shrink: 0;
  }
  .ebc-section-body {
    padding: 20px 24px 24px;
  }

  /* Form fields */
  .ebc-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ebc-label .req { color: #ef4444; }
  .ebc-hint {
    font-size: 0.72rem;
    color: #9ca3af;
    margin-top: 4px;
  }

  .ebc-control {
    border: 1.5px solid #e5e7eb !important;
    border-radius: 10px !important;
    padding: 9px 13px !important;
    font-size: 0.845rem !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    color: #111827 !important;
    background: #fafafa !important;
    transition: border-color 0.15s, box-shadow 0.15s !important;
    box-shadow: none !important;
  }
  .ebc-control:focus {
    border-color: #3b82f6 !important;
    background: #fff !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
    outline: none !important;
  }
  .ebc-control.is-invalid {
    border-color: #ef4444 !important;
    background: #fff8f8 !important;
  }
  .ebc-control.mono {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.775rem !important;
  }
  .ebc-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important; background-repeat: no-repeat !important; background-position: right 12px center !important; padding-right: 36px !important; }

  /* Input group */
  .ebc-input-group {
    display: flex;
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
    background: #fafafa;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ebc-input-group:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
    background: #fff;
  }
  .ebc-input-group .ebc-ig-prefix {
    padding: 0 12px;
    display: flex;
    align-items: center;
    color: #9ca3af;
    font-size: 0.8rem;
    border-right: 1px solid #e5e7eb;
    background: transparent;
  }
  .ebc-input-group input, .ebc-input-group select {
    flex: 1;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 9px 13px !important;
    font-size: 0.845rem !important;
    color: #111827 !important;
    outline: none !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ebc-input-group .ebc-ig-btn {
    border: none;
    border-left: 1px solid #e5e7eb;
    background: #f9fafb;
    padding: 0 16px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ebc-input-group .ebc-ig-btn:hover { background: #f3f4f6; }
  .ebc-input-group .ebc-ig-btn.primary { background: #3b82f6; color: #fff; }
  .ebc-input-group .ebc-ig-btn.primary:hover { background: #2563eb; }

  /* Tabs */
  .ebc-tabs .nav-tabs {
    border-bottom: 2px solid #f3f4f6 !important;
    gap: 4px;
  }
  .ebc-tabs .nav-link {
    border: none !important;
    border-radius: 8px 8px 0 0 !important;
    padding: 9px 18px !important;
    font-size: 0.82rem !important;
    font-weight: 600 !important;
    color: #6b7280 !important;
    background: transparent !important;
    transition: color 0.15s, background 0.15s !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
  }
  .ebc-tabs .nav-link:hover { color: #374151 !important; background: #f9fafb !important; }
  .ebc-tabs .nav-link.active {
    color: #2563eb !important;
    background: #eff6ff !important;
    border-bottom: 2px solid #2563eb !important;
    margin-bottom: -2px !important;
  }

  /* Table */
  .ebc-table { border-collapse: separate; border-spacing: 0; width: 100%; }
  .ebc-table thead tr th {
    background: #f8fafc;
    font-size: 0.73rem;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 10px 14px;
    border-bottom: 1px solid #e5e7eb;
  }
  .ebc-table tbody tr td {
    padding: 9px 12px;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.82rem;
    vertical-align: middle;
  }
  .ebc-table tbody tr:last-child td { border-bottom: none; }
  .ebc-table tbody tr:hover td { background: #fafafa; }
  .ebc-table tbody tr.row-invalid td { background: #fff8f8; }
  .ebc-table-wrap { border: 1.5px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
  .ebc-table-wrap .ebc-table thead tr th:first-child { border-radius: 10px 0 0 0; }
  .ebc-table-wrap .ebc-table thead tr th:last-child { border-radius: 0 10px 0 0; }

  /* Inline table cell inputs */
  .ebc-cell-input {
    border: 1.5px solid #e5e7eb !important;
    border-radius: 7px !important;
    padding: 6px 10px !important;
    font-size: 0.8rem !important;
    width: 100%;
    background: #fff !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    transition: border-color 0.15s, box-shadow 0.15s !important;
    box-shadow: none !important;
    outline: none !important;
    color: #111827 !important;
  }
  .ebc-cell-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.08) !important; }
  .ebc-cell-input.invalid { border-color: #ef4444 !important; background: #fff8f8 !important; }
  .ebc-cell-input.mono { font-family: 'JetBrains Mono', monospace !important; font-size: 0.72rem !important; }

  /* Buttons */
  .ebc-btn {
    border-radius: 9px;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 8px 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.15s;
    border: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    white-space: nowrap;
  }
  .ebc-btn-primary { background: #2563eb; color: #fff; }
  .ebc-btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
  .ebc-btn-success { background: #059669; color: #fff; }
  .ebc-btn-success:hover { background: #047857; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(5,150,105,0.3); }
  .ebc-btn-outline { background: transparent; color: #374151; border: 1.5px solid #d1d5db; }
  .ebc-btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
  .ebc-btn-ghost { background: transparent; color: #6b7280; border: none; padding: 6px 10px; }
  .ebc-btn-ghost:hover { color: #374151; background: #f3f4f6; border-radius: 7px; }
  .ebc-btn-danger-ghost { background: transparent; color: #dc2626; border: none; padding: 4px 8px; border-radius: 6px; }
  .ebc-btn-danger-ghost:hover { background: #fef2f2; }
  .ebc-btn-sm { padding: 5px 12px; font-size: 0.775rem; }
  .ebc-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
  .ebc-btn-send {
    background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
    color: #fff;
    padding: 11px 28px;
    font-size: 0.88rem;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(5,150,105,0.35);
  }
  .ebc-btn-send:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(5,150,105,0.45); }

  /* Badges */
  .ebc-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ebc-badge-blue { background: #eff6ff; color: #1d4ed8; }
  .ebc-badge-green { background: #ecfdf5; color: #065f46; }
  .ebc-badge-amber { background: #fffbeb; color: #92400e; }
  .ebc-badge-red { background: #fef2f2; color: #991b1b; }
  .ebc-badge-indigo { background: #eef2ff; color: #3730a3; }
  .ebc-badge-gray { background: #f3f4f6; color: #374151; }
  .ebc-badge-teal { background: #f0fdfa; color: #0f766e; }

  /* Status badges */
  .status-complete { background: #ecfdf5; color: #065f46; }
  .status-canceled { background: #fef2f2; color: #991b1b; }
  .status-inprocess { background: #eff6ff; color: #1e40af; }
  .status-pendingclient { background: #fffbeb; color: #92400e; }
  .status-pendingdept { background: #f0f9ff; color: #0369a1; }

  /* Client cards / group cards */
  .ebc-group-card {
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.15s;
    background: #fafafa;
    height: 100%;
  }
  .ebc-group-card:hover { border-color: #93c5fd; background: #f0f7ff; }
  .ebc-group-card.selected { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
  .ebc-group-card-name { font-size: 0.845rem; font-weight: 700; color: #111827; margin-bottom: 4px; }

  /* Pills (selected tags) */
  .ebc-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.76rem;
    font-weight: 600;
    background: #eff6ff;
    color: #1d4ed8;
    cursor: pointer;
    transition: background 0.12s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ebc-pill:hover { background: #dbeafe; }
  .ebc-pill-green { background: #ecfdf5; color: #065f46; }
  .ebc-pill-green:hover { background: #d1fae5; }

  /* Filter box */
  .ebc-filter-box {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 20px 22px;
    margin-bottom: 20px;
  }
  .ebc-filter-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 14px;
  }

  /* Status filter dropdown */
  .ebc-status-dropdown .dropdown-menu {
    border: 1.5px solid #e5e7eb !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
    padding: 8px !important;
    min-width: 240px !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ebc-status-dropdown .dropdown-item {
    border-radius: 8px !important;
    font-size: 0.82rem !important;
    padding: 8px 12px !important;
    font-weight: 500 !important;
    color: #374151 !important;
    transition: background 0.1s !important;
  }
  .ebc-status-dropdown .dropdown-item:hover { background: #f3f4f6 !important; }
  .ebc-status-dropdown .dropdown-toggle {
    border: 1.5px solid #e5e7eb !important;
    border-radius: 9px !important;
    padding: 7px 14px !important;
    font-size: 0.82rem !important;
    font-weight: 600 !important;
    color: #374151 !important;
    background: #fff !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    box-shadow: none !important;
  }
  .ebc-status-dropdown .dropdown-toggle:hover { border-color: #93c5fd !important; }
  .ebc-status-dropdown .dropdown-toggle::after { display: none !important; }

  /* Info/Alert banners */
  .ebc-alert {
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 0.815rem;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
  }
  .ebc-alert-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
  .ebc-alert-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .ebc-alert-secondary { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
  .ebc-alert-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }

  /* Recipient count box */
  .ebc-task-count-box {
    background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
    border: 1.5px solid #bfdbfe;
    border-radius: 12px;
    padding: 14px 18px;
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* Selected summary bar */
  .ebc-selected-bar {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 14px 16px;
    margin-top: 16px;
  }
  .ebc-selected-bar-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Header strip */
  .ebc-header-card {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #2563eb 100%);
    border-radius: 16px;
    padding: 20px 24px;
    color: #fff;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .ebc-header-main-title {
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.3px;
    margin-bottom: 3px;
  }
  .ebc-header-sub { font-size: 0.8rem; color: rgba(255,255,255,0.72); }

  /* Action footer */
  .ebc-footer {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 16px 24px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
  }

  /* Scrollable table container */
  .ebc-scroll-table { max-height: 380px; overflow-y: auto; border: 1.5px solid #e5e7eb; border-radius: 12px; }
  .ebc-scroll-table table thead th { position: sticky; top: 0; z-index: 1; }

  /* Modal styling */
  .ebc-modal .modal-content { border-radius: 16px; border: none; box-shadow: 0 20px 60px rgba(0,0,0,0.15); font-family: 'Plus Jakarta Sans', sans-serif; }
  .ebc-modal .modal-header { background: #f8fafc; border-bottom: 1px solid #e5e7eb; border-radius: 16px 16px 0 0; padding: 16px 20px; }
  .ebc-modal .modal-title { font-size: 0.95rem; font-weight: 700; }
  .ebc-modal .modal-footer { border-top: 1px solid #e5e7eb; padding: 14px 20px; }

  /* Stat mini-card */
  .ebc-stat-mini { background: #f8fafc; border-radius: 10px; padding: 12px 14px; text-align: center; }
  .ebc-stat-mini .val { font-size: 1.4rem; font-weight: 800; color: #111827; }
  .ebc-stat-mini .lbl { font-size: 0.7rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }

  /* Divider */
  .ebc-divider { border: none; border-top: 1px solid #f3f4f6; margin: 16px 0; }

  /* Preview iframe area */
  .ebc-preview-body { background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 16px; }
  .ebc-preview-subject { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 9px; padding: 10px 14px; font-size: 0.845rem; margin-bottom: 14px; }
  .ebc-preview-subject strong { font-size: 0.73rem; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; display: block; margin-bottom: 3px; }

  /* Bulk textarea */
  .ebc-bulk-area {
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    padding: 11px 14px;
    font-size: 0.8rem;
    font-family: 'JetBrains Mono', monospace;
    width: 100%;
    resize: vertical;
    min-height: 90px;
    background: #fafafa;
    color: #111827;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }
  .ebc-bulk-area:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); background: #fff; }

  /* Check */
  .ebc-check { width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb; }

  /* Error text */
  .ebc-error { font-size: 0.72rem; color: #dc2626; margin-top: 4px; display: flex; align-items: center; gap: 4px; }

  .ebc-tooltip-hint { font-size: 0.72rem; color: #9ca3af; margin-top: 3px; }
`;

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    'Complete': { cls: 'status-complete', icon: <FaCheck size={10} /> },
    'Canceled': { cls: 'status-canceled', icon: <FaTimes size={10} /> },
    'In Process': { cls: 'status-inprocess', icon: <FaSpinner size={10} /> },
    'Pending from Client': { cls: 'status-pendingclient', icon: <FaUserClock size={10} /> },
    'Pending from Department': { cls: 'status-pendingdept', icon: <FaBuilding size={10} /> },
  };
  const cfg = map[status] || { cls: 'ebc-badge-gray', icon: <FaCircle size={10} /> };
  return (
    <span className={`ebc-badge ${cfg.cls}`}>
      {cfg.icon} {status}
    </span>
  );
};

// ─── StatusFilterDropdown ────────────────────────────────────────────────────
const StatusFilterDropdown = ({ selectedStatuses, onStatusChange, availableStatuses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const displayNames = {
    'complete': 'Complete', 'cancel': 'Canceled', 'in process': 'In Process',
    'pending from client': 'Pending from Client', 'pending from department': 'Pending from Department'
  };
  const icons = {
    'complete': <FaCheck className="text-success" />, 'cancel': <FaTimes className="text-danger" />,
    'in process': <FaSpinner className="text-primary" />, 'pending from client': <FaUserClock className="text-warning" />,
    'pending from department': <FaBuilding className="text-info" />
  };
  const toggle = (s) => onStatusChange(selectedStatuses.includes(s) ? selectedStatuses.filter(x => x !== s) : [...selectedStatuses, s]);

  return (
    <Dropdown show={isOpen} onToggle={setIsOpen} className="ebc-status-dropdown">
      <Dropdown.Toggle>
        <FaSlidersH size={12} className="text-primary" />
        {selectedStatuses.length > 0 ? `Status (${selectedStatuses.length})` : 'Filter Status'}
        <FaChevronDown size={10} />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <div className="d-flex justify-content-between align-items-center px-2 mb-1">
          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task Status</span>
          <div className="d-flex gap-2">
            <button className="ebc-btn ebc-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, color: '#2563eb' }} onClick={() => onStatusChange([...availableStatuses])}>All</button>
            <button className="ebc-btn ebc-btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, color: '#dc2626' }} onClick={() => onStatusChange([])}>Clear</button>
          </div>
        </div>
        <Dropdown.Divider />
        {availableStatuses.map(s => (
          <Dropdown.Item key={s} onClick={() => toggle(s)} className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">{icons[s] || <FaCircle />}<span>{displayNames[s] || s}</span></div>
            {selectedStatuses.includes(s) && <FaCheck className="text-success" size={12} />}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

// ─── SectionCard ─────────────────────────────────────────────────────────────
const SectionCard = ({ icon, title, badge, children }) => (
  <div className="ebc-section">
    <div className="ebc-section-header">
      <div className="ebc-section-title">
        <span className="ebc-icon-box">{icon}</span>
        {title}
      </div>
      {badge}
    </div>
    <div className="ebc-section-body">{children}</div>
  </div>
);

// ─── FieldGroup ──────────────────────────────────────────────────────────────
const FieldGroup = ({ label, required, hint, error, children }) => (
  <div>
    <div className="ebc-label">{label}{required && <span className="req">*</span>}</div>
    {children}
    {hint && !error && <div className="ebc-tooltip-hint">{hint}</div>}
    {error && <div className="ebc-error"><FaExclamationCircle size={10} />{error}</div>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EmailBroadcastCreate = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  const [configs, setConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [services, setServices] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);

  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectAllClients, setSelectAllClients] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [loadingAllClients, setLoadingAllClients] = useState(false);

  const [groupSearch, setGroupSearch] = useState('');
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const [serviceSearch, setServiceSearch] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [tasksSummary, setTasksSummary] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskFilters, setTaskFilters] = useState({ service_id: '', statuses: [], billing_status: 'all' });
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedTaskCount, setSelectedTaskCount] = useState(0);
  const [taskSearch, setTaskSearch] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);

  const [form, setForm] = useState({
    config_id: '', fallback_config_id: '', template_id: '', broadcast_name: '',
    schedule_type: 'now', scheduled_at: '', timezone: 'Asia/Kolkata',
    daily_limit: 1000, global_variables_json: '{}',
  });

  const [templateVariables, setTemplateVariables] = useState([]);
  const [templateVariableKeys, setTemplateVariableKeys] = useState([]);
  const [showVariableSelector, setShowVariableSelector] = useState(false);
  const [showGlobalVarHelp, setShowGlobalVarHelp] = useState(false);
  const [loadingTemplateVars, setLoadingTemplateVars] = useState(false);

  const [recipients, setRecipients] = useState([newRecipient()]);
  const [bulkInput, setBulkInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => { localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized)); }, [isMinimized]);
  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    console.log("🔵 loadInitialData STARTED");
    try {
      const headers = getHeaders();
      const [c, t, g, s, ts] = await Promise.all([
        emailApi.listConfigs({ page_no: 1, limit: 100 }),
        emailApi.listTemplates({ page_no: 1, limit: 100 }),
        axios.get(`${API_BASE}/group/groups/all?limit=100`, { headers }),
        axios.get(`${API_BASE}/service/list?page_no=1&limit=100`, { headers }),
        axios.get(`${API_BASE}/task/task-statuses`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      console.log("✅ Initial data loaded");
      setConfigs(normalizeList(c?.data).filter(x => x.status === 'active'));
      setTemplates(normalizeList(t?.data).filter(x => x.status === 'active'));
      setGroups(g?.data?.data?.groups || []);
      setFilteredGroups(g?.data?.data?.groups || []);
      setServices(s?.data?.data || []);
      setFilteredServices(s?.data?.data || []);
      setAvailableServices(s?.data?.data || []);
      const statuses = ts?.data?.data?.statuses || ['complete', 'cancel', 'in process', 'pending from client', 'pending from department'];
      setTaskStatuses(statuses);
    } catch (e) {
      console.error("❌ Failed to load initial data:", e);
      toast.error('Failed to load initial data');
    }
  };

  // FIXED: Load template variables with proper extraction
  const loadTemplateVariables = useCallback(async (templateId) => {
    console.log("🔵 loadTemplateVariables called with ID:", templateId);

    if (!templateId) {
      console.log("No template ID, clearing variables");
      setTemplateVariables([]);
      setTemplateVariableKeys([]);
      return;
    }

    setLoadingTemplateVars(true);
    try {
      console.log("Fetching template details...");
      const templateDetails = await emailApi.templateDetails(templateId);
      console.log("Template details response:", templateDetails);

      const subject = templateDetails?.data?.subject || '';
      const htmlBody = templateDetails?.data?.html_body || '';

      console.log("Template subject:", subject);
      console.log("Template HTML body length:", htmlBody.length);

      // Extract variables from template content
      const regex = /{{([a-zA-Z0-9_]+)}}/g;
      const extractedVars = new Set();

      let match;
      while ((match = regex.exec(subject)) !== null) {
        console.log(`Found variable in subject: ${match[1]}`);
        extractedVars.add(match[1]);
      }
      while ((match = regex.exec(htmlBody)) !== null) {
        console.log(`Found variable in body: ${match[1]}`);
        extractedVars.add(match[1]);
      }

      const uniqueVars = Array.from(extractedVars);
      console.log("Unique extracted variables:", uniqueVars);
      setTemplateVariables(uniqueVars);
      setTemplateVariableKeys(uniqueVars);

      // Also get type-based variables from API
      const selectedTemplate = templates.find(t => t.template_id === templateId);
      console.log("Selected template:", selectedTemplate);

      if (selectedTemplate && selectedTemplate.template_type) {
        console.log(`Fetching variables for template type: ${selectedTemplate.template_type}`);
        const res = await emailApi.getVariableKeys(selectedTemplate.template_type);
        console.log("Type-based variables response:", res);

        const typeVars = res?.data?.keys || [];
        console.log("Type-based variables:", typeVars);

        const allVars = [...new Set([...uniqueVars, ...typeVars])];
        console.log("Combined all variables:", allVars);
        setTemplateVariables(allVars);
        setTemplateVariableKeys(allVars);
      }
    } catch (error) {
      console.error('❌ Failed to load template variables:', error);
      setTemplateVariables([]);
      setTemplateVariableKeys([]);
    } finally {
      setLoadingTemplateVars(false);
    }
  }, [templates]);

  // FIXED: Auto-populate global variables - DON'T set placeholder values for recipient-specific fields
  const autoPopulateGlobalVariables = useCallback(async (templateId) => {
    console.log("🔵 autoPopulateGlobalVariables called with ID:", templateId);

    if (!templateId) return;

    try {
      const templateDetails = await emailApi.templateDetails(templateId);
      const subject = templateDetails?.subject || '';
      const htmlBody = templateDetails?.html_body || '';

      const regex = /{{([a-zA-Z0-9_]+)}}/g;
      const extractedVars = new Set();

      let match;
      while ((match = regex.exec(subject)) !== null) {
        extractedVars.add(match[1]);
      }
      while ((match = regex.exec(htmlBody)) !== null) {
        extractedVars.add(match[1]);
      }

      const templateVariablesList = Array.from(extractedVars);
      console.log("Template variables found:", templateVariablesList);

      if (templateVariablesList.length > 0) {
        let globalVars = {};

        templateVariablesList.forEach(varName => {
          // ONLY set placeholder for GLOBAL variables (not recipient-specific)
          // These are typically company-level info that doesn't change per recipient
          const globalOnlyVariables = ['company', 'support_email', 'support_phone', 'website', 'year'];

          if (globalOnlyVariables.includes(varName)) {
            globalVars[varName] = `Your ${varName} here`;
          } else {
            // For recipient-specific variables, leave as EMPTY STRING
            // They will be filled by the API response from getDynamicVariables
            globalVars[varName] = '';
          }
        });

        setForm(prev => ({
          ...prev,
          global_variables_json: JSON.stringify(globalVars, null, 2)
        }));

        console.log('Auto-populated global variables (empty for recipient fields):', globalVars);
      }
    } catch (error) {
      console.error('Failed to auto-populate global variables:', error);
    }
  }, []);
  // Handle template selection change - FIXED
  const handleTemplateChange = async (templateId) => {
    console.log("🔵 handleTemplateChange called with ID:", templateId);
    setForm({ ...form, template_id: templateId });
    await loadTemplateVariables(templateId);
    await autoPopulateGlobalVariables(templateId);
  };

  const loadAllClients = async () => {
    setLoadingAllClients(true);
    try {
      const headers = getHeaders();
      let allClientData = [], page = 1, hasMore = true;
      while (hasMore) {
        const res = await axios.get(`${API_BASE}/client/list?page=${page}&limit=100`, { headers });
        const d = res?.data?.data || [];
        allClientData = [...allClientData, ...d];
        hasMore = !res?.data?.pagination?.is_last_page;
        page++;
      }
      const cwm = allClientData.filter(c => c.email && emailRegex.test(c.email));
      setAllClients(cwm);
      if (selectAllClients) setSelectedClients(cwm);
      toast.success(`Loaded ${cwm.length} clients with email`);
    } catch (e) { toast.error('Failed to load all clients'); }
    finally { setLoadingAllClients(false); }
  };

  const handleSelectAllClients = async () => {
    if (selectAllClients) { setSelectAllClients(false); setSelectedClients([]); }
    else { setSelectAllClients(true); if (allClients.length === 0) await loadAllClients(); else setSelectedClients(allClients); }
  };

  // Handle imported recipients from Excel/CSV
const handleImportRecipients = useCallback((importedRecipients) => {
  console.log("Importing recipients:", importedRecipients);
  
  // Convert imported recipients to the format expected by manual tab
  const formattedRecipients = importedRecipients.map(r => ({
    recipient_name: r.recipient_name || r.name || '',
    recipient_email: r.recipient_email || r.email,
    variable_values_json: JSON.stringify(r.variable_values_json || r.variables || {}, null, 2)
  }));
  
  // Add to existing recipients
  setRecipients(prev => [...prev, ...formattedRecipients]);
  
  // Switch to manual tab to show imported recipients
  setActiveTab('manual');
  
  toast.success(`${formattedRecipients.length} recipients imported successfully`);
}, []);

  const searchClients = useCallback(async () => {
    if (!clientSearch.trim()) { setClients([]); return; }
    setLoadingClients(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE}/client/search?search=${encodeURIComponent(clientSearch)}`, { headers });
      setClients((res?.data?.data || []).filter(c => c.email && emailRegex.test(c.email)));
    } catch (e) { toast.error('Failed to search clients'); setClients([]); }
    finally { setLoadingClients(false); }
  }, [clientSearch]);

  useEffect(() => {
    const d = setTimeout(() => { if (clientSearch) searchClients(); else setClients([]); }, 500);
    return () => clearTimeout(d);
  }, [clientSearch, searchClients]);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE}/group/groups/all?search=${encodeURIComponent(groupSearch)}&limit=100`, { headers });
      setGroups(res?.data?.data?.groups || []);
      setFilteredGroups(res?.data?.data?.groups || []);
    } catch (e) { toast.error('Failed to load groups'); }
    finally { setLoadingGroups(false); }
  }, [groupSearch]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    setFilteredGroups(groupSearch ? groups.filter(g => g.group_name?.toLowerCase().includes(groupSearch.toLowerCase())) : groups);
  }, [groupSearch, groups]);

  const handleViewGroup = async (groupId) => {
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE}/group/groups/all?group_id=${groupId}`, { headers });
      setViewingGroup(res?.data?.data); setShowGroupModal(true);
    } catch (e) { toast.error('Failed to load group details'); }
  };

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const headers = getHeaders();
      const res = await axios.get(`${API_BASE}/service/list?search=${encodeURIComponent(serviceSearch)}&page_no=1&limit=100`, { headers });
      setServices(res?.data?.data || []); setFilteredServices(res?.data?.data || []);
    } catch (e) { toast.error('Failed to load services'); }
    finally { setLoadingServices(false); }
  }, [serviceSearch]);

  useEffect(() => { loadServices(); }, [loadServices]);

  useEffect(() => {
    setFilteredServices(serviceSearch ? services.filter(s => s.name?.toLowerCase().includes(serviceSearch.toLowerCase())) : services);
  }, [serviceSearch, services]);

  const loadTasksSummary = useCallback(async () => {
    if (!taskFilters.service_id) { setTasksSummary(null); setSelectedTaskCount(0); return; }
    setLoadingTasks(true);
    try {
      const headers = getHeaders();
      let url = `${API_BASE}/task/tasks/filter?service_id=${taskFilters.service_id}`;
      if (taskFilters.statuses?.length > 0) url += `&status=${taskFilters.statuses.join(',')}`;
      if (taskFilters.billing_status && taskFilters.billing_status !== 'all') url += `&billing_status=${taskFilters.billing_status}`;
      if (taskSearch?.trim()) url += `&search=${encodeURIComponent(taskSearch.trim())}`;
      const res = await axios.get(url, { headers });
      const summaryData = res?.data?.data?.summary_by_status || {};
      setTasksSummary(summaryData);
      setSelectedTaskCount(Object.values(summaryData).reduce((s, g) => s + (g.count || 0), 0));
    } catch (e) { toast.error('Failed to load tasks summary'); setTasksSummary(null); setSelectedTaskCount(0); }
    finally { setLoadingTasks(false); }
  }, [taskFilters, taskSearch]);

  useEffect(() => {
    const t = setTimeout(() => loadTasksSummary(), 500);
    return () => clearTimeout(t);
  }, [loadTasksSummary]);

  const getValidRecipients = useCallback(() => recipients.filter(r => r.recipient_email && emailRegex.test(r.recipient_email)), [recipients]);

  // FIXED: Build recipients from clients (already working, just ensure proper format)
  const buildRecipientsFromClients = useCallback(async () => {
    console.log("🔵 Building recipients from clients");
    console.log("Selected clients:", selectedClients);

    const recipientsList = [];

    for (const client of selectedClients) {
      try {
        console.log(`Fetching dynamic variables for client: ${client.username}`);
        const res = await emailApi.getDynamicVariables('client', client.username);
        console.log("API Response for client:", res);

        const dynamicVars = res?.variables || {};
        console.log("Dynamic variables received:", dynamicVars);

        // Merge client data with API response
        const mergedVars = {
          // Basic client info
          name: client.name || client.username,
          username: client.username,
          email: client.email,
          mobile: client.mobile || '',
          city: client.city || '',
          state: client.state || '',
          // Firm info
          firm_name: client.firms?.[0]?.firm_name || '',
          firm_type: client.firms?.[0]?.firm_type || '',
          gst_no: client.firms?.[0]?.gst_no || '',
          pan_no: client.firms?.[0]?.pan_no || '',
          // Date
          date: new Date().toISOString().split('T')[0],
          // API dynamic variables (overrides)
          ...dynamicVars
        };

        recipientsList.push({
          recipient_name: client.name || client.username,
          recipient_email: client.email,
          variable_values_json: mergedVars  // Pass as object
        });
      } catch (error) {
        console.error(`Failed to fetch variables for client ${client.username}:`, error);
        // Fallback with basic client data
        recipientsList.push({
          recipient_name: client.name || client.username,
          recipient_email: client.email,
          variable_values_json: {
            name: client.name || client.username,
            username: client.username,
            email: client.email,
            mobile: client.mobile || '',
            city: client.city || '',
            state: client.state || '',
            firm_name: client.firms?.[0]?.firm_name || '',
            firm_type: client.firms?.[0]?.firm_type || '',
            gst_no: client.firms?.[0]?.gst_no || '',
            pan_no: client.firms?.[0]?.pan_no || '',
            date: new Date().toISOString().split('T')[0]
          }
        });
      }
    }

    console.log(`Total recipients from clients: ${recipientsList.length}`);
    return recipientsList;
  }, [selectedClients]);

  // FIXED: Build recipients from groups
  const buildRecipientsFromGroups = useCallback(async () => {
    console.log("🔵 Building recipients from groups");
    console.log("Selected groups:", selectedGroups);

    const recipientsList = [];

    for (const group of selectedGroups) {
      console.log(`Processing group: ${group.group_name} (ID: ${group.group_id})`);

      // Get all firms in this group with their clients
      const firms = group.firms || [];
      console.log(`Group has ${firms.length} firms`);

      for (const firm of firms) {
        const client = firm.client;

        if (client?.email && emailRegex.test(client.email)) {
          console.log(`Processing client: ${client.username} from firm: ${firm.firm_name}`);

          try {
            // Fetch dynamic variables for this client
            const res = await emailApi.getDynamicVariables('client', client.username);
            console.log(`API Response for client ${client.username}:`, res);

            const dynamicVars = res?.variables || {};

            // Merge firm and client data with API response
            const mergedVars = {
              // Client basic info
              name: client.name || client.username,
              username: client.username,
              email: client.email,
              mobile: client.mobile || '',
              city: client.city || '',
              state: client.state || '',
              // Firm specific info (from group firm)
              firm_name: firm.firm_name || '',
              firm_type: firm.firm_type || '',
              gst_no: firm.gst_no || '',
              pan_no: firm.pan_no || '',
              tan_no: firm.tan_no || '',
              vat_no: firm.vat_no || '',
              cin_no: firm.cin_no || '',
              file_no: firm.file_no || '',
              firm_address: firm.address || '',
              firm_city: firm.city || '',
              firm_state: firm.state || '',
              firm_pincode: firm.pincode || '',
              // Date
              date: new Date().toISOString().split('T')[0],
              // API dynamic variables (overrides everything)
              ...dynamicVars
            };

            recipientsList.push({
              recipient_name: client.name || firm.firm_name,
              recipient_email: client.email,
              variable_values_json: mergedVars
            });

            console.log(`Added recipient: ${client.email} with firm: ${firm.firm_name}`);
          } catch (error) {
            console.error(`Failed to fetch variables for client ${client.username} in group ${group.group_name}:`, error);
            // Fallback with firm and client data
            recipientsList.push({
              recipient_name: client.name || firm.firm_name,
              recipient_email: client.email,
              variable_values_json: {
                name: client.name || client.username,
                username: client.username,
                email: client.email,
                mobile: client.mobile || '',
                city: client.city || '',
                state: client.state || '',
                firm_name: firm.firm_name || '',
                firm_type: firm.firm_type || '',
                gst_no: firm.gst_no || '',
                pan_no: firm.pan_no || '',
                tan_no: firm.tan_no || '',
                vat_no: firm.vat_no || '',
                cin_no: firm.cin_no || '',
                file_no: firm.file_no || '',
                firm_address: firm.address || '',
                firm_city: firm.city || '',
                firm_state: firm.state || '',
                firm_pincode: firm.pincode || '',
                date: new Date().toISOString().split('T')[0]
              }
            });
          }
        } else {
          console.warn(`Skipping client without valid email: ${client?.username}`);
        }
      }
    }

    console.log(`Total recipients from groups: ${recipientsList.length}`);
    return recipientsList;
  }, [selectedGroups]);

  // FIXED: Build recipients from tasks
  const buildRecipientsFromTasks = useCallback(async () => {
    console.log("🔵 Building recipients from tasks");
    console.log("Tasks summary:", tasksSummary);

    const recipientsList = [];

    if (!tasksSummary) {
      console.warn("No tasks summary available");
      return recipientsList;
    }

    for (const [status, statusData] of Object.entries(tasksSummary)) {
      console.log(`Processing status: ${status}`);
      const tasks = statusData.tasks || [];
      console.log(`Found ${tasks.length} tasks with status ${status}`);

      for (const task of tasks) {
        const client = task.client;
        const firm = task.firm;

        if (client?.email && emailRegex.test(client.email)) {
          console.log(`Processing task: ${task.task_id} for client: ${client.username}`);

          try {
            // Fetch dynamic variables for this task
            const res = await emailApi.getDynamicVariables('task', task.task_id);
            console.log(`API Response for task ${task.task_id}:`, res);

            const dynamicVars = res?.variables || {};

            // Merge task, client, and firm data with API response
            const mergedVars = {
              // Client basic info
              name: client.name || client.username,
              username: client.username,
              email: client.email,
              mobile: client.mobile || '',
              city: client.city || '',
              state: client.state || '',
              // Firm info from task
              firm_name: firm?.firm_name || '',
              firm_type: firm?.firm_type || '',
              gst_no: firm?.gst_no || '',
              pan_no: firm?.pan_no || '',
              // Task specific info
              task_id: task.task_id,
              task_status: task.status || status,
              task_billing_status: task.billing_status === 1 ? 'Completed' : task.billing_status === 0 ? 'Pending' : 'Non Billable',
              task_service_name: task.service_name || '',
              task_service_id: task.service_id || '',
              task_assigned_to: task.assigned_to_name || '',
              task_due_date: task.due_date || '',
              task_completed_date: task.completed_date || '',
              // Service info
              service_name: task.service_name || '',
              // Date
              date: new Date().toISOString().split('T')[0],
              // API dynamic variables (overrides everything)
              ...dynamicVars
            };

            recipientsList.push({
              recipient_name: client.name || firm?.firm_name || client.username,
              recipient_email: client.email,
              variable_values_json: mergedVars
            });

            console.log(`Added recipient from task ${task.task_id}: ${client.email}`);
          } catch (error) {
            console.error(`Failed to fetch variables for task ${task.task_id}:`, error);
            // Fallback with task, client, and firm data
            recipientsList.push({
              recipient_name: client.name || firm?.firm_name || client.username,
              recipient_email: client.email,
              variable_values_json: {
                name: client.name || client.username,
                username: client.username,
                email: client.email,
                mobile: client.mobile || '',
                city: client.city || '',
                state: client.state || '',
                firm_name: firm?.firm_name || '',
                firm_type: firm?.firm_type || '',
                gst_no: firm?.gst_no || '',
                pan_no: firm?.pan_no || '',
                task_id: task.task_id,
                task_status: task.status || status,
                task_billing_status: task.billing_status === 1 ? 'Completed' : task.billing_status === 0 ? 'Pending' : 'Non Billable',
                task_service_name: task.service_name || '',
                task_due_date: task.due_date || '',
                date: new Date().toISOString().split('T')[0]
              }
            });
          }
        } else {
          console.warn(`Skipping task ${task.task_id} - client has no valid email:`, client);
        }
      }
    }

    console.log(`Total recipients from tasks: ${recipientsList.length}`);
    return recipientsList;
  }, [tasksSummary]);

  const formErrors = useMemo(() => {
    const err = {};
    if (!form.config_id) err.config_id = 'SMTP config required';
    if (!form.template_id) err.template_id = 'Template required';
    if (!form.broadcast_name) err.broadcast_name = 'Broadcast name required';
    if (form.schedule_type === 'scheduled' && !form.scheduled_at) err.scheduled_at = 'Scheduled time required';
    if (form.daily_limit < 1 || form.daily_limit > 100000) err.daily_limit = 'Must be 1–100000';
    if (activeTab === 'manual') {
      if (getValidRecipients().length === 0) err.recipients = 'At least one valid recipient required';
      recipients.forEach((r, i) => {
        if (!r.recipient_name) err[`recipient_name_${i}`] = true;
        if (r.recipient_email && !emailRegex.test(r.recipient_email)) err[`recipient_email_${i}`] = true;
        try { JSON.parse(r.variable_values_json || '{}'); } catch { err[`recipient_json_${i}`] = true; }
      });
    } else if (activeTab === 'clients' && selectedClients.length === 0) err.recipients = 'Select at least one client';
    else if (activeTab === 'groups' && selectedGroups.length === 0) err.recipients = 'Select at least one group';
    else if (activeTab === 'tasks' && selectedTaskCount === 0) err.recipients = 'No tasks found for selected filters';
    else if (activeTab === 'services' && selectedServices.length === 0) err.recipients = 'Select at least one service';
    try { JSON.parse(form.global_variables_json || '{}'); } catch { err.global_variables_json = 'Invalid JSON'; }
    return err;
  }, [form, recipients, activeTab, selectedClients, selectedGroups, selectedServices, getValidRecipients, selectedTaskCount]);
const buildPayload = async () => {
  console.log("🔵 buildPayload STARTED");
  console.log("Active tab:", activeTab);
  
  // Parse existing global variables
  let globalVars = {};
  try {
    globalVars = JSON.parse(form.global_variables_json || '{}');
  } catch (e) {
    console.error("Error parsing global variables:", e);
    globalVars = {};
  }
  
  // Remove recipient-specific variables from global vars (they should come from recipient data only)
  const recipientSpecificVars = ['name', 'username', 'email', 'mobile', 'city', 'state', 
                                   'firm_name', 'firm_type', 'gst_no', 'pan_no', 'date',
                                   'task_id', 'task_status', 'task_billing_status', 'service_name'];
  
  recipientSpecificVars.forEach(varName => {
    delete globalVars[varName];
  });
  
  const payload = {
    config_id: form.config_id,
    template_id: form.template_id,
    broadcast_name: form.broadcast_name,
    schedule_type: form.schedule_type,
    daily_limit: form.daily_limit,
    timezone: form.timezone,
    global_variables_json: globalVars  // Only global company-level variables
  };
  
  if (form.fallback_config_id) payload.fallback_config_id = form.fallback_config_id;
  if (form.schedule_type === 'scheduled') payload.scheduled_at = form.scheduled_at;
  
  let recipientsList = [];
  
  if (activeTab === 'manual') {
    console.log("Manual tab - building from manual entries");
    recipientsList = getValidRecipients().map(r => ({
      recipient_name: r.recipient_name,
      recipient_email: r.recipient_email,
      variable_values_json: JSON.parse(r.variable_values_json || '{}')
    }));
  } else if (activeTab === 'clients') {
    console.log("Clients tab - calling buildRecipientsFromClients");
    recipientsList = await buildRecipientsFromClients();
  } else if (activeTab === 'groups') {
    console.log("Groups tab - calling buildRecipientsFromGroups");
    recipientsList = await buildRecipientsFromGroups();
  } else if (activeTab === 'tasks') {
    console.log("Tasks tab - calling buildRecipientsFromTasks");
    recipientsList = await buildRecipientsFromTasks();
  } else if (activeTab === 'services') {
    toast.error('Service selection requires backend processing.');
    return null;
  }
  
  if (recipientsList.length === 0) {
    console.error("No recipients found!");
    toast.error('No valid recipients selected');
    return null;
  }
  
  payload.recipients = recipientsList;
  
  console.log("Final payload summary:", {
    broadcast_name: payload.broadcast_name,
    template_id: payload.template_id,
    config_id: payload.config_id,
    total_recipients: payload.recipients.length,
    sample_recipient: payload.recipients[0]
  });
  
  return payload;
};
  // FIXED: Submit function with better error handling
  const submit = async () => {
    console.log("🔵 SUBMIT FUNCTION CALLED");
    console.log("Active tab:", activeTab);
    console.log("Form state:", form);

    if (activeTab === 'manual' && getValidRecipients().length === 0) {
      toast.error('Please add at least one valid recipient');
      return;
    }
    if (activeTab === 'clients' && selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }
    if (activeTab === 'groups' && selectedGroups.length === 0) {
      toast.error('Please select at least one group');
      return;
    }
    if (activeTab === 'tasks' && selectedTaskCount === 0) {
      toast.error('No tasks found for selected filters');
      return;
    }
    if (Object.keys(formErrors).length) {
      console.error("Form errors:", formErrors);
      toast.error('Please fix validation errors');
      return;
    }

    setLoading(true);
    try {
      console.log("Building payload...");
      const payload = await buildPayload();
      console.log("Payload built:", payload);

      if (!payload) {
        setLoading(false);
        return;
      }

      console.log("Calling createBroadcast API...");
      const res = await emailApi.createBroadcast(payload);
      console.log("API Response:", res);

      toast.success(res?.message || 'Broadcast created successfully');
      if (form.schedule_type === 'now') {
        toast.success('Emails are being sent in the background');
      } else {
        toast.success(`Broadcast scheduled for ${form.scheduled_at}`);
      }
      navigate('/broadcast/email');
    } catch (e) {
      console.error('Broadcast error:', e);
      console.error('Error response:', e?.response?.data);
      toast.error(e?.response?.data?.message || e.message || 'Failed to create broadcast');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!form.template_id) { toast.error('Please select a template first'); return; }
    const template = templates.find(t => t.template_id === form.template_id);
    setPreviewData({ subject: template?.subject, html_body: template?.html_body, text_body: template?.text_body });
    setShowPreview(true);
  };

  const addFromText = () => {
    if (!bulkInput.trim()) return;
    const mapped = bulkInput.trim().split('\n').map(line => {
      const [n, e] = line.split(',').map(x => x.trim());
      return { recipient_name: n || '', recipient_email: e || '', variable_values_json: '{}' };
    }).filter(r => r.recipient_email && emailRegex.test(r.recipient_email));
    if (mapped.length === 0) { toast.error('No valid email addresses found'); return; }
    setRecipients(p => [...p, ...mapped]);
    setBulkInput('');
    toast.success(`Added ${mapped.length} valid recipient(s)`);
  };

  const getRecipientSummary = () => {
    if (activeTab === 'manual') { const v = getValidRecipients().length; return `${v} recipient${v !== 1 ? 's' : ''}${recipients.length !== v ? ` (${recipients.length - v} invalid)` : ''}`; }
    if (activeTab === 'clients') return `${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''} selected`;
    if (activeTab === 'groups') return `${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''} selected`;
    if (activeTab === 'tasks') return `${selectedTaskCount} task${selectedTaskCount !== 1 ? 's' : ''} matched`;
    if (activeTab === 'services') return `${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''} selected`;
    return 'No recipients';
  };

  const getSelectedStatusesText = () => {
    if (!taskFilters.statuses.length || taskFilters.statuses.length === taskStatuses.length) return 'All statuses';
    const names = { 'complete': 'Complete', 'cancel': 'Canceled', 'in process': 'In Process', 'pending from client': 'Pending from Client', 'pending from department': 'Pending from Department' };
    if (taskFilters.statuses.length === 1) return names[taskFilters.statuses[0]] || taskFilters.statuses[0];
    return `${taskFilters.statuses.length} statuses selected`;
  };

  // FIXED: Add variable to global with proper JSON handling
  const addVariableToGlobal = useCallback((variableName) => {
    console.log(`Adding variable to global: ${variableName}`);
    let currentJson = {};
    try {
      currentJson = JSON.parse(form.global_variables_json || '{}');
    } catch (e) {
      console.error("Error parsing current global variables:", e);
      currentJson = {};
    }
    currentJson[variableName] = `Your ${variableName} here`;
    setForm({ ...form, global_variables_json: JSON.stringify(currentJson, null, 2) });
    toast.success(`Added {{${variableName}}} to global variables`);
  }, [form.global_variables_json]);

  return (
    <>
      <style>{styles}</style>
      <div className="ebc-root">
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />

        <div className={`pt-16 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 40px' }}>

            {/* Breadcrumbs */}
            <div className="mb-4">
              <nav className="flex items-center text-sm text-gray-600">
                <Link to="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <FiHome className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                <Link to="/broadcast/email-channel" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <FiSend className="w-4 h-4" />
                  <span>Broadcast</span>
                </Link>
                <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                <Link to="/broadcast/email" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <span>Email</span>
                </Link>
                <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                <span className="text-gray-900 font-medium">Create</span>
              </nav>
            </div>

           <div className="ebc-header-card">
  <div>
    <div className="ebc-header-main-title">
      <FaEnvelope style={{ marginRight: 10, opacity: 0.85 }} />
      Create Email Broadcast
    </div>
    <div className="ebc-header-sub">Send professional emails to clients, groups, or task-based recipients</div>
  </div>
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    {/* NEW: Bulk Import Button */}
    <button
      onClick={() => navigate('/broadcast/bulk-import')}
      style={{
        background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
        border: 'none',
        borderRadius: 10,
        padding: '8px 16px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 600,
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(5,150,105,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <FaFileExcel size={14} /> Bulk Import from Excel/CSV
    </button>
    <span className="ebc-badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(4px)' }}>
      <FaPaperPlane size={10} /> Email Broadcast
    </span>
    <span className="ebc-badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(4px)' }}>
      <FaUsers size={10} /> Multi-Recipient
    </span>
  </div>
</div>

            {/* ── Basic Information ── */}
            <SectionCard icon={<FaServer size={12} />} title="Basic Information">
              <Row className="g-3">
                <Col md={4}>
                  <FieldGroup label="SMTP Configuration" required hint="Primary SMTP server for sending emails" error={formErrors.config_id}>
                    <select className={`ebc-control ebc-select w-100 ${formErrors.config_id ? 'is-invalid' : ''}`} value={form.config_id} onChange={e => setForm({ ...form, config_id: e.target.value })}>
                      <option value="">Select primary config…</option>
                      {configs.map(c => <option key={c.config_id} value={c.config_id}>{c.config_name}</option>)}
                    </select>
                  </FieldGroup>
                </Col>
                <Col md={4}>
                  <FieldGroup label="Fallback Configuration" hint="Backup SMTP if primary fails">
                    <select className="ebc-control ebc-select w-100" value={form.fallback_config_id} onChange={e => setForm({ ...form, fallback_config_id: e.target.value })}>
                      <option value="">No fallback</option>
                      {configs.filter(c => c.config_id !== form.config_id).map(c => <option key={c.config_id} value={c.config_id}>{c.config_name}</option>)}
                    </select>
                  </FieldGroup>
                </Col>
                <Col md={4}>
                  <FieldGroup label="Email Template" required hint="Select and preview your template" error={formErrors.template_id}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        className={`ebc-control ebc-select flex-grow-1 ${formErrors.template_id ? 'is-invalid' : ''}`}
                        value={form.template_id}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">Select template…</option>
                        {templates.map(t => (
                          <option key={t.template_id} value={t.template_id}>
                            {t.template_name} {t.template_type ? `(${t.template_type})` : ''}
                          </option>
                        ))}
                      </select>
                      <button className="ebc-btn ebc-btn-outline ebc-btn-sm" onClick={handlePreview} disabled={!form.template_id} style={{ borderRadius: 9, whiteSpace: 'nowrap' }}>
                        <FaEye size={12} /> Preview
                      </button>
                      {templateVariables.length > 0 && (
                        <button
                          className="ebc-btn ebc-btn-outline ebc-btn-sm"
                          onClick={() => setShowVariableSelector(!showVariableSelector)}
                          style={{ borderRadius: 9 }}
                        >
                          <FaCode size={12} /> Variables
                        </button>
                      )}
                    </div>

                    {/* Variable Selector Panel */}
                    {showVariableSelector && (
                      <div className="mt-3 p-3 bg-light rounded" style={{ border: '1px solid #e5e7eb' }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <small className="text-muted" style={{ fontWeight: 600 }}>📋 Available Variables for this Template</small>
                          <button
                            className="ebc-btn ebc-btn-ghost ebc-btn-sm"
                            onClick={() => setShowVariableSelector(false)}
                            style={{ padding: '2px 6px' }}
                          >
                            <FaTimes size={10} /> Close
                          </button>
                        </div>
                        {loadingTemplateVars ? (
                          <div className="text-center py-2"><Spinner size="sm" /></div>
                        ) : (
                          <>
                            <div className="d-flex flex-wrap gap-2 mb-2">
                              {templateVariables.map(v => (
                                <code
                                  key={v}
                                  className="p-2 bg-white rounded border"
                                  style={{ fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(`{{${v}}}`);
                                    toast.success(`Copied {{${v}}} to clipboard`);
                                  }}
                                  title="Click to copy"
                                >
                                  {'{{' + v + '}}'}
                                </code>
                              ))}
                            </div>
                            <small className="text-muted d-block mt-1">
                              💡 These variables will be automatically replaced with actual client data when sending emails.
                              <br />
                              📋 Click any variable to copy it to clipboard.
                            </small>
                          </>
                        )}
                      </div>
                    )}
                  </FieldGroup>
                </Col>
              </Row>

              <hr className="ebc-divider" />

              <Row className="g-3">
                <Col md={6}>
                  <FieldGroup label="Broadcast Name" required hint="Internal name for this campaign" error={formErrors.broadcast_name}>
                    <input className={`ebc-control w-100 ${formErrors.broadcast_name ? 'is-invalid' : ''}`} value={form.broadcast_name} onChange={e => setForm({ ...form, broadcast_name: e.target.value })} placeholder="e.g., Tax Filing Reminder — March 2026" />
                  </FieldGroup>
                </Col>
                <Col md={3}>
                  <FieldGroup label="Daily Send Limit" hint="Max emails per day" error={formErrors.daily_limit}>
                    <input type="number" className={`ebc-control w-100 ${formErrors.daily_limit ? 'is-invalid' : ''}`} value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: parseInt(e.target.value) || 1000 })} min="1" max="100000" />
                  </FieldGroup>
                </Col>
                <Col md={3}>
                  <FieldGroup label="Time Zone">
                    <select className="ebc-control ebc-select w-100" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                      <option value="Asia/Kolkata">🇮🇳 IST (Asia/Kolkata)</option>
                      <option value="America/New_York">🇺🇸 EST (New York)</option>
                      <option value="Europe/London">🇬🇧 GMT (London)</option>
                      <option value="Asia/Dubai">🇦🇪 GST (Dubai)</option>
                      <option value="Australia/Sydney">🇦🇺 AEST (Sydney)</option>
                    </select>
                  </FieldGroup>
                </Col>
              </Row>
            </SectionCard>

            {/* ── Schedule & Variables ── */}
            <SectionCard icon={<FaClock size={12} />} title="Schedule & Variables">
              <Row className="g-3">
                <Col md={3}>
                  <FieldGroup label="Schedule Type">
                    <select className="ebc-control ebc-select w-100" value={form.schedule_type} onChange={e => setForm({ ...form, schedule_type: e.target.value })}>
                      <option value="now">🚀 Send Now</option>
                      <option value="scheduled">📅 Schedule for Later</option>
                    </select>
                  </FieldGroup>
                </Col>
                {form.schedule_type === 'scheduled' && (
                  <Col md={4}>
                    <FieldGroup label="Schedule Date & Time" required error={formErrors.scheduled_at}>
                      <input type="datetime-local" className={`ebc-control w-100 ${formErrors.scheduled_at ? 'is-invalid' : ''}`} value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                    </FieldGroup>
                  </Col>
                )}
                <Col md={form.schedule_type === 'scheduled' ? 5 : 9}>
                  <FieldGroup label="Global Variables" hint="Use {{variable_name}} in your template" error={formErrors.global_variables_json}>
                    {/* Available Variables Helper */}
                    {templateVariableKeys.length > 0 && (
                      <div className="mb-2">
                        <small>📋 Available variables for this template:</small>
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {templateVariableKeys.slice(0, 10).map(v => (
                            <code
                              key={v}
                              onClick={() => addVariableToGlobal(v)}
                              style={{ fontSize: '0.7rem', cursor: 'pointer', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}
                            >
                              {'{{' + v + '}}'}
                            </code>
                          ))}
                          {templateVariableKeys.length > 10 && <span className="text-muted" style={{ fontSize: '0.7rem' }}>+{templateVariableKeys.length - 10} more</span>}
                        </div>
                      </div>
                    )}
                    <textarea
                      className={`ebc-control mono w-100 ${formErrors.global_variables_json ? 'is-invalid' : ''}`}
                      rows={4}
                      value={form.global_variables_json}
                      onChange={e => setForm({ ...form, global_variables_json: e.target.value })}
                      placeholder='{"company_name": "Acme Corp", "support_email": "help@acme.com"}'
                      style={{ resize: 'vertical', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.775rem' }}
                    />
                    <div className="ebc-tooltip-hint mt-1">
                      💡 Click on any variable above to add it to the JSON. Variables in {'{{}}'} will be replaced with actual values.
                    </div>
                  </FieldGroup>
                </Col>
              </Row>
            </SectionCard>

            {/* ── Recipients Selection ── */}
            <SectionCard
              icon={<FaUsers size={12} />}
              title="Recipients Selection"
              badge={
                <span className="ebc-badge ebc-badge-blue">
                  <FaUserCheck size={10} /> {getRecipientSummary()}
                </span>
              }
            >
              {/* Tabs */}
              <div className="ebc-tabs mb-4">
                <ul className="nav nav-tabs">
                  {[
                    { key: 'manual', icon: <FaEnvelope size={12} />, label: 'Manual Entry' },
                    { key: 'clients', icon: <FaUsers size={12} />, label: 'Clients' },
                    { key: 'groups', icon: <FaLayerGroup size={12} />, label: 'Groups' },
                    { key: 'tasks', icon: <FaTasks size={12} />, label: 'Tasks' },
                  ].map(tab => (
                    <li className="nav-item" key={tab.key}>
                      <button className={`nav-link ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                        {tab.icon} {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Manual Tab ── */}
            <div className="mb-4">
  <div className="ebc-label" style={{ marginBottom: 8 }}>
    <FaFileImport size={11} /> Bulk Import Options
  </div>
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
    <button
      className="ebc-btn ebc-btn-outline ebc-btn-sm"
      onClick={() => navigate('/broadcast/bulk-import')}
      style={{ background: '#f0fdf4', borderColor: '#059669', color: '#059669' }}
    >
      <FaFileExcel size={12} /> Upload Excel/CSV File
    </button>
    <span style={{ fontSize: '0.7rem', color: '#9ca3af', alignSelf: 'center' }}>or</span>
  </div>
  <div className="ebc-label" style={{ marginBottom: 8 }}>
    <FaFileImport size={11} /> Manual CSV Import <span style={{ color: '#9ca3af', fontWeight: 400 }}>— format: name, email</span>
  </div>
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    <textarea
      className="ebc-bulk-area"
      placeholder={"Import multiple recipients (one per line)\nFormat: Name, email@example.com\nExample:\nJohn Doe, john@company.com"}
      value={bulkInput}
      onChange={e => setBulkInput(e.target.value)}
      style={{ flex: 1 }}
    />
    <button className="ebc-btn ebc-btn-primary ebc-btn-sm" onClick={addFromText} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>
      <FaFileImport size={12} /> Import
    </button>
  </div>
</div>

              {/* ── Clients Tab ── */}
              {activeTab === 'clients' && (
                <>
                  <div className="mb-4" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className={`ebc-btn ebc-btn-sm ${selectAllClients ? 'ebc-btn-success' : 'ebc-btn-outline'}`} onClick={handleSelectAllClients} disabled={loadingAllClients}>
                      {loadingAllClients ? <Spinner size="sm" /> : <FaCheckDouble size={12} />}
                      {selectAllClients ? 'Deselect All' : 'Select All Clients'}
                    </button>
                  </div>

                  <div className="ebc-input-group mb-3">
                    <span className="ebc-ig-prefix"><FaSearch size={12} /></span>
                    <input type="text" placeholder="Search by name, username or email…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                    <button className="ebc-ig-btn primary" onClick={searchClients} disabled={loadingClients}>
                      {loadingClients ? <Spinner size="sm" /> : <FaSearch size={11} />} Search
                    </button>
                  </div>

                  {loadingClients && <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}><Spinner variant="primary" /><p style={{ marginTop: 8, fontSize: '0.82rem' }}>Searching…</p></div>}

                  {clients.length > 0 && (
                    <div className="ebc-scroll-table mb-3">
                      <table className="ebc-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40, textAlign: 'center' }}>✓</th>
                            <th>Name</th><th>Email</th><th>Mobile</th><th>Firms</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clients.map(client => (
                            <tr key={client.username}>
                              <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" className="ebc-check" checked={selectedClients.some(c => c.username === client.username)} onChange={e => { if (e.target.checked) { setSelectedClients([...selectedClients, client]); setSelectAllClients(false); } else setSelectedClients(selectedClients.filter(c => c.username !== client.username)); }} />
                              </td>
                              <td style={{ fontWeight: 600 }}>{client.name || client.username}</td>
                              <td style={{ color: '#6b7280' }}>{client.email}</td>
                              <td style={{ color: '#6b7280' }}>{client.mobile || '—'}</td>
                              <td style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{client.firms?.map(f => f.firm_name).join(', ') || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {clientSearch && clients.length === 0 && !loadingClients && (
                    <div className="ebc-alert ebc-alert-info"><FaSearch size={13} /> No clients found matching your search.</div>
                  )}

                  {selectedClients.length > 0 && (
                    <div className="ebc-selected-bar">
                      <div className="ebc-selected-bar-title"><FaUserCheck size={11} /> Selected Clients ({selectedClients.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedClients.slice(0, 12).map(c => (
                          <span key={c.username} className="ebc-pill" onClick={() => { setSelectedClients(selectedClients.filter(sc => sc.username !== c.username)); setSelectAllClients(false); }}>
                            {c.name || c.username} <FaTimes size={9} />
                          </span>
                        ))}
                        {selectedClients.length > 12 && <span className="ebc-badge ebc-badge-gray">+{selectedClients.length - 12} more</span>}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Groups Tab ── */}
              {activeTab === 'groups' && (
                <>
                  <div className="ebc-input-group mb-4">
                    <span className="ebc-ig-prefix"><FaSearch size={12} /></span>
                    <input type="text" placeholder="Search groups by name…" value={groupSearch} onChange={e => setGroupSearch(e.target.value)} />
                  </div>

                  {loadingGroups && <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}><Spinner variant="primary" /></div>}

                  <Row className="g-3">
                    {filteredGroups.map(group => (
                      <Col md={6} lg={4} key={group.group_id}>
                        <div className={`ebc-group-card ${selectedGroups.some(g => g.group_id === group.group_id) ? 'selected' : ''}`} onClick={() => { if (selectedGroups.some(g => g.group_id === group.group_id)) setSelectedGroups(selectedGroups.filter(g => g.group_id !== group.group_id)); else setSelectedGroups([...selectedGroups, group]); }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div className="ebc-group-card-name">{group.group_name}</div>
                              <span className="ebc-badge ebc-badge-teal" style={{ fontSize: '0.7rem' }}>
                                <FaBuilding size={9} /> {group.statistics?.active_firms_with_email || group.firms?.length || 0} Firms
                              </span>
                              {group.remark && <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.remark}</div>}
                            </div>
                            <button className="ebc-btn ebc-btn-ghost ebc-btn-sm ms-2" style={{ padding: '5px 8px' }} onClick={e => { e.stopPropagation(); handleViewGroup(group.group_id); }}>
                              <FaEye size={12} />
                            </button>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>

                  {filteredGroups.length === 0 && !loadingGroups && (
                    <div className="ebc-alert ebc-alert-info mt-3"><FaLayerGroup size={13} /> No groups found.</div>
                  )}

                  {selectedGroups.length > 0 && (
                    <div className="ebc-selected-bar mt-4">
                      <div className="ebc-selected-bar-title"><FaLayerGroup size={11} /> Selected Groups ({selectedGroups.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedGroups.map(g => (
                          <span key={g.group_id} className="ebc-pill ebc-pill-green" onClick={() => setSelectedGroups(selectedGroups.filter(sg => sg.group_id !== g.group_id))}>
                            {g.group_name} <FaTimes size={9} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Tasks Tab ── */}
              {activeTab === 'tasks' && (
                <>
                  <div className="ebc-filter-box">
                    <div className="ebc-filter-title">
                      <FaFilter size={11} style={{ color: '#2563eb' }} /> Filter Tasks
                    </div>
                    <Row className="g-3">
                      <Col md={5}>
                        <FieldGroup label="Select Service" hint="Choose a service to load tasks">
                          <select className="ebc-control ebc-select w-100" value={taskFilters.service_id} onChange={e => setTaskFilters({ ...taskFilters, service_id: e.target.value, statuses: [] })}>
                            <option value="">— Choose a service —</option>
                            {availableServices.map(s => <option key={s.service_id} value={s.service_id}>{s.name}</option>)}
                          </select>
                        </FieldGroup>
                      </Col>
                      <Col md={4}>
                        <FieldGroup label="Task Status" hint={getSelectedStatusesText()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <StatusFilterDropdown selectedStatuses={taskFilters.statuses} onStatusChange={statuses => setTaskFilters({ ...taskFilters, statuses })} availableStatuses={taskStatuses} />
                            {taskFilters.statuses.length > 0 && (
                              <button className="ebc-btn ebc-btn-ghost ebc-btn-sm" style={{ color: '#dc2626', padding: '5px 8px' }} onClick={() => setTaskFilters({ ...taskFilters, statuses: [] })}>
                                <FaTimes size={11} /> Clear
                              </button>
                            )}
                          </div>
                        </FieldGroup>
                      </Col>
                      <Col md={3}>
                        <FieldGroup label="Billing Status">
                          <select className="ebc-control ebc-select w-100" value={taskFilters.billing_status} onChange={e => setTaskFilters({ ...taskFilters, billing_status: e.target.value })}>
                            <option value="all">All Billings</option>
                            <option value="0">Pending</option>
                            <option value="1">Completed</option>
                            <option value="2">Non Billable</option>
                          </select>
                        </FieldGroup>
                      </Col>
                    </Row>
                    <Row className="g-3 mt-1">
                      <Col md={8}>
                        <FieldGroup label="Search Tasks" hint="Search by task ID, firm name, client name, or email">
                          <div className="ebc-input-group">
                            <span className="ebc-ig-prefix"><FaSearch size={12} /></span>
                            <input type="text" placeholder="Search across task ID, firm name, client name, email…" value={taskSearch} onChange={e => setTaskSearch(e.target.value)} />
                            {taskSearch && (
                              <button className="ebc-ig-btn" onClick={() => setTaskSearch('')} style={{ padding: '0 12px' }}>
                                <FaTimes size={12} />
                              </button>
                            )}
                          </div>
                        </FieldGroup>
                      </Col>
                    </Row>
                  </div>

                  {loadingTasks && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
                      <Spinner variant="primary" />
                      <p style={{ marginTop: 8, fontSize: '0.82rem' }}>Loading tasks…</p>
                    </div>
                  )}

                  {selectedTaskCount > 0 && !loadingTasks && (
                    <div className="ebc-task-count-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                          <FaTasks size={15} />
                        </span>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Tasks matched</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{selectedTaskCount}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6b7280' }}>
                        <FaEnvelope size={11} /> Recipients extracted from matched task clients
                      </div>
                    </div>
                  )}

                  {!tasksSummary && !loadingTasks && taskFilters.service_id && (
                    <div className="ebc-alert ebc-alert-info"><FaFilter size={13} /> No tasks found for the selected filters. Try adjusting your criteria.</div>
                  )}

                  {!taskFilters.service_id && (
                    <div className="ebc-alert ebc-alert-secondary"><FaInfoCircle size={13} /> Select a service above to load and filter tasks.</div>
                  )}
                </>
              )}

              {formErrors.recipients && (
                <div className="ebc-error mt-3" style={{ fontSize: '0.78rem' }}>
                  <FaExclamationCircle size={11} /> {formErrors.recipients}
                </div>
              )}
            </SectionCard>

            {/* ── Action Footer ── */}
            <div className="ebc-footer">
  <div style={{ display: 'flex', gap: 12, marginRight: 'auto' }}>
    <button 
      className="ebc-btn ebc-btn-outline"
      onClick={() => navigate('/broadcast/bulk-import')}
      style={{ background: '#f0fdf4', borderColor: '#059669', color: '#059669' }}
    >
      <FaFileExcel size={12} /> Bulk Import from Excel
    </button>
  </div>
  <div style={{ display: 'flex', gap: 12 }}>
    <button className="ebc-btn ebc-btn-outline" onClick={() => navigate('/broadcast/email')}>
      <FaArrowLeft size={12} /> Cancel
    </button>
    <button className="ebc-btn ebc-btn-send" onClick={submit} disabled={loading}>
      {loading ? <Spinner size="sm" style={{ marginRight: 6 }} /> : <FaPaperPlane size={13} />}
      {form.schedule_type === 'now' ? 'Send Broadcast Now' : 'Schedule Broadcast'}
    </button>
  </div>
</div>

          </div>
        </div>

        {/* ── Group Details Modal ── */}
        <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} size="lg" centered dialogClassName="ebc-modal">
          <Modal.Header closeButton>
            <Modal.Title><FaLayerGroup className="me-2 text-primary" />Group Details: {viewingGroup?.group_name}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '20px 24px' }}>
            {viewingGroup && (
              <>
                <Row className="g-3 mb-3">
                  <Col md={6}><span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>GROUP ID</span><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', marginTop: 2 }}>{viewingGroup.group_id}</div></Col>
                  <Col md={6}><span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>CREATED</span><div style={{ fontSize: '0.82rem', marginTop: 2 }}>{viewingGroup.create_date}</div></Col>
                  <Col md={12}><span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>REMARK</span><div style={{ fontSize: '0.82rem', marginTop: 2 }}>{viewingGroup.remark || 'N/A'}</div></Col>
                </Row>
                <hr className="ebc-divider" />
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 12 }}>Statistics</div>
                <Row className="g-2 mb-4">
                  {[['Total Firms', viewingGroup.statistics?.total_firms_in_group || 0, '#111827'],
                  ['Active w/ Email', viewingGroup.statistics?.active_firms_with_email || 0, '#059669'],
                  ['States', viewingGroup.statistics?.states?.length || 0, '#0369a1'],
                  ['Cities', viewingGroup.statistics?.cities?.length || 0, '#6b7280']].map(([lbl, val, clr]) => (
                    <Col xs={6} md={3} key={lbl}>
                      <div className="ebc-stat-mini">
                        <div className="val" style={{ color: clr }}>{val}</div>
                        <div className="lbl">{lbl}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>Firms in this Group</div>
                <div className="ebc-scroll-table">
                  <table className="ebc-table">
                    <thead>
                      <tr><th>Firm Name</th><th>Client</th><th>Email</th><th>Mobile</th></tr>
                    </thead>
                    <tbody>
                      {viewingGroup.firms?.map((firm, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{firm.firm_name}</td>
                          <td>{firm.client?.name}</td>
                          <td style={{ color: '#6b7280' }}>{firm.client?.email}</td>
                          <td style={{ color: '#6b7280' }}>{firm.client?.mobile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button className="ebc-btn ebc-btn-outline ebc-btn-sm" onClick={() => setShowGroupModal(false)}>Close</button>
          </Modal.Footer>
        </Modal>

        {/* ── Preview Modal ── */}
        <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered dialogClassName="ebc-modal">
          <Modal.Header closeButton>
            <Modal.Title><FaEye className="me-2 text-primary" />Email Template Preview</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '20px 24px' }}>
            {previewData && (
              <>
                <div className="ebc-preview-subject">
                  <strong>Subject</strong>
                  {previewData.subject}
                </div>
                <div className="ebc-preview-body" dangerouslySetInnerHTML={{ __html: previewData.html_body }} />
                {previewData.text_body && (
                  <>
                    <hr className="ebc-divider" />
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Plain Text Version</div>
                    <pre style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem', color: '#374151', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{previewData.text_body}</pre>
                  </>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button className="ebc-btn ebc-btn-outline ebc-btn-sm" onClick={() => setShowPreview(false)}>Close</button>
          </Modal.Footer>
        </Modal>

             {/* Bulk Import Modal */}
        <BulkEmailImportModal
          show={showImportModal}
          onHide={() => setShowImportModal(false)}
          onImportComplete={handleImportRecipients}
        />
      </div>
    </>
  );
};

export default EmailBroadcastCreate;