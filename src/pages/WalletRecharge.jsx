import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Spinner, Badge, Table } from 'react-bootstrap';
import { Header, Sidebar } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';
import {
  FiCreditCard,
  FiPlus,
  FiArrowLeft,
  FiRefreshCw,
  FiClock,
  FiDollarSign,
  FiList,
  FiActivity,
  FiHome,
  FiChevronRight,
  FiChevronLeft,
  FiSend,
  FiUser
} from 'react-icons/fi';

const WalletRecharge = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('sidebarMinimized') || 'false'));

  // Wallet State
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [pagination, setPagination] = useState({ page_no: 1, limit: 10, total: 0, total_pages: 1 });

  // Add Money Form State
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [purpose, setPurpose] = useState('SMS Billing Topup');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchWalletBalance = async () => {
    setLoadingBalance(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/wallet/balance`, { headers });
      const result = await res.json();
      if (result.success) {
        setBalanceData(result.data);
      } else {
        toast.error(result.message || 'Failed to fetch wallet balance');
      }
    } catch (error) {
      console.error('Fetch balance error:', error);
      toast.error('Failed to fetch wallet balance');
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchTransactions = async (page = 1) => {
    setLoadingTransactions(true);
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams({
        page_no: page,
        limit: pagination.limit
      });
      const res = await fetch(`${API_BASE_URL}/wallet/transactions?${params}`, { headers });
      const result = await res.json();
      if (result.success) {
        setTransactions(result.data || []);
        if (result.pagination) {
          setPagination({
            page_no: Number(result.pagination.page_no || page),
            limit: Number(result.pagination.limit || 10),
            total: Number(result.pagination.total || 0),
            total_pages: Number(result.pagination.total_pages || 1)
          });
        }
      } else {
        toast.error(result.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadData = () => {
    fetchWalletBalance();
    fetchTransactions(1);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(rechargeAmount);
    if (!rechargeAmount || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid recharge amount');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE_URL}/wallet/add-money`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountNum,
          purpose,
          details: details || 'Recharged via dashboard'
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || `Successfully added ₹${amountNum.toFixed(2)} to wallet!`);
        setRechargeAmount('');
        setDetails('');
        // Trigger balance and transaction list reload
        loadData();
      } else {
        toast.error(result.message || 'Failed to add money');
      }
    } catch (error) {
      console.error('Add money error:', error);
      toast.error('Failed to add money');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAmountClick = (amount) => {
    setRechargeAmount(amount.toString());
  };

  const formatTxDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
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
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <nav className="flex items-center text-sm text-gray-600">
              <Link to="/" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                <FiHome className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
              <Link to="/broadcast" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                <FiSend className="w-4 h-4" />
                <span>Broadcast</span>
              </Link>
              <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
              <span className="text-gray-900 font-medium">Wallet Recharge</span>
            </nav>
            <button
              onClick={loadData}
              disabled={loadingBalance || loadingTransactions}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-700"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loadingBalance || loadingTransactions ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Top Info Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-48 lg:h-auto">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <FiCreditCard className="w-48 h-48" />
              </div>
              <div className="relative">
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Active Wallet Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold font-mono">
                    ₹{loadingBalance ? '...' : Number(balanceData?.balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="relative mt-4 pt-4 border-t border-indigo-500/40 text-xs text-indigo-100 flex items-center justify-between">
                <div>
                  <span className="opacity-75">Billing Rate: </span>
                  <span className="font-bold">₹0.15 / SMS</span>
                </div>
                {balanceData?.modify_date && (
                  <span className="opacity-70">Updated {new Date(balanceData.modify_date).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Recharge Form Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FiPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Top Up Wallet</h3>
                  <p className="text-xs text-slate-500">Recharge balance to proceed with SMS Campaigns</p>
                </div>
              </div>

              <form onSubmit={handleAddMoney} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="e.g. 50.00"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Purpose</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    >
                      <option value="SMS Billing Topup">SMS Billing Topup</option>
                      <option value="Manual Recharge">Manual Recharge</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Details / Remarks</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="e.g. UPI payment reference"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-slate-500 font-medium">Quick Add:</span>
                  {[50, 100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAmountClick(amt)}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-55"
                  >
                    {submitting ? <Spinner size="sm" /> : <FiPlus className="w-4 h-4" />}
                    Add Money
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Transaction History Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FiList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Transactions History</h3>
                  <p className="text-xs text-slate-500">View debit and credit logs for this wallet</p>
                </div>
              </div>
            </div>

            <div className="p-0">
              {loadingTransactions ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Spinner animation="border" variant="primary" style={{ width: 28, height: 28, borderWidth: 3 }} />
                  <p className="mt-4 text-sm text-slate-500 font-medium">Loading transaction log...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <FiClock className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-700 font-medium">No transactions found</p>
                  <p className="text-slate-400 text-xs mt-1">Recharge your wallet to initialize activity log</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Transaction ID</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Purpose</th>
                          <th className="px-6 py-3">Details</th>
                          <th className="px-6 py-3 text-right">Amount</th>
                          <th className="px-6 py-3 text-center">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3 font-mono text-xs text-slate-500">{tx.transaction_id}</td>
                            <td className="px-6 py-3 text-xs text-slate-600">{formatTxDate(tx.create_date)}</td>
                            <td className="px-6 py-3 font-semibold text-slate-800">{tx.purpose}</td>
                            <td className="px-6 py-3 text-slate-600 text-xs truncate max-w-xs" title={tx.details}>{tx.details}</td>
                            <td className="px-6 py-3 text-right font-bold text-slate-800 font-mono">
                              ₹{Number(tx.amount || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-center">
                              {tx.type === 'credit' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                  Credit
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                  Debit
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
                    <div className="text-xs text-slate-500 font-medium">
                      Showing page <span className="text-slate-800 font-bold">{pagination.page_no}</span> of{' '}
                      <span className="text-slate-800 font-bold">{pagination.total_pages}</span> ({pagination.total} records)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchTransactions(pagination.page_no - 1)}
                        disabled={pagination.page_no <= 1 || loadingTransactions}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all text-slate-700"
                      >
                        <FiChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </button>
                      <button
                        onClick={() => fetchTransactions(pagination.page_no + 1)}
                        disabled={pagination.page_no >= pagination.total_pages || loadingTransactions}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all text-slate-700"
                      >
                        Next
                        <FiChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletRecharge;
