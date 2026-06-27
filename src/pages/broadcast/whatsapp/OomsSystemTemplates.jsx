import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiChevronRight,
  FiFileText,
  FiHome,
  FiInfo,
  FiLoader,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiX,
} from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import { useUserPermissions } from '../../../utils/permission-helper';
import OomsSystemTemplatePickerModal from './OomsSystemTemplatePickerModal';
import { extractApiError } from './oneChattingSendUtils';
import { formatActivityType } from './oomsSystemTemplateUtils';
import { normalizeList, whatsappApi } from './whatsappApi';
import { useWhatsappChannel } from './useWhatsappChannel';

const MappingStatusBadge = ({ isSet, templateName }) =>
  isSet ? (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="font-mono">{templateName}</span>
    </span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Not configured
    </span>
  );

const OomsSystemTemplates = () => {
  const { check } = useUserPermissions();
  const whatsappChannel = useWhatsappChannel();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'),
  );

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState(null);
  const [pickerType, setPickerType] = useState(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.getWpSystemTemplateMapList();
      setRows(normalizeList(res?.data));
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to load template mappings'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((item) =>
      [item.type, item.template_name, ...(item.available_templates || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const configuredCount = useMemo(
    () => rows.filter((item) => item.is_set).length,
    [rows],
  );

  const handleSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleUnset = async (type) => {
    if (!type) return;

    setActionType(type);
    try {
      const res = await whatsappApi.unsetWpSystemTemplateMap({ type });
      toast.success(res?.message || 'Template mapping removed');
      setRows((prev) =>
        prev.map((row) =>
          row.type === type
            ? {
                ...row,
                is_set: false,
                map_id: null,
                template_name: null,
                status: 0,
                selected_template: null,
              }
            : row,
        ),
      );
    } catch (error) {
      toast.error(extractApiError(error, 'Failed to remove template mapping'));
    } finally {
      setActionType(null);
    }
  };

  const handlePickerSaved = (savedData) => {
    if (!savedData?.type) {
      fetchMappings();
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.type === savedData.type
          ? {
              ...row,
              is_set: true,
              map_id: savedData.map_id ?? row.map_id,
              template_name: savedData.template_name ?? row.template_name,
              status: savedData.status ?? 1,
              selected_template: savedData.template ?? row.selected_template,
            }
          : row,
      ),
    );
  };

  if (!check('broadcast_config_edit')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
          className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${
            isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
          }`}
        >
          <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiLock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h3>
            <p className="text-slate-500 text-sm">You do not have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

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
        className={`pt-16 transition-all duration-300 ${
          isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiHome className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link
              to="/broadcast/whatsapp"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <FiSend className="w-4 h-4" />
              <span>Broadcast</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">OOMS System Templates</span>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">OOMS System WhatsApp Templates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Choose a template for each notification type. Messages are sent automatically when
              events occur.
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex gap-3">
            <FiInfo className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 m-0">
              Templates are managed by OOMS. You only pick which design to use per activity type —
              variable values are filled by the system when tasks and other events happen.
              {whatsappChannel !== 'ooms system' ? (
                <>
                  {' '}
                  Your branch WhatsApp channel is currently{' '}
                  <span className="font-medium capitalize">{whatsappChannel || 'disabled'}</span>.
                  Set it to OOMS System on the broadcast page for these mappings to take effect.
                </>
              ) : null}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiFileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Template mappings</h2>
                  <p className="text-xs text-gray-500">
                    {configuredCount} of {rows.length} type{rows.length === 1 ? '' : 's'} configured
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 w-full lg:w-auto"
              >
                <div className="relative flex-1 sm:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search types..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={fetchMappings}
                  disabled={loading}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Refresh"
                >
                  <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        {Array.from({ length: 3 }).map((__, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4">
                            <div className="h-4 bg-gray-200 rounded w-full max-w-[180px]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                        No template types found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item) => {
                      const isBusy = actionType === item.type;

                      return (
                        <tr key={item.type} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 m-0">
                              {formatActivityType(item.type)}
                            </p>
                            {item.available_templates?.length ? (
                              <p className="text-xs text-gray-500 m-0 mt-0.5">
                                {item.available_templates.length} template
                                {item.available_templates.length === 1 ? '' : 's'} available
                              </p>
                            ) : null}
                          </td>
                          <td className="px-6 py-4">
                            <MappingStatusBadge
                              isSet={Boolean(item.is_set)}
                              templateName={item.template_name}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setPickerType(item.type)}
                                disabled={Boolean(actionType)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg disabled:opacity-50"
                              >
                                {item.is_set ? 'Change' : 'Configure'}
                              </button>
                              {item.is_set ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnset(item.type)}
                                  disabled={Boolean(actionType)}
                                  className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                  title="Remove mapping"
                                >
                                  {isBusy ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FiX className="w-4 h-4" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {pickerType ? (
        <OomsSystemTemplatePickerModal
          activityType={pickerType}
          onClose={() => setPickerType(null)}
          onSaved={handlePickerSaved}
        />
      ) : null}
    </div>
  );
};

export default OomsSystemTemplates;
