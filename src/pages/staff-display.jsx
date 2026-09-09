import React, { useState, useEffect, useRef, memo } from 'react';
import {
    FiSearch,
    FiCreditCard,
    FiUser,
    FiPlus,
    FiMail,
    FiPhone,
    FiUsers,
    FiRefreshCw,
    FiPower,
    FiEye,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '../components/header';
import getHeaders from "../utils/get-headers";
import BASE_URL from "../utils/api-controller";
import toast from 'react-hot-toast';
import AddStaffModal from '../components/Modals/AddStaffModal';
import StaffStatusOtpModal from '../components/Modals/StaffStatusOtpModal';
import ConfirmActionModal from '../components/ConfirmActionModal';
import TablePagination from '../components/TablePagination';
import EmailActionMenu from './broadcast/email/EmailActionMenu';



// Memoized ModalWrapper component to prevent re-renders
const ModalWrapper = memo(({ isOpen, onClose, title, children, size = 'max-w-md' }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className={`relative w-full ${size} bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}
                >
                    <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-slate-800 rounded-t-xl">
                        <h2 className="text-xl font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg transition-colors hover:bg-slate-100"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});


// Memoized StaffFormModal component for editing
const StaffFormModal = memo(({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onFormChange,
    isSubmitting,
    mode = 'edit'
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(e);
    };

    const handleInputChange = (field, value) => {
        onFormChange({ ...formData, [field]: value });
    };

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Staff Member"
            size="max-w-2xl"
        >
            <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 px-6 py-2">Personal Information</h3>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Guardian Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.guardian_name}
                                    onChange={(e) => handleInputChange('guardian_name', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="Enter guardian name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    PAN Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.pan_number}
                                    onChange={(e) => handleInputChange('pan_number', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="ABCDE1234F"
                                    maxLength="10"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 px-6 py-2">Contact Information</h3>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Mobile Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="+91 9876543210"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="email@company.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Emergency Contact
                                </label>
                                <input
                                    type="tel"
                                    value={formData.emergency_contact}
                                    onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="+91 9876543299"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 px-6 py-2">Employment Details</h3>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Designation <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.designation}
                                    onChange={(e) => handleInputChange('designation', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    required
                                >
                                    <option value="">Select Designation</option>
                                    <option value="Developer">Developer</option>
                                    <option value="Senior Developer">Senior Developer</option>
                                    <option value="Project Manager">Project Manager</option>
                                    <option value="UI/UX Designer">UI/UX Designer</option>
                                    <option value="Quality Assurance">Quality Assurance</option>
                                    <option value="DevOps Engineer">DevOps Engineer</option>
                                    <option value="Frontend Developer">Frontend Developer</option>
                                    <option value="Backend Developer">Backend Developer</option>
                                    <option value="HR Manager">HR Manager</option>
                                    <option value="Sales Executive">Sales Executive</option>
                                    <option value="Accountant">Accountant</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Monthly Salary <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.salary}
                                    onChange={(e) => handleInputChange('salary', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="50000"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Joining Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.joining_date}
                                    onChange={(e) => handleInputChange('joining_date', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 px-6 py-2">Additional Information</h3>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Address
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="Enter complete address"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Bank Account Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.bank_account}
                                    onChange={(e) => handleInputChange('bank_account', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="123456789012"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    IFSC Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.ifsc_code}
                                    onChange={(e) => handleInputChange('ifsc_code', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors bg-white shadow-sm"
                                    placeholder="HDFC0001234"
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div className="flex-shrink-0 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-b-xl">
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 border border-emerald-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center min-w-[120px] justify-center shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                            </>
                        ) : (
                            'Update Staff'
                        )}
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
});

StaffFormModal.displayName = 'StaffFormModal';

const StaffAvatar = ({ name, image }) => {
    const [failed, setFailed] = useState(false);
    const initials = String(name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    if (image && !failed) {
        return (
            <img
                src={image}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-cover bg-slate-100"
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-[11px] font-semibold text-white shadow-sm">
            {initials || <FiUser className="h-4 w-4" />}
        </div>
    );
};

// Main ViewStaff Component
const ViewStaff = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [staff, setStaff] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
    const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
    const [isDeleteStaffModalOpen, setIsDeleteStaffModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);

    // Status change OTP
    const [statusOtp, setStatusOtp] = useState({
        open: false,
        staff: null,
        newStatus: true,
        sending: false,
        confirming: false,
        otpSent: false,
        destinationMasked: null,
        error: null,
    });
    const [statusConfirm, setStatusConfirm] = useState({
        open: false,
        staff: null,
        newStatus: true,
    });

    // Resend link state
    const [resendingLink, setResendingLink] = useState(null);

    // Form states
    const [staffForm, setStaffForm] = useState({
        designation: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Initial data load
    useEffect(() => {
        fetchStaffData('', 1, itemsPerPage, true);
    }, []);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Function to transform API data to frontend format based on is_accepted status
    const transformStaffData = (apiData) => {
        return apiData.map((staffMember, index) => {
            const isAccepted = staffMember.is_accepted === true;
            const profile = staffMember.profile || {};

            // For accepted staff: Use full profile data
            if (isAccepted) {
                return {
                    id: staffMember.map_id || (index + 1).toString(),
                    username: staffMember.username || '',
                    name: profile.name || 'Unknown',
                    guardian_name: profile.guardian_name || profile.care_of || '',
                    mobile: profile.mobile ? `${profile.country_code || '+91'} ${profile.mobile}` : 'N/A',
                    email: profile.email || 'N/A',
                    designation: staffMember.designation || 'Not Assigned',
                    loan: '0',
                    balance: staffMember.balance || '0',
                    address: profile.address ?
                        `${profile.address.address_line_1 || ''} ${profile.address.address_line_2 || ''} ${profile.address.city || ''} ${profile.address.state || ''}`.trim()
                        : '',
                    salary: staffMember.salary || '0',
                    joining_date: staffMember.modify_date || new Date().toISOString().split('T')[0],
                    emergency_contact: '',
                    bank_account: '',
                    ifsc_code: '',
                    pan_number: '',
                    is_accepted: isAccepted,
                    status: isAccepted ? 'Accepted' : 'Pending',
                    is_active: staffMember.status === true,
                    image: profile.image || '',
                };
            }
            // For non-accepted staff: Use basic info only
            else {
                return {
                    id: staffMember.map_id || (index + 1).toString(),
                    username: staffMember.username || '',
                    name: profile.name || 'Unknown',
                    guardian_name: '',
                    mobile: '', // Hide mobile for non-accepted
                    email: profile.email || 'N/A',
                    designation: staffMember.designation || 'Not Assigned',
                    loan: '0',
                    balance: '0',
                    address: '',
                    salary: '',
                    joining_date: '',
                    emergency_contact: '',
                    bank_account: '',
                    ifsc_code: '',
                    pan_number: '',
                    is_accepted: isAccepted,
                    status: isAccepted ? 'Accepted' : 'Pending',
                    is_active: staffMember.status === true,
                    image: profile.image || '',
                };
            }
        });
    };

    // API call to fetch staff data with search, page, limit
    const fetchStaffData = async (search = '', page = 1, limit = 20, isInitial = false) => {
        if (isInitial) {
            setLoading(true);
        } else {
            setTableLoading(true);
        }

        const headers = getHeaders();
        if (!headers) {
            console.error('Authentication headers not found');
            setLoading(false);
            setTableLoading(false);
            return;
        }

        try {
            const encodedSearch = encodeURIComponent(search.trim());
            const response = await fetch(
                `${BASE_URL}/settings/staff/list?search=${encodedSearch}&page=${page}&limit=${limit}`,
                { method: 'GET', headers }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data && Array.isArray(data.data)) {
                setStaff(transformStaffData(data.data));
                const meta = data.meta || {};
                const total = meta.total ?? 0;
                setTotalItems(total);
                setTotalPages(Math.max(1, meta.total_pages ?? Math.ceil(total / limit)));
            } else {
                setStaff([]);
                setTotalItems(0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error fetching staff data:', error);
            setStaff([]);
            setTotalItems(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
            setTableLoading(false);
        }
    };

    // Separate mount-skip refs for each effect
    const isSearchEffectMount = useRef(true);
    const isPageEffectMount = useRef(true);

    // Page / limit change → immediate refetch
    useEffect(() => {
        if (isPageEffectMount.current) { isPageEffectMount.current = false; return; }
        fetchStaffData(searchQuery, currentPage, itemsPerPage);
    }, [currentPage, itemsPerPage]);

    // Search change → debounce 400ms, reset to page 1
    useEffect(() => {
        if (isSearchEffectMount.current) { isSearchEffectMount.current = false; return; }
        const t = setTimeout(() => {
            setCurrentPage(1);
            fetchStaffData(searchQuery, 1, itemsPerPage);
        }, 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Page-change handler (clamped, clears jump input)
    const handlePageChange = (newPage) => {
        const page = Math.max(1, Math.min(totalPages, Math.floor(newPage)));
        if (page !== currentPage) setCurrentPage(page);
    };

    const handleLimitChange = (newLimit) => {
        setItemsPerPage(newLimit);
        setCurrentPage(1);
    };

    // Enter key on search → immediate fetch without waiting for debounce
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            fetchStaffData(searchQuery, 1, itemsPerPage);
        }
    };

    const closeStatusOtp = () => {
        setStatusOtp({
            open: false,
            staff: null,
            newStatus: true,
            sending: false,
            confirming: false,
            otpSent: false,
            destinationMasked: null,
            error: null,
        });
    };

    const closeStatusConfirm = () => {
        setStatusConfirm({
            open: false,
            staff: null,
            newStatus: true,
        });
    };

    const openStatusConfirm = (staffMember, newStatus) => {
        setStatusConfirm({
            open: true,
            staff: staffMember,
            newStatus,
        });
    };

    const handleStatusConfirm = () => {
        const staffMember = statusConfirm.staff;
        const newStatus = statusConfirm.newStatus;
        closeStatusConfirm();
        if (staffMember) sendStatusOtp(staffMember, newStatus);
    };

    const sendStatusOtp = async (staffMember, newStatus) => {
        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication required. Please login again.');
            return;
        }
        setStatusOtp({
            open: true,
            staff: staffMember,
            newStatus,
            sending: true,
            confirming: false,
            otpSent: false,
            destinationMasked: null,
            error: null,
        });
        try {
            const response = await fetch(`${BASE_URL}/settings/staff/change-status/send-otp`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    username: staffMember.username,
                    status: newStatus ? 'active' : 'deactive',
                }),
            });
            const data = await response.json();
            if (data.success) {
                setStatusOtp((prev) => ({
                    ...prev,
                    sending: false,
                    otpSent: true,
                    destinationMasked: data.destination_masked || data.mobile_masked || null,
                    error: null,
                }));
                toast.success(data.message || 'OTP sent to your registered mobile number');
            } else {
                setStatusOtp((prev) => ({
                    ...prev,
                    sending: false,
                    otpSent: false,
                    error: data.message || 'Failed to send OTP',
                }));
            }
        } catch (error) {
            setStatusOtp((prev) => ({
                ...prev,
                sending: false,
                otpSent: false,
                error: 'Failed to send OTP',
            }));
        }
    };

    const confirmStatusChange = async ({ otp }) => {
        const targetStaff = statusOtp.staff;
        if (!targetStaff) return;
        const headers = getHeaders();
        if (!headers) {
            setStatusOtp((prev) => ({ ...prev, confirming: false, error: 'Authentication required' }));
            return;
        }
        setStatusOtp((prev) => ({ ...prev, confirming: true, error: null }));
        try {
            const statusString = statusOtp.newStatus ? 'active' : 'deactive';
            const response = await fetch(`${BASE_URL}/settings/staff/change-status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    username: targetStaff.username,
                    status: statusString,
                    otp,
                }),
            });
            const data = await response.json();
            if (data.success) {
                const updatedIsActive = data.data?.status === 'active';
                setStaff((prev) =>
                    prev.map((m) => (m.username === targetStaff.username ? { ...m, is_active: updatedIsActive } : m)),
                );
                toast.success(data.message || `Staff status updated to ${statusString} successfully`);
                closeStatusOtp();
            } else {
                setStatusOtp((prev) => ({
                    ...prev,
                    confirming: false,
                    error: data.message || 'Failed to update staff status',
                }));
            }
        } catch (error) {
            setStatusOtp((prev) => ({
                ...prev,
                confirming: false,
                error: 'An error occurred while updating status',
            }));
        }
    };

    // Handle edit staff
    const handleEditStaff = async (e) => {
        e.preventDefault();
        if (isSubmitting || !selectedStaff) return;

        setIsSubmitting(true);
        try {
            // In a real implementation, you would call an API here
            // For now, we'll just update the local state
            setStaff(prev => prev.map(staffMember =>
                staffMember.id === selectedStaff.id
                    ? { ...staffMember, ...staffForm }
                    : staffMember
            ));

            setIsEditStaffModalOpen(false);
            resetForm();

            console.log('Staff updated successfully:', selectedStaff.id);
        } catch (error) {
            console.error('Error updating staff:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete staff
    const handleDeleteStaff = async () => {
        if (isSubmitting || !selectedStaff) return;

        setIsSubmitting(true);
        try {
            setStaff(prev => prev.filter(staffMember => staffMember.id !== selectedStaff.id));
            setIsDeleteStaffModalOpen(false);
        } catch (error) {
            console.error('Error deleting staff:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle resend invitation link
    const handleResendInvitation = async (staffMember) => {
        if (resendingLink === staffMember.username) return;

        setResendingLink(staffMember.username);

        const headers = getHeaders();
        if (!headers) {
            toast.error('Authentication required. Please login again.');
            setResendingLink(null);
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/settings/staff/resend-invitation`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    username: staffMember.username
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Invitation link has been resent successfully!');
            } else {
                toast.error(data.message || 'Failed to resend invitation');
            }
        } catch (error) {
            console.error('Error resending invitation:', error);
            toast.error('An error occurred while resending invitation');
        } finally {
            setResendingLink(null);
        }
    };

    // Open edit modal
    const openEditModal = (staffMember) => {
        setSelectedStaff(staffMember);
        setStaffForm({
            name: staffMember.name,
            guardian_name: staffMember.guardian_name,
            mobile: staffMember.mobile,
            email: staffMember.email,
            designation: staffMember.designation,
            address: staffMember.address,
            salary: staffMember.salary,
            joining_date: staffMember.joining_date,
            emergency_contact: staffMember.emergency_contact || '',
            bank_account: staffMember.bank_account || '',
            ifsc_code: staffMember.ifsc_code || '',
            pan_number: staffMember.pan_number || ''
        });
        setIsEditStaffModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (staffMember) => {
        setSelectedStaff(staffMember);
        setIsDeleteStaffModalOpen(true);
    };

    // Reset form
    const resetForm = () => {
        setStaffForm({
            designation: ''
        });
        setSelectedStaff(null);
    };

    // Row offset for serial number (server-paginated)
    const rowOffset = (currentPage - 1) * itemsPerPage;

    const getStaffActionItems = (staffMember) => {
        const isAccepted = staffMember.is_accepted === true;
        const items = [];
        if (isAccepted) {
            items.push({
                label: 'View Profile',
                icon: FiEye,
                onClick: () => navigate(`/staff/view/profile/${encodeURIComponent(staffMember.username)}/profile`),
            });
            items.push({
                label: 'Ledger',
                icon: FiCreditCard,
                onClick: () => navigate(`/staff/view/profile/${encodeURIComponent(staffMember.username)}/ledger`),
            });
        } else {
            items.push({
                label: resendingLink === staffMember.username ? 'Resending...' : 'Resend Invitation',
                icon: FiRefreshCw,
                disabled: resendingLink === staffMember.username,
                onClick: () => handleResendInvitation(staffMember),
            });
        }
        items.push({
            label: staffMember.is_active ? 'Set Deactive' : 'Set Active',
            icon: FiPower,
            warning: Boolean(staffMember.is_active),
            onClick: () => openStatusConfirm(staffMember, !staffMember.is_active),
        });
        return items;
    };

    const tableHeadClass = 'p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide whitespace-nowrap';

    // Show skeleton while loading
    if (loading) {
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
                <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                    <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="border-b border-gray-200 px-4 py-4">
                                <div className="h-5 w-40 rounded bg-gray-200 animate-pulse mb-2" />
                                <div className="h-3 w-56 rounded bg-gray-100 animate-pulse" />
                            </div>
                            <div className="p-4 space-y-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                                ))}
                            </div>
                        </div>
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

            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h5 className="text-lg sm:text-xl font-bold text-gray-800 mb-0.5">
                                            Staff Members
                                        </h5>
                                        <p className="text-gray-500 text-xs">
                                            {totalItems} staff member{totalItems === 1 ? '' : 's'} total
                                        </p>
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={() => setIsAddStaffModalOpen(true)}
                                        className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiPlus className="w-4 h-4" />
                                        Add Staff
                                    </motion.button>
                                </div>
                                <div className="relative min-w-0">
                                    <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Search by name, mobile, email..."
                                        className="w-full min-w-0 rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className={`${tableHeadClass} text-center w-14`}>#</th>
                                        <th className={`${tableHeadClass} text-left`}>Staff</th>
                                        <th className={`${tableHeadClass} text-left`}>Contact</th>
                                        <th className={`${tableHeadClass} text-center`}>Invitation</th>
                                        <th className={`${tableHeadClass} text-center`}>Status</th>
                                        <th className={`${tableHeadClass} text-center`}>Balance</th>
                                        <th className={`${tableHeadClass} text-center`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tableLoading ? (
                                        Array.from({ length: Math.min(itemsPerPage, 8) }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="p-3"><div className="mx-auto h-4 w-6 rounded bg-gray-200" /></td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-200" />
                                                        <div className="space-y-2">
                                                            <div className="h-3 w-32 rounded bg-gray-200" />
                                                            <div className="h-2 w-24 rounded bg-gray-100" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-28 rounded bg-gray-200" />
                                                        <div className="h-3 w-36 rounded bg-gray-100" />
                                                    </div>
                                                </td>
                                                <td className="p-3"><div className="mx-auto h-7 w-20 rounded-lg bg-gray-200" /></td>
                                                <td className="p-3"><div className="mx-auto h-7 w-20 rounded-lg bg-gray-200" /></td>
                                                <td className="p-3"><div className="mx-auto h-7 w-16 rounded-lg bg-gray-200" /></td>
                                                <td className="p-3"><div className="mx-auto h-8 w-8 rounded bg-gray-200" /></td>
                                            </tr>
                                        ))
                                    ) : staff.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center">
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <FiUsers className="w-16 h-16 text-gray-300 mb-4" />
                                                    <p className="text-gray-500 text-sm font-medium mb-1">No staff members found</p>
                                                    <p className="text-gray-400 text-xs mb-6">Try adding a new staff member or adjust your search</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddStaffModalOpen(true)}
                                                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm"
                                                    >
                                                        <FiPlus className="w-4 h-4 inline mr-2" />
                                                        Add New Staff
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        staff.map((staffMember, index) => {
                                            const actualIndex = rowOffset + index;
                                            const isAccepted = staffMember.is_accepted === true;
                                            return (
                                                <tr key={staffMember.id || staffMember.username} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 text-center align-middle">
                                                        <span className="text-[11px] font-bold text-gray-800">{actualIndex + 1}</span>
                                                    </td>
                                                    <td className="p-3 align-middle">
                                                        <div className="flex items-center gap-2 sm:gap-3 min-w-[10rem]">
                                                            <StaffAvatar name={staffMember.name} image={staffMember.image} />
                                                            <div className="min-w-0">
                                                                {isAccepted ? (
                                                                    <Link
                                                                        to={`/staff/view/profile/${encodeURIComponent(staffMember.username)}/profile`}
                                                                        className="block truncate text-sm font-semibold text-indigo-700 no-underline hover:text-indigo-900 hover:no-underline"
                                                                    >
                                                                        {staffMember.name}
                                                                    </Link>
                                                                ) : (
                                                                    <span className="block truncate text-sm font-semibold text-gray-800">
                                                                        {staffMember.name}
                                                                    </span>
                                                                )}
                                                                <div className="text-xs text-gray-400 mt-0.5">{staffMember.designation || '—'}</div>
                                                                {isAccepted && staffMember.guardian_name ? (
                                                                    <div className="text-xs text-gray-500 font-medium">C/O: {staffMember.guardian_name}</div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 align-middle">
                                                        <div className="space-y-1 min-w-[8rem]">
                                                            {isAccepted ? (
                                                                <div className="flex items-center gap-2 text-gray-800 text-sm font-medium">
                                                                    <FiPhone className="w-3 h-3 shrink-0 text-gray-400" />
                                                                    {staffMember.mobile || '—'}
                                                                </div>
                                                            ) : null}
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <FiMail className="w-3 h-3 shrink-0 text-gray-400" />
                                                                <span className="truncate">{staffMember.email || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg min-w-[80px] border text-xs font-bold ${
                                                            isAccepted
                                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200'
                                                                : 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {isAccepted ? 'Accepted' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <span className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg min-w-[80px] border text-xs font-bold ${
                                                            staffMember.is_active
                                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200'
                                                                : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${staffMember.is_active ? 'bg-blue-500' : 'bg-red-500'}`} />
                                                            {staffMember.is_active ? 'Active' : 'Deactive'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        {isAccepted ? (
                                                            <Link
                                                                to={`/staff/view/profile/${encodeURIComponent(staffMember.username)}/ledger`}
                                                                className="inline-block no-underline hover:no-underline"
                                                            >
                                                                <span className="inline-flex items-center justify-center bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg min-w-[80px] border border-green-200">
                                                                    ₹{formatCurrency(parseInt(staffMember.balance, 10) || 0)}
                                                                </span>
                                                            </Link>
                                                        ) : (
                                                            <span className="inline-flex items-center justify-center bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-lg min-w-[80px] border border-gray-200">
                                                                N/A
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center align-middle">
                                                        <div className="flex justify-center items-center">
                                                            <EmailActionMenu items={getStaffActionItems(staffMember)} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <TablePagination
                            page={currentPage}
                            limit={itemsPerPage}
                            total={totalItems}
                            totalPages={totalPages}
                            rowOptions={[5, 10, 20, 50, 100]}
                            defaultRows={20}
                            onPageChange={handlePageChange}
                            onLimitChange={handleLimitChange}
                        />
                    </div>
                </div>
            </div>

            {/* Add Staff Modal */}
            <AddStaffModal
                isOpen={isAddStaffModalOpen}
                onClose={() => setIsAddStaffModalOpen(false)}
                onSuccess={() => fetchStaffData(searchQuery, currentPage, itemsPerPage)}
            />

            {/* Edit Staff Modal */}
            <StaffFormModal
                isOpen={isEditStaffModalOpen}
                onClose={() => {
                    setIsEditStaffModalOpen(false);
                    resetForm();
                }}
                onSubmit={handleEditStaff}
                formData={staffForm}
                onFormChange={setStaffForm}
                isSubmitting={isSubmitting}
                mode="edit"
            />

            <ConfirmActionModal
                isOpen={statusConfirm.open}
                title={statusConfirm.newStatus ? 'Activate Staff' : 'Deactivate Staff'}
                heading={
                    statusConfirm.newStatus
                        ? `Activate ${statusConfirm.staff?.name || 'this staff'}?`
                        : `Deactivate ${statusConfirm.staff?.name || 'this staff'}?`
                }
                message="An OTP will be sent to your registered mobile number to confirm this change."
                confirmLabel="Confirm"
                cancelLabel="Cancel"
                tone={statusConfirm.newStatus ? 'primary' : 'warning'}
                icon={FiPower}
                onCancel={closeStatusConfirm}
                onConfirm={handleStatusConfirm}
            />
            <StaffStatusOtpModal
                isOpen={statusOtp.open}
                staffName={statusOtp.staff?.name || ''}
                newStatus={statusOtp.newStatus}
                destinationMasked={statusOtp.destinationMasked}
                otpSent={statusOtp.otpSent}
                sending={statusOtp.sending}
                confirming={statusOtp.confirming}
                error={statusOtp.error}
                onConfirm={confirmStatusChange}
                onCancel={closeStatusOtp}
                onResend={() => {
                    if (statusOtp.staff) sendStatusOtp(statusOtp.staff, statusOtp.newStatus);
                }}
            />

        </div>
    );
};

export default ViewStaff;