import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiHome,
  FiSend,
  FiSettings,
  FiSearch,
  FiUsers,
  FiLoader,
  FiPower,
  FiKey,
} from 'react-icons/fi';
import { Header, Sidebar } from '../../../components/header';
import OneChattingTokenModal from './OneChattingTokenModal';
import { whatsappApi, normalizeList, normalizePagination } from './whatsappApi';

const formatContact = (profile) => {
  if (!profile) return '—';
  const mobile = profile.mobile
    ? `${profile.country_code || ''}${profile.mobile}`.trim()
    : '';
  if (profile.email && mobile) return `${profile.email} · ${mobile}`;
  return profile.email || mobile || '—';
};

const StatusBadge = ({ enabled }) =>
  enabled ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      Enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
      Disabled
    </span>
  );

const OneChattingConfigure = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem('sidebarMinimized') || 'false')
  );
  const [loading, setLoading] = useState(false);
  const [savingMapId, setSavingMapId] = useState(null);
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page_no: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });
  const [modalRow, setModalRow] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const fetchData = useCallback(async (page = 1, limit = 20, searchTerm = '') => {
      setLoading(true);
      try {
        const params = { page_no: page, limit };
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const res = await whatsappApi.listDeveloperTokens(params);
        setRows(normalizeList(res?.data));
        setPagination(normalizePagination(res?.pagination));
      } catch (error) {
        toast.error(error?.response?.data?.message || error.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    fetchData(1, pagination.limit, search);
  }, [search, fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleLimitChange = (newLimit) => {
    const limit = Number(newLimit);
    setPagination((prev) => ({ ...prev, limit, page_no: 1 }));
    fetchData(1, limit, search);
  };

  const handleDisable = async (row) => {
    if (!window.confirm(`Disable OneChatting for ${row.profile?.name || row.username}?`)) {
      return;
    }

    setSavingMapId(row.map_id);
    try {
      await whatsappApi.updateDeveloperToken({
        map_id: row.map_id,
        enabled: false,
      });
      toast.success('OneChatting disabled successfully');
      fetchData(pagination.page_no, pagination.limit, search);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to disable OneChatting');
    } finally {
      setSavingMapId(null);
    }
  };

  const handleModalSubmit = async (payload) => {
    setModalSaving(true);
    try {
      const res = await whatsappApi.updateDeveloperToken(payload);
      toast.success(res?.message || 'Developer token updated successfully');
      setModalRow(null);
      fetchData(pagination.page_no, pagination.limit, search);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update developer token');
    } finally {
      setModalSaving(false);
    }
  };

  const renderActions = (row) => {
    const isSaving = savingMapId === row.map_id;

    if (row.onechatting_enabled) {
      return (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setModalRow(row)}
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg disabled:opacity-50"
          >
            <FiKey className="w-3.5 h-3.5" />
            Update Token
          </button>
          <button
            type="button"
            onClick={() => handleDisable(row)}
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
          >
            {isSaving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiPower className="w-3.5 h-3.5" />}
            Disable
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setModalRow(row)}
        disabled={isSaving}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
      >
        <FiKey className="w-3.5 h-3.5" />
        Enable
      </button>
    );
  };

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

      <div className={`pt-16 transition-all duration-300 ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link to="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <FiHome className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link to="/broadcast/whatsapp" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <FiSend className="w-4 h-4" />
              <span>Broadcast</span>
            </Link>
            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">OneChatting Configuration</span>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">OneChatting Configuration</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage developer tokens and OneChatting access for branch users
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiSettings className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Branch Users</h2>
                  <p className="text-xs text-gray-500">Enable or disable OneChatting per user mapping</p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search name, username, email..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Search
                </button>
              </form>
            </div>

            {loading && rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <FiLoader className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">Loading users...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <FiUsers className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">No users found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {search ? 'Try a different search term' : 'No branch mappings available'}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Designation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => (
                        <tr key={row.map_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-sm text-gray-900">
                              {row.profile?.name || '—'}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">{row.username}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{row.designation || '—'}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                              {row.type || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatContact(row.profile)}</td>
                          <td className="px-6 py-4">
                            <StatusBadge enabled={row.onechatting_enabled} />
                          </td>
                          <td className="px-6 py-4">{renderActions(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {rows.map((row) => (
                    <div key={row.map_id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{row.profile?.name || '—'}</p>
                          <p className="text-xs text-gray-500 font-mono">{row.username}</p>
                        </div>
                        <StatusBadge enabled={row.onechatting_enabled} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Designation</p>
                          <p className="text-gray-800">{row.designation || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="text-gray-800 capitalize">{row.type || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Contact</p>
                          <p className="text-gray-800">{formatContact(row.profile)}</p>
                        </div>
                      </div>
                      <div className="flex justify-end">{renderActions(row)}</div>
                    </div>
                  ))}
                </div>

                <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-gray-600">
                    <div>
                      Showing{' '}
                      <span className="font-semibold text-gray-800">
                        {pagination.total === 0 ? 0 : (pagination.page_no - 1) * pagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold text-gray-800">
                        {Math.min(pagination.page_no * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-semibold text-gray-800">{pagination.total}</span> users
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Show</span>
                      <select
                        value={pagination.limit}
                        onChange={(e) => handleLimitChange(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 font-medium outline-none focus:ring-1 focus:ring-green-500"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span>per page</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fetchData(1, pagination.limit, search)}
                      disabled={pagination.page_no <= 1 || loading}
                      className="p-2 text-xs rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                    >
                      <FiChevronsLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchData(pagination.page_no - 1, pagination.limit, search)}
                      disabled={pagination.page_no <= 1 || loading}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                    >
                      <FiChevronLeft size={14} />
                      Prev
                    </button>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                      {pagination.page_no} / {pagination.total_pages}
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchData(pagination.page_no + 1, pagination.limit, search)}
                      disabled={pagination.page_no >= pagination.total_pages || loading}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                    >
                      Next
                      <FiChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchData(pagination.total_pages, pagination.limit, search)}
                      disabled={pagination.page_no >= pagination.total_pages || loading}
                      className="p-2 text-xs rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                    >
                      <FiChevronsRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <OneChattingTokenModal
        isOpen={Boolean(modalRow)}
        row={modalRow}
        onClose={() => !modalSaving && setModalRow(null)}
        onSubmit={handleModalSubmit}
        saving={modalSaving}
      />
    </div>
  );
};

export default OneChattingConfigure;
