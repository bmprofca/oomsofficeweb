import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { FiCheck, FiFile, FiLoader, FiSave } from 'react-icons/fi';
import CustomSelect from '../CustomSelect';
import { optionByValue } from '../../utils/customSelectHelpers';
import API_BASE_URL from '../../utils/api-controller';
import getHeaders from '../../utils/get-headers';
import {
  createClientDocuments,
  DOCUMENT_MONTHS,
  DOCUMENT_UPLOAD_TABS,
  stripFileExtension,
} from '../../utils/clientDocumentUpload';

const formatUnderscoreLabel = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const PANEL_MAX_H =
  'max-h-[min(calc(100vh-1.5rem),100dvh)] sm:max-h-[min(calc(100vh-2rem),100dvh)]';

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:bg-slate-50';

const LABEL_CLASS = 'block text-xs font-semibold text-slate-600 mb-1.5';

export default function SaveChatMediaToDocumentsModal({
  isOpen,
  onClose,
  clientUsername,
  media,
  onSuccess,
}) {
  const [tab, setTab] = useState('general');
  const [selectedFirm, setSelectedFirm] = useState('');
  const [firms, setFirms] = useState([]);
  const [loadingFirms, setLoadingFirms] = useState(false);
  const [documentTypes, setDocumentTypes] = useState({ it: [], gst: [], mca: [] });
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [assessmentYears, setAssessmentYears] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  const [docType, setDocType] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');

  const mediaUrl = media?.url || '';
  const mediaLabel = media?.name || media?.type || 'Chat media';

  useEffect(() => {
    if (!isOpen) return;

    setTab('general');
    setSelectedFirm('');
    setDocType('');
    setYear('');
    setMonth('');
    setCategory('');
    setName(stripFileExtension(media?.name) || '');
    setRemark('');
  }, [isOpen, media?.name, media?.url]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  useEffect(() => {
    if (!isOpen || !clientUsername) return undefined;

    let cancelled = false;

    const loadFirms = async () => {
      setLoadingFirms(true);
      const headers = getHeaders();
      if (!headers) {
        setLoadingFirms(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/client/details/firms/list?username=${encodeURIComponent(clientUsername)}`,
          { method: 'GET', headers },
        );
        const data = await response.json();
        if (!cancelled) {
          setFirms(data.success && Array.isArray(data.data?.firms) ? data.data.firms : []);
        }
      } catch {
        if (!cancelled) setFirms([]);
      } finally {
        if (!cancelled) setLoadingFirms(false);
      }
    };

    loadFirms();
    return () => {
      cancelled = true;
    };
  }, [isOpen, clientUsername]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    const loadTypes = async () => {
      setLoadingTypes(true);
      const headers = getHeaders();
      if (!headers) {
        setLoadingTypes(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/client/details/documents/types`, {
          method: 'GET',
          headers,
        });
        const data = await response.json();
        if (!cancelled && data.success && data.data) {
          setDocumentTypes(data.data);
        }
      } catch {
        if (!cancelled) setDocumentTypes({ it: [], gst: [], mca: [] });
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    };

    loadTypes();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    const loadYears = async () => {
      if (tab !== 'income-tax' && tab !== 'gst' && tab !== 'mca') {
        setLoadingYears(false);
        return;
      }

      setLoadingYears(true);
      const headers = getHeaders();
      if (!headers) {
        setLoadingYears(false);
        return;
      }

      const path =
        tab === 'income-tax' ? '/utils/assisment-years' : '/utils/financial-years';

      try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          method: 'GET',
          headers,
        });
        const data = await response.json();
        if (cancelled) return;

        if (data.success && Array.isArray(data.data)) {
          if (tab === 'income-tax') {
            setAssessmentYears(data.data);
          } else {
            setFinancialYears(data.data);
          }
        } else if (tab === 'income-tax') {
          setAssessmentYears([]);
        } else {
          setFinancialYears([]);
        }
      } catch {
        if (!cancelled) {
          if (tab === 'income-tax') setAssessmentYears([]);
          else setFinancialYears([]);
        }
      } finally {
        if (!cancelled) setLoadingYears(false);
      }
    };

    loadYears();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tab]);

  useEffect(() => {
    if (!isOpen || tab !== 'general') return undefined;

    let cancelled = false;

    const loadCategories = async () => {
      setLoadingCategories(true);
      const headers = getHeaders();
      if (!headers) {
        setLoadingCategories(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/client/details/documents/category-list`,
          { method: 'GET', headers },
        );
        const data = await response.json();
        if (!cancelled) {
          setCategories(data.success && Array.isArray(data.data) ? data.data : []);
        }
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tab]);

  useEffect(() => {
    setDocType('');
    setYear('');
    setMonth('');
    setCategory('');
  }, [tab]);

  const firmOptions = useMemo(
    () =>
      (firms || []).map((firm) => {
        const firmName = firm.firm_name || firm.name || '-';
        const pan =
          String(firm.pan_no || '')
            .trim()
            .toUpperCase() || '—';
        const type =
          String(firm.firm_type || firm.type || '')
            .replace(/_/g, ' ')
            .trim()
            .toUpperCase() || '—';
        return {
          value: firm.firm_id || firm.id,
          label: `${firmName} | ${pan} | ${type}`,
          searchText: `${firmName} ${pan} ${type}`,
        };
      }),
    [firms],
  );

  const typeOptions = useMemo(() => {
    const list =
      tab === 'income-tax'
        ? documentTypes.it || []
        : tab === 'gst'
          ? documentTypes.gst || []
          : tab === 'mca'
            ? documentTypes.mca || []
            : [];
    return list.map((type) => ({
      value: type.value,
      label: formatUnderscoreLabel(type.name || type.value),
    }));
  }, [tab, documentTypes]);

  const yearOptions = useMemo(() => {
    const years =
      tab === 'income-tax'
        ? assessmentYears
        : tab === 'gst' || tab === 'mca'
          ? financialYears
          : [];
    return years.map((value) => ({ value, label: value }));
  }, [tab, assessmentYears, financialYears]);

  const monthOptions = useMemo(
    () =>
      DOCUMENT_MONTHS.map((monthLabel) => ({
        value: monthLabel.split(' ')[0].toLowerCase(),
        label: monthLabel,
      })),
    [],
  );

  const categoryOptions = useMemo(
    () =>
      (categories || []).map((cat) => ({
        value: cat.category_id || cat.id,
        label: cat.name,
      })),
    [categories],
  );

  const yearLabel =
    tab === 'income-tax'
      ? 'Assessment Year'
      : tab === 'gst' || tab === 'mca'
        ? 'Financial Year'
        : 'Year';

  useEffect(() => {
    if (!isOpen || saving) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, onClose]);

  const handleSubmit = async () => {
    if (!mediaUrl) {
      toast.error('Media URL is missing');
      return;
    }
    if (!selectedFirm) {
      toast.error('Please select a firm');
      return;
    }
    if (tab === 'general') {
      if (!name.trim()) {
        toast.error('Please enter a document name');
        return;
      }
      if (!category) {
        toast.error('Please select a category');
        return;
      }
    } else {
      if (!docType) {
        toast.error('Please select a document type');
        return;
      }
      if (!year) {
        toast.error(`Please select ${yearLabel.toLowerCase()}`);
        return;
      }
      if (tab === 'gst' && !month) {
        toast.error('Please select a month');
        return;
      }
    }

    setSaving(true);
    try {
      await createClientDocuments({
        clientUsername,
        firmId: selectedFirm,
        tab,
        documents: [
          {
            url: mediaUrl,
            media_name: media?.name,
            name: tab === 'general' ? name.trim() : stripFileExtension(media?.name),
            type: docType,
            year,
            month,
            category,
            remark,
          },
        ],
      });
      toast.success('Saved to client documents');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to save document',
      );
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="save-chat-media-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1200] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none"
        >
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={saving ? undefined : onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-chat-media-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`relative z-[1] pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${PANEL_MAX_H}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="shrink-0 border-b border-gray-200 px-5 py-3.5">
              <h3
                id="save-chat-media-modal-title"
                className="text-base font-bold text-slate-800 m-0"
              >
                Save to Documents
              </h3>
              <p className="m-0 mt-1 text-xs text-slate-500">
                Save this WhatsApp media file to the client profile.
              </p>
            </header>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <FiCheck className="h-4 w-4" strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-semibold text-slate-800">{mediaLabel}</p>
              <p className="m-0 mt-0.5 text-[11px] text-emerald-700">Media link ready to save</p>
            </div>
            <FiFile className="h-5 w-5 shrink-0 text-emerald-600" />
          </div>

          <div>
            <label className={LABEL_CLASS}>Document section *</label>
            <div className="flex flex-wrap gap-1.5">
              {DOCUMENT_UPLOAD_TABS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTab(option.id)}
                  disabled={saving}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    tab === option.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Firm *</label>
            <CustomSelect
              options={firmOptions}
              value={optionByValue(firmOptions, selectedFirm)}
              onChange={(opt) => setSelectedFirm(opt?.value || '')}
              placeholder={loadingFirms ? 'Loading firms...' : 'Select firm'}
              searchPlaceholder="Search firm..."
              isDisabled={saving || loadingFirms}
              isClearable={false}
            />
          </div>

          {(tab === 'income-tax' || tab === 'gst' || tab === 'mca') && (
            <>
              <div>
                <label className={LABEL_CLASS}>Type *</label>
                <CustomSelect
                  options={typeOptions}
                  value={optionByValue(typeOptions, docType)}
                  onChange={(opt) => setDocType(opt?.value || '')}
                  placeholder={loadingTypes ? 'Loading...' : 'Select type'}
                  searchPlaceholder="Search type..."
                  isDisabled={saving || loadingTypes}
                  isClearable={false}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>{yearLabel} *</label>
                <CustomSelect
                  options={yearOptions}
                  value={optionByValue(yearOptions, year)}
                  onChange={(opt) => setYear(opt?.value || '')}
                  placeholder={loadingYears ? 'Loading...' : 'Select year'}
                  searchPlaceholder="Search year..."
                  isDisabled={saving || loadingYears}
                  isClearable={false}
                />
              </div>
            </>
          )}

          {tab === 'gst' && (
            <div>
              <label className={LABEL_CLASS}>Month *</label>
              <CustomSelect
                options={monthOptions}
                value={optionByValue(monthOptions, month)}
                onChange={(opt) => setMonth(opt?.value || '')}
                placeholder="Select month"
                searchPlaceholder="Search month..."
                isDisabled={saving}
                isClearable={false}
              />
            </div>
          )}

          {tab === 'general' && (
            <>
              <div>
                <label className={LABEL_CLASS}>Name *</label>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Document name"
                  disabled={saving}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Category *</label>
                <CustomSelect
                  options={categoryOptions}
                  value={optionByValue(categoryOptions, category)}
                  onChange={(opt) => setCategory(opt?.value || '')}
                  placeholder={loadingCategories ? 'Loading...' : 'Select category'}
                  searchPlaceholder="Search category..."
                  isDisabled={saving || loadingCategories}
                  isClearable={false}
                />
              </div>
            </>
          )}

          <div>
            <label className={LABEL_CLASS}>Remark</label>
            <textarea
              rows={3}
              className={`${INPUT_CLASS} resize-y min-h-[4.5rem]`}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional remark"
              disabled={saving}
            />
          </div>
        </div>

        <footer className="shrink-0 border-t border-gray-200 px-5 py-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-slate-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !mediaUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Save to Documents
              </>
            )}
            </button>
          </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
