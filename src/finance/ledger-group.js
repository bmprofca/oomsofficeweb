import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../components/header';
import {
    FiPlus,
    FiEdit,
    FiEye,
    FiTrash2,
    FiSettings
} from 'react-icons/fi';

const LedgerGroup = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    
    // Form states
    const [formData, setFormData] = useState({
        group_name: '',
        parent_group: '',
        values: ''
    });
    
    const [editFormData, setEditFormData] = useState({
        group_id: '',
        group_name: '',
        parent_group: '',
        values: ''
    });

    // Parent group options
    const [parentGroups] = useState([
        { value: '', name: 'None (Primary Group)' },
        { value: 'capital_liabilities', name: 'Capital & Liabilities' },
        { value: 'assets', name: 'Assets' },
        { value: 'income', name: 'Income' },
        { value: 'expenses', name: 'Expenses' }
    ]);

    // Mock ledger groups data with values
    const [ledgerGroups, setLedgerGroups] = useState([
        // A. Capital & Liabilities
        { group_id: '1', serial: 'A', group_name: 'Capital & Liabilities', parent_group: '', values: '₹15,00,000.00' },
        { group_id: '2', serial: '1', group_name: 'Partners\' Capital Account', parent_group: 'capital_liabilities', values: '₹8,50,000.00' },
        { group_id: '3', serial: '2', group_name: 'Partners\' Current Account', parent_group: 'capital_liabilities', values: '₹1,20,000.00' },
        { group_id: '4', serial: '3', group_name: 'Reserves & Surplus', parent_group: 'capital_liabilities', values: '₹2,50,000.00' },
        { group_id: '5', serial: '4', group_name: 'Long-term Loans (Secured)', parent_group: 'capital_liabilities', values: '₹1,80,000.00' },
        { group_id: '6', serial: '5', group_name: 'Long-term Loans (Unsecured)', parent_group: 'capital_liabilities', values: '₹75,000.00' },
        { group_id: '7', serial: '6', group_name: 'Short-term Borrowings', parent_group: 'capital_liabilities', values: '₹45,000.00' },
        { group_id: '8', serial: '7', group_name: 'Trade Payables (Sundry Creditors)', parent_group: 'capital_liabilities', values: '₹1,25,000.00' },
        { group_id: '9', serial: '8', group_name: 'Duties & Taxes Payable', parent_group: 'capital_liabilities', values: '₹85,000.00' },
        { group_id: '10', serial: '9', group_name: 'Provisions', parent_group: 'capital_liabilities', values: '₹35,000.00' },
        { group_id: '11', serial: '10', group_name: 'Other Current Liabilities', parent_group: 'capital_liabilities', values: '₹25,000.00' },
        { group_id: '12', serial: '11', group_name: 'Suspense Account', parent_group: 'capital_liabilities', values: '₹10,000.00' },

        // B. Assets
        { group_id: '13', serial: 'B', group_name: 'Assets', parent_group: '', values: '₹15,00,000.00' },
        { group_id: '14', serial: '12', group_name: 'Fixed Assets', parent_group: 'assets', values: '₹7,50,000.00' },
        { group_id: '15', serial: '13', group_name: 'Intangible Assets', parent_group: 'assets', values: '₹1,50,000.00' },
        { group_id: '16', serial: '14', group_name: 'Capital Work-in-Progress', parent_group: 'assets', values: '₹2,00,000.00' },
        { group_id: '17', serial: '15', group_name: 'Investments (Non-Current)', parent_group: 'assets', values: '₹1,25,000.00' },
        { group_id: '18', serial: '16', group_name: 'Loans & Advances (Long-term)', parent_group: 'assets', values: '₹85,000.00' },
        { group_id: '19', serial: '17', group_name: 'Other Non-Current Assets', parent_group: 'assets', values: '₹45,000.00' },
        { group_id: '20', serial: '18', group_name: 'Inventories', parent_group: 'assets', values: '₹1,75,000.00' },
        { group_id: '21', serial: '19', group_name: 'Trade Receivables (Sundry Debtors)', parent_group: 'assets', values: '₹95,000.00' },
        { group_id: '22', serial: '20', group_name: 'Cash-in-Hand', parent_group: 'assets', values: '₹25,000.00' },
        { group_id: '23', serial: '21', group_name: 'Bank Accounts', parent_group: 'assets', values: '₹1,50,000.00' },
        { group_id: '24', serial: '22', group_name: 'Bank Deposits (Other than Current A/c)', parent_group: 'assets', values: '₹75,000.00' },
        { group_id: '25', serial: '23', group_name: 'Loans & Advances (Short-term)', parent_group: 'assets', values: '₹35,000.00' },
        { group_id: '26', serial: '24', group_name: 'Other Current Assets', parent_group: 'assets', values: '₹15,000.00' },

        // C. Income
        { group_id: '27', serial: 'C', group_name: 'Income', parent_group: '', values: '₹25,00,000.00' },
        { group_id: '28', serial: '25', group_name: 'Sales / Service Income', parent_group: 'income', values: '₹22,50,000.00' },
        { group_id: '29', serial: '26', group_name: 'Other Operating Income', parent_group: 'income', values: '₹1,75,000.00' },
        { group_id: '30', serial: '27', group_name: 'Other Non-Operating Income', parent_group: 'income', values: '₹75,000.00' },

        // Direct Expenses
        { group_id: '31', serial: 'D', group_name: 'Direct Expenses', parent_group: '', values: '₹18,50,000.00' },
        { group_id: '32', serial: '28', group_name: 'Purchases / Direct Expenses', parent_group: 'expenses', values: '₹12,00,000.00' },
        { group_id: '33', serial: '29', group_name: 'Employee Costs / Salary Expenses', parent_group: 'expenses', values: '₹3,50,000.00' },
        { group_id: '34', serial: '30', group_name: 'Administrative & General Expenses', parent_group: 'expenses', values: '₹1,25,000.00' },
        { group_id: '35', serial: '31', group_name: 'Selling & Distribution Expenses', parent_group: 'expenses', values: '₹85,000.00' },
        { group_id: '36', serial: '32', group_name: 'Depreciation & Amortization', parent_group: 'expenses', values: '₹45,000.00' },
        { group_id: '37', serial: '33', group_name: 'Finance Costs / Interest Paid', parent_group: 'expenses', values: '₹35,000.00' },
        { group_id: '38', serial: '34', group_name: 'Other Expenses', parent_group: 'expenses', values: '₹25,000.00' }
    ]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle create ledger group
    const handleCreateLedgerGroup = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            const newGroup = {
                group_id: (ledgerGroups.length + 1).toString(),
                serial: (ledgerGroups.length + 1).toString(),
                ...formData,
                values: '₹0.00'
            };

            setLedgerGroups(prev => [...prev, newGroup]);
            setFormData({
                group_name: '',
                parent_group: '',
                values: ''
            });
            setShowAddModal(false);
            setLoading(false);

            // Show success message
            alert('Ledger Group created successfully!');
        }, 1000);
    };

    // Handle edit ledger group
    const handleEditLedgerGroup = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            setLedgerGroups(prev => prev.map(group =>
                group.group_id === editFormData.group_id
                    ? {
                        ...group,
                        group_name: editFormData.group_name,
                        parent_group: editFormData.parent_group,
                        values: editFormData.values
                    }
                    : group
            ));

            setShowEditModal(false);
            setLoading(false);

            // Show success message
            alert('Ledger Group updated successfully!');
        }, 1000);
    };

    // Handle delete confirmation
    const handleDeleteConfirm = async () => {
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            setLedgerGroups(prev => prev.filter(group => group.group_id !== groupToDelete.group_id));
            setShowDeleteModal(false);
            setGroupToDelete(null);
            setLoading(false);

            // Show success message
            alert('Ledger Group deleted successfully!');
        }, 1000);
    };

    // Handle edit button click
    const handleEditClick = (group) => {
        setEditFormData({
            group_id: group.group_id,
            group_name: group.group_name,
            parent_group: group.parent_group,
            values: group.values
        });
        setShowEditModal(true);
    };

    // Handle delete button click
    const handleDeleteClick = (group) => {
        setGroupToDelete(group);
        setShowDeleteModal(true);
    };

    // Handle view button click
    const handleViewClick = (group) => {
        // Navigate to ledger group details page
        alert(`Viewing details for: ${group.group_name}`);
    };

    // Get parent group name
    const getParentGroupName = (parentValue) => {
        if (!parentValue) return 'PRIMARY GROUP';
        const parent = parentGroups.find(p => p.value === parentValue);
        return parent ? parent.name.toUpperCase() : parentValue.toUpperCase();
    };

    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden">
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

            <div className={`pt-16 transition-all duration-300 ease-in-out h-screen overflow-hidden ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full overflow-y-auto p-3">
                    <div className="max-w-7xl mx-auto">
                        {/* Main Card */}
                        <div className="bg-white rounded-md shadow-sm border border-slate-200">
                            {/* Card Header */}
                            <div className="border-b border-slate-200 px-4 py-3">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                                    <h5 className="text-lg font-semibold text-slate-800 mb-0">Ledger Groups</h5>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            <FiPlus className="w-4 h-4" />
                                            Add Group
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto p-2">
                                <table className="w-full text-sm table-bordered table-hover">
                                    <thead>
                                        <tr className="bg-slate-50 border-t border-slate-200">
                                            <th className="text-left p-3 font-medium text-slate-700">Serial</th>
                                            <th className="text-left p-3 font-medium text-slate-700">Group Name</th>
                                            <th className="text-left p-3 font-medium text-slate-700">Parent Group</th>
                                            <th className="text-right p-3 font-medium text-slate-700">Values</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerGroups.map((group, index) => (
                                            <tr
                                                key={group.group_id}
                                                className={`border-b border-slate-100 hover:bg-slate-50 ${
                                                    ['A', 'B', 'C', 'D'].includes(group.serial) ? 'bg-slate-50 font-semibold' : ''
                                                }`}
                                            >
                                                <td className="p-3 text-slate-600 font-medium">{group.serial}</td>
                                                <td className="p-3 text-slate-800 font-medium">{group.group_name}</td>
                                                <td className="p-3 text-slate-600">{getParentGroupName(group.parent_group)}</td>
                                                <td className="p-3 text-right text-green-600 font-medium">
                                                    {group.values}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewClick(group)}
                                                            className="text-blue-600 hover:text-blue-800 cursor-pointer p-1 rounded hover:bg-blue-50 transition-colors"
                                                            title="View Group"
                                                        >
                                                            <FiEye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditClick(group)}
                                                            className="text-green-600 hover:text-green-800 cursor-pointer p-1 rounded hover:bg-green-50 transition-colors"
                                                            title="Edit Group"
                                                        >
                                                            <FiEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(group)}
                                                            className="text-red-600 hover:text-red-800 cursor-pointer p-1 rounded hover:bg-red-50 transition-colors"
                                                            title="Delete Group"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Ledger Group Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                            <h3 className="text-lg font-semibold text-slate-800">Add New Ledger Group</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreateLedgerGroup} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    name="group_name"
                                    value={formData.group_name}
                                    onChange={handleInputChange}
                                    placeholder="Enter group name"
                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Group</label>
                                <select
                                    name="parent_group"
                                    value={formData.parent_group}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {parentGroups.map(group => (
                                        <option key={group.value} value={group.value}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Opening Value</label>
                                <input
                                    type="text"
                                    name="values"
                                    value={formData.values}
                                    onChange={handleInputChange}
                                    placeholder="Enter opening value"
                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-2 pt-4 sticky bottom-0 bg-white pb-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Submit'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Ledger Group Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                            <h3 className="text-lg font-semibold text-slate-800">Edit Ledger Group</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleEditLedgerGroup} className="p-4 space-y-4">
                            <input type="hidden" name="group_id" value={editFormData.group_id} />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    name="group_name"
                                    value={editFormData.group_name}
                                    onChange={handleEditInputChange}
                                    placeholder="Enter group name"
                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Group</label>
                                <select
                                    name="parent_group"
                                    value={editFormData.parent_group}
                                    onChange={handleEditInputChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {parentGroups.map(group => (
                                        <option key={group.value} value={group.value}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Value</label>
                                <input
                                    type="text"
                                    name="values"
                                    value={editFormData.values}
                                    onChange={handleEditInputChange}
                                    placeholder="Enter current value"
                                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-2 pt-4 sticky bottom-0 bg-white pb-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Submit'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-slate-800">Confirm Delete</h3>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                                <FiTrash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h4 className="text-lg font-medium text-slate-800 text-center mb-2">
                                Delete Ledger Group
                            </h4>
                            <p className="text-slate-600 text-center mb-6">
                                Are you sure you want to delete <strong>"{groupToDelete?.group_name}"</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LedgerGroup;