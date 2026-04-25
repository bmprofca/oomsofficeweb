import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Dummy Data ---
const DUMMY_EXPENSES = [
  {
    id: 'exp1',
    title: 'Team Lunch',
    description: 'Lunch with product team at The Pizza Place',
    amount: 2450,
    date: '2025-03-15',
    attachment: 'receipt_lunch.pdf',
    status: 'Approved',
    verifiedByAdmin: true,
  },
  {
    id: 'exp2',
    title: 'Taxi Fare',
    description: 'Airport pickup and drop for client meeting',
    amount: 890,
    date: '2025-03-18',
    attachment: 'taxi_bill.jpg',
    status: 'Pending',
    verifiedByAdmin: false,
  },
  {
    id: 'exp3',
    title: 'Software Subscription',
    description: 'Figma monthly team plan',
    amount: 1500,
    date: '2025-03-20',
    attachment: 'figma_invoice.pdf',
    status: 'Approved',
    verifiedByAdmin: true,
  },
];

const DUMMY_LEDGER = {
  totalApproved: 3950,
  transactions: [
    { id: 'tx1', expenseId: 'exp1', amount: 2450, date: '2025-03-16', note: 'Lunch reimbursement' },
    { id: 'tx3', expenseId: 'exp3', amount: 1500, date: '2025-03-21', note: 'Software subscription' },
  ],
};

// --- Add Expense Modal Component ---
const AddExpenseModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    attachment: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.amount || !formData.date) return;
    onAdd({
      title: formData.title,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      attachment: formData.attachment || undefined,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900">Add New Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g., Client Dinner, Office Supplies"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Detailed description of the expense..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
            <input
              type="text"
              value={formData.attachment}
              onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="File name or URL"
            />
            <p className="text-xs text-gray-500 mt-1">Upload receipt or invoice (simulated)</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              Submit Expense
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Admin Verification Modal (for approving/rejecting) ---
const AdminVerifyModal = ({ expense, onClose, onVerify }) => {
  const [decision, setDecision] = useState('Approved');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4">Verify Expense</h3>
        <div className="space-y-3 mb-6">
          <p><span className="font-medium">Title:</span> {expense.title}</p>
          <p><span className="font-medium">Description:</span> {expense.description}</p>
          <p><span className="font-medium">Amount:</span> ₹{expense.amount}</p>
          <p><span className="font-medium">Date:</span> {expense.date}</p>
          {expense.attachment && <p><span className="font-medium">Attachment:</span> {expense.attachment}</p>}
        </div>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setDecision('Approved')}
            className={`flex-1 py-2 rounded-xl border transition ${decision === 'Approved' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-300 text-gray-600'}`}
          >
            ✅ Approve
          </button>
          <button
            onClick={() => setDecision('Rejected')}
            className={`flex-1 py-2 rounded-xl border transition ${decision === 'Rejected' ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-300 text-gray-600'}`}
          >
            ❌ Reject
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onVerify(expense.id, decision); onClose(); }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main Component ---
const ExpenseTab = ({ expenses, setExpenses, variants }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [ledger, setLedger] = useState(DUMMY_LEDGER);

  // Add new expense (pending by default)
  const handleAddExpense = (newExpenseData) => {
    const newExpense = {
      id: `exp_${Date.now()}`,
      ...newExpenseData,
      status: 'Pending',
      verifiedByAdmin: false,
    };
    setExpenses([newExpense, ...expenses]);
  };

  // Admin verification: if Approved, add to ledger
  const handleVerifyExpense = (expenseId, decision) => {
    setExpenses(prev =>
      prev.map(exp =>
        exp.id === expenseId
          ? { ...exp, status: decision, verifiedByAdmin: true }
          : exp
      )
    );

    if (decision === 'Approved') {
      const approvedExpense = expenses.find(e => e.id === expenseId);
      if (approvedExpense) {
        const newTransaction = {
          id: `tx_${Date.now()}`,
          expenseId: approvedExpense.id,
          amount: approvedExpense.amount,
          date: new Date().toISOString().split('T')[0],
          note: approvedExpense.title,
        };
        setLedger(prev => ({
          totalApproved: prev.totalApproved + approvedExpense.amount,
          transactions: [newTransaction, ...prev.transactions],
        }));
      }
    }
  };

  const handleDeleteExpense = (id) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (expenseToDelete?.status === 'Approved') {
      if (window.confirm('This expense is already in ledger. Delete will not reverse ledger entry. Continue?')) {
        setExpenses(prev => prev.filter(e => e.id !== id));
      }
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleEditExpense = (expense) => {
    const newTitle = prompt('Edit title:', expense.title);
    if (newTitle) {
      setExpenses(prev =>
        prev.map(e => (e.id === expense.id ? { ...e, title: newTitle } : e))
      );
    }
  };

  return (
    <>
      <motion.div
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="bg-white rounded-2xl shadow-md border border-gray-100 p-6"
      >
        {/* Header with Ledger summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Expense Management</h3>
            <p className="text-sm text-gray-500 mt-0.5">Track, submit, and verify expenses</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-green-50 px-4 py-2 rounded-xl">
              <p className="text-xs text-green-600 font-medium">Ledger Balance</p>
              <p className="text-xl font-bold text-green-700">₹{ledger.totalApproved.toLocaleString()}</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
            >
              + Add Expense
            </button>
          </div>
        </div>

        {/* Expense Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 rounded-xl">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    No expenses added yet. Click "Add Expense" to get started.
                  </td>
                </tr>
              ) : (
                expenses.map((expense, idx) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.title}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">{expense.description}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{expense.amount.toLocaleString()}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        expense.status === 'Approved'
                          ? 'bg-green-100 text-green-800'
                          : expense.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm space-x-2">
                      {!expense.verifiedByAdmin && expense.status === 'Pending' && (
                        <button
                          onClick={() => setShowVerifyModal(expense)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Verify
                        </button>
                      )}
                      <button onClick={() => handleEditExpense(expense)} className="text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Summary Section */}
        {ledger.transactions.length > 0 && (
          <div className="mt-8 pt-4 border-t border-gray-100">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Recent Ledger Credits</h4>
            <div className="space-y-2">
              {ledger.transactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-xl">
                  <div>
                    <span className="font-medium">{tx.note}</span>
                    <span className="text-gray-400 text-xs ml-2">{tx.date}</span>
                  </div>
                  <span className="text-green-600 font-semibold">+₹{tx.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} onAdd={handleAddExpense} />}
        {showVerifyModal && <AdminVerifyModal expense={showVerifyModal} onClose={() => setShowVerifyModal(null)} onVerify={handleVerifyExpense} />}
      </AnimatePresence>
    </>
  );
};

export default ExpenseTab;