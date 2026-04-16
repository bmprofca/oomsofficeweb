import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Sidebar, Header } from '../components/header';
import {
    FiClipboard,
    FiMessageSquare,
    FiUsers,
    FiClock,
    FiCheckSquare,
    FiFile,
    FiDollarSign,
    FiCalendar,
    FiUser,
    FiBriefcase,
    FiHome,
    FiChevronRight,
    FiList
} from 'react-icons/fi';
import API_BASE_URL from "../utils/api-controller";
import getHeaders from "../utils/get-headers";
import axios from 'axios';

// Import tab components only
import DetailsTab from '../TaskComponent/DetailsTab';
import NotesTab from '../TaskComponent/NotesTab';
import StaffTab from '../TaskComponent/StaffTab';
import TimelogTab from '../TaskComponent/TimelogTab';
import SubtaskTab from '../TaskComponent/SubTaskTab';
import DocumentsTab from '../TaskComponent/DocumentTab';
import LedgerTab from '../TaskComponent/LedgerTab';

// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const TaskProfile = () => {
    const navigate = useNavigate();
    const { task_id, tab = 'details' } = useParams();
    
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previousTaskId, setPreviousTaskId] = useState(null);
    
    // Task data state from API
    const [taskData, setTaskData] = useState({
        task_id: "",
        client: {
            profile: {
                name: ""
            }
        },
        firm: {
            firm_name: ""
        },
        service: {
            name: ""
        },
        charges: {
            total: 0
        },
        dates: {
            due_date: "",
            create_date: ""
        },
        billing_status: "pending",
        status: "in process",
        create_by: {
            name: ""
        },
        is_recurring: false
    });

    // Fetch task data from API
    const fetchTaskData = useCallback(async (currentTaskId) => {
        const taskIdToFetch = currentTaskId || task_id;
        
        if (!taskIdToFetch) {
            setError('No task ID provided');
            setLoading(false);
            return;
        }

        const headers = getHeaders();
        if (!headers) {
            setError('Authentication headers missing. Please login again.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(
                `${API_BASE_URL}/task/details/profile?task_id=${encodeURIComponent(taskIdToFetch)}`,
                { headers }
            );

            if (response.data.success && response.data.data) {
                setTaskData(response.data.data);
            } else {
                setError(response.data.message || 'Failed to fetch task data');
            }
        } catch (err) {
            console.error('Error fetching task data:', err);
            setError('Failed to load task details');
        } finally {
            setLoading(false);
        }
    }, [task_id]);

    // Watch for URL changes
    useEffect(() => {
        if (task_id && task_id !== previousTaskId) {
            setPreviousTaskId(task_id);
            fetchTaskData(task_id);
        }
        
        if (task_id && !tab) {
            navigate(`/task/profile/${task_id}/details`, { replace: true });
        }
    }, [task_id, tab, previousTaskId, fetchTaskData, navigate]);

    // Animation variants
    const tabContentVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
    };

    // Profile tabs
    const profileTabs = [
        { id: 'details', name: 'Details', icon: FiClipboard },
        { id: 'notes', name: 'Notes', icon: FiMessageSquare },
        { id: 'staff', name: 'Staff', icon: FiUsers },
        { id: 'timelog', name: 'Timelog', icon: FiClock },
        { id: 'subtask', name: 'Subtask', icon: FiCheckSquare },
        { id: 'documents', name: 'Documents', icon: FiFile },
        { id: 'ledger', name: 'Ledger', icon: FiDollarSign }
    ];

    // Handle tab navigation
    const handleTabClick = (tabId) => {
        navigate(`/task/profile/${task_id}/${tabId}`);
    };

    // Handle navigation to task view
    const handleNavigateToTaskView = () => {
        navigate('/task/view');
    };

    // Render content based on active tab
    const renderTabContent = () => {
        switch (tab) {
            case 'details':
                return (
                    <motion.div
                        key="details"
                        variants={tabContentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <DetailsTab taskData={taskData} task_id={task_id} />
                    </motion.div>
                );
            case 'notes':
                return (
                    <motion.div
                        key="notes"
                        variants={tabContentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <NotesTab task_id={task_id} />
                    </motion.div>
                );
           case 'staff':
            return (
                <motion.div
                    key="staff"
                    variants={tabContentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <StaffTab taskId={task_id} />
                </motion.div>
            );
                
            case 'timelog':
                return (
                    <motion.div
                        key="timelog"
                        variants={tabContentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <TimelogTab task_id={task_id} />
                    </motion.div>
                );
            case 'subtask':
                return (
                    <motion.div
                        key="subtask"
                        variants={tabContentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <SubtaskTab task_id={task_id} />
                    </motion.div>
                );
            case 'documents':
                return (
                    <motion.div
                        key="documents"
                        variants={tabContentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <DocumentsTab task_id={task_id} />
                    </motion.div>
                );
            case 'ledger':
    return (
        <motion.div
            key="ledger"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <LedgerTab 
                task_id={task_id}
                clientId={taskData?.client?.username} // Pass client username from task data
                clientName={taskData?.client?.profile?.name} // Pass client name for display
            />
        </motion.div>
    );
            default:
                return null;
        }
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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
                    {/* Breadcrumbs */}
                    <motion.div 
                        className="mb-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <nav className="flex items-center text-sm text-gray-600">
                            <Link 
                                to="/" 
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            >
                                <FiHome className="w-4 h-4" />
                                <span>Dashboard</span>
                            </Link>
                            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                            <button
                                onClick={handleNavigateToTaskView}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            >
                                <FiList className="w-4 h-4" />
                                <span>Tasks</span>
                            </button>
                            <FiChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                            <span className="text-gray-900 font-medium truncate max-w-xs">
                                {taskData.service?.name || 'Task Details'}
                            </span>
                        </nav>
                    </motion.div>

                    {/* Loading State */}
                    {loading && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-600">Loading task details...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="text-center">
                                <p className="text-red-600 mb-4">{error}</p>
                                <button
                                    onClick={() => fetchTaskData(task_id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Task Profile Content */}
                    {!loading && !error && (
                        <>
                            {/* Simple Header Card */}
                            <motion.div 
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <motion.div 
                                            className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
                                            whileHover={{ scale: 1.05, rotate: 5 }}
                                        >
                                            <FiClipboard className="w-6 h-6 text-blue-600" />
                                        </motion.div>
                                        <div>
                                            <h1 className="text-xl font-bold text-gray-900">
                                                {taskData.service?.name || 'Task'}
                                            </h1>
                                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <FiUser className="w-3 h-3" />
                                                    {taskData.client?.profile?.name || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FiBriefcase className="w-3 h-3" />
                                                    {taskData.firm?.firm_name || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FiCalendar className="w-3 h-3" />
                                                    Due: {formatDate(taskData.dates?.due_date)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
                                        Total: ₹{taskData.charges?.total?.toLocaleString() || 0}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Simple Profile Tabs */}
                            <motion.div 
                                className="bg-white rounded-lg border border-gray-200 p-1 mb-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex overflow-x-auto">
                                    {profileTabs.map((tabItem) => {
                                        const Icon = tabItem.icon;
                                        const isActive = tab === tabItem.id;
                                        
                                        return (
                                            <motion.button
                                                key={tabItem.id}
                                                onClick={() => handleTabClick(tabItem.id)}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                                                    isActive 
                                                        ? 'bg-blue-100 text-blue-700' 
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                                }`}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {tabItem.name}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>

                            {/* Tab Content */}
                            <AnimatePresence mode="wait">
                                {renderTabContent()}
                            </AnimatePresence>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskProfile;