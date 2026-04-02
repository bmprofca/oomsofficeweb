import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    FiPlus, 
    FiTrash2, 
    FiUsers, 
    FiLoader, 
    FiSearch,
    FiEye,
    FiX,
    FiMail,
    FiPhone,
    FiUser,
    FiBriefcase,
    FiCheckCircle,
    FiClock,
    FiAward
} from 'react-icons/fi';
import getHeaders from "../utils/get-headers";
import API_BASE_URL from "../utils/api-controller";
import toast from 'react-hot-toast';

const StaffTab = ({ taskId, staff = [], onAddStaff, onRemoveStaff }) => {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedStaffMember, setSelectedStaffMember] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Fetch staff list when component mounts or taskId changes
    useEffect(() => {
        if (taskId) {
            fetchStaffList();
        }
    }, [taskId]);

    // Update local state when staff prop changes
    useEffect(() => {
        if (staff && staff.length > 0) {
            setStaffList(staff);
        }
    }, [staff]);

    // Search staff with debounce
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchQuery.trim().length > 1) {
                searchStaff();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Fetch staff list from API
    const fetchStaffList = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/task/details/staff/list?task_id=${taskId}`,
                {
                    headers: getHeaders()
                }
            );
            const data = await response.json();
            
            if (data.success) {
                // Transform API response to match component structure
                const transformedStaff = data.data.map(item => ({
                    id: item.assign_id,
                    assign_id: item.assign_id,
                    username: item.staff.username,
                    name: item.staff.profile?.name || item.staff.username,
                    email: item.staff.profile?.email || 'No email',
                    mobile: item.staff.profile?.mobile || 'No mobile',
                    country_code: item.staff.profile?.country_code || '',
                    designation: item.staff.designation || 'Staff',
                    task_id: item.task_id,
                    create_date: item.create_date,
                    create_by: item.create_by,
                    modify_date: item.modify_date,
                    modify_by: item.modify_by
                }));
                setStaffList(transformedStaff);
            }
        } catch (error) {
            console.error('Error fetching staff list:', error);
            toast.error('Failed to fetch staff list');
        } finally {
            setLoading(false);
        }
    };

    // Search staff by name
    const searchStaff = async () => {
        if (!searchQuery.trim()) return;
        
        setSearchLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/settings/staff/search-by-name?name=${encodeURIComponent(searchQuery)}`,
                {
                    headers: getHeaders()
                }
            );
            const data = await response.json();
            
            if (data.success) {
                // Transform search results based on the actual API response
                const transformedResults = (data.data || []).map(item => ({
                    map_id: item.map_id,
                    username: item.username,
                    name: item.profile?.name || item.username,
                    email: item.profile?.email || 'No email',
                    mobile: item.profile?.mobile || 'No mobile',
                    country_code: item.profile?.country_code || '',
                    designation: item.designation || 'Staff',
                    is_accepted: item.is_accepted,
                    status: item.status,
                    branch: item.branch,
                    metadata: item.metadata,
                    profile: item.profile
                }));
                setSearchResults(transformedResults);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching staff:', error);
            toast.error('Failed to search staff');
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    // Handle assign staff using PUT API
    const handleAssignStaff = async () => {
        if (selectedStaff.length === 0) {
            toast.error('Please select at least one staff member');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Assigning staff...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/task/details/staff/update`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    task_id: taskId,
                    staff_ids: selectedStaff
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`${selectedStaff.length} staff member(s) assigned successfully`, { id: toastId });
                // Refresh staff list
                await fetchStaffList();
                setShowAddModal(false);
                setSelectedStaff([]);
                setSearchQuery('');
                setSearchResults([]);
                
                // Call onAddStaff callback if provided
                if (onAddStaff) {
                    onAddStaff(data.data);
                }
            } else {
                toast.error(data.message || 'Failed to assign staff', { id: toastId });
            }
        } catch (error) {
            console.error('Error assigning staff:', error);
            toast.error('Error assigning staff. Please try again.', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    // Handle remove staff
    const handleRemoveStaff = async (assignId, staffName) => {
        if (window.confirm(`Are you sure you want to remove ${staffName} from this task?`)) {
            // Note: You'll need to implement the delete endpoint
            // For now, just call the callback
            if (onRemoveStaff) {
                onRemoveStaff(assignId);
            }
            
            // Optimistically update UI
            setStaffList(prev => prev.filter(member => member.id !== assignId));
            toast.success('Staff member removed successfully');
        }
    };

    // View staff details
    const viewStaffDetails = (member) => {
        setSelectedStaffMember(member);
        setShowViewModal(true);
    };

    // Toggle staff selection
    const toggleStaffSelection = (username) => {
        setSelectedStaff(prev => 
            prev.includes(username)
                ? prev.filter(id => id !== username)
                : [...prev, username]
        );
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <FiUsers className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Assigned Staff</h3>
                                <p className="text-sm text-gray-500">
                                    {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} assigned
                                </p>
                            </div>
                        </div>
                        <motion.button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                        >
                            <FiPlus className="w-4 h-4" />
                            Assign Staff
                        </motion.button>
                    </div>
                </div>

                {/* Staff Table */}
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="text-center">
                            <FiLoader className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                            <p className="text-gray-500">Loading staff list...</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {staffList && staffList.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Staff Member
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Designation
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Assigned On
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {staffList.map((member, index) => (
                                        <motion.tr
                                            key={member.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                        <FiUser className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {member.name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <FiAward className="w-4 h-4 text-indigo-400" />
                                                    <span className="text-sm text-gray-600">{member.designation}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FiMail className="w-4 h-4 text-gray-400" />
                                                    <span>{member.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                    <FiPhone className="w-4 h-4 text-gray-400" />
                                                    <span>{member.country_code} {member.mobile}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {formatDate(member.create_date)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    by {member.create_by?.name || 'Unknown'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <motion.button
                                                        onClick={() => viewStaffDetails(member)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title="View Details"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </motion.button>
                                                    <motion.button
                                                        onClick={() => handleRemoveStaff(member.id, member.name)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title="Remove"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <FiUsers className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                                <p className="text-lg font-medium text-gray-700 mb-1">No staff assigned</p>
                                <p className="text-sm text-gray-500 mb-4">Click the button above to assign staff members to this task.</p>
                                <motion.button
                                    onClick={() => setShowAddModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Assign Staff
                                </motion.button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Assign Staff to Task</h3>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSelectedStaff([]);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FiX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Search Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Staff Members
                                </label>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Type name to search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    {searchLoading && (
                                        <FiLoader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-600 animate-spin" />
                                    )}
                                </div>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search Results
                                    </label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                        {searchResults.map((staff) => (
                                            <motion.div
                                                key={staff.username}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                                    selectedStaff.includes(staff.username)
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                                }`}
                                                onClick={() => toggleStaffSelection(staff.username)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                            <FiUser className="w-5 h-5 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{staff.name}</div>
                                                            <div className="flex items-center gap-1 text-xs text-indigo-600 mb-1">
                                                                <FiAward className="w-3 h-3" />
                                                                <span>{staff.designation}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <FiMail className="w-3 h-3" /> {staff.email}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <FiPhone className="w-3 h-3" /> {staff.country_code} {staff.mobile}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedStaff.includes(staff.username) && (
                                                        <FiCheckCircle className="w-5 h-5 text-indigo-600" />
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selected Staff Preview */}
                            {selectedStaff.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Selected Staff ({selectedStaff.length})
                                    </label>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex flex-wrap gap-2">
                                            {selectedStaff.map(username => {
                                                const staffInfo = searchResults.find(s => s.username === username);
                                                return (
                                                    <span 
                                                        key={username}
                                                        className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm"
                                                    >
                                                        {staffInfo?.name || username}
                                                        {staffInfo?.designation && ` (${staffInfo.designation})`}
                                                        <button
                                                            onClick={() => toggleStaffSelection(username)}
                                                            className="hover:text-indigo-900"
                                                        >
                                                            <FiX className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <motion.button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSelectedStaff([]);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={submitting}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                onClick={handleAssignStaff}
                                disabled={selectedStaff.length === 0 || submitting}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {submitting ? (
                                    <>
                                        <FiLoader className="w-4 h-4 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    'Assign Staff'
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* View Staff Modal - Compact Version with Designation */}
            {showViewModal && selectedStaffMember && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-xl max-w-sm w-full"
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-base font-semibold text-gray-900">Staff Details</h3>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FiX className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body - Compact with Designation */}
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <FiUser className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-base font-semibold text-gray-900 truncate">{selectedStaffMember.name}</h4>
                                    <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                                        <FiAward className="w-3 h-3" />
                                        <span>{selectedStaffMember.designation}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <FiMail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-600 truncate">{selectedStaffMember.email}</span>
                                </div>

                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <FiPhone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-600">
                                        {selectedStaffMember.country_code} {selectedStaffMember.mobile}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <FiBriefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-600">{selectedStaffMember.designation}</span>
                                </div>

                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <FiClock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-600">
                                        {formatDate(selectedStaffMember.create_date)}
                                    </span>
                                </div>

                                {selectedStaffMember.create_by && (
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                        <FiUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-600">
                                            By: {selectedStaffMember.create_by?.name || 'Unknown'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer - Compact */}
                        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
                            <motion.button
                                onClick={() => setShowViewModal(false)}
                                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Close
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default StaffTab;