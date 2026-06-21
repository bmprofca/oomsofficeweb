import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiCalendar, FiDollarSign, FiPhone, FiEye, FiEdit, FiTrash2, FiCheckCircle, FiArrowLeft, FiUser, FiMail } from 'react-icons/fi';
import { checkPermissionSync } from '../utils/permission-helper';

const TaskCards = ({ 
    tasks, 
    selectedTasks, 
    handleTaskSelect, 
    loading,
    toggleRowDropdown,
    activeRowDropdown,
    handleGetInOut,
    setActiveRowDropdown,
    navigate,
    openStatusModal,
    openClientDetailsModal,
    handleEditTask,
    formatDate,
    getDaysLeft,
    getStatusColor,
    formatStatus
}) => {
    const SkeletonCard = () => (
        <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                        <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
    );

    return (
        <div className="p-3 md:p-4">
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonCard key={index} />
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-500 px-4">
                    <div className="text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiBriefcase className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-sm">No tasks found</p>
                        <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasks.map((task, index) => {
                        const daysLeft = getDaysLeft(task.dates?.due_date);
                        const isOverdue = daysLeft < 0;
                        const isSelected = selectedTasks.has(task.task_id);

                        return (
                            <motion.div
                                key={task.task_id}
                                className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                {/* Card Header */}
                                <div className="p-3 border-b border-gray-100">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {/* Toggle Switch instead of Checkbox */}
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isSelected}
                                                        onChange={() => handleTaskSelect(task.task_id)}
                                                    />
                                                    <div className={`w-7 h-3.5 ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[0.5px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${isSelected ? 'after:translate-x-3.5' : ''}`}></div>
                                                </label>
                                                
                                                <div className="font-bold text-gray-800 text-[11px] w-4">{index + 1}</div>
                                                
                                                <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                                    <FiBriefcase className="w-3 h-3 text-white" />
                                                </div>
                                                
                                                <div className="min-w-0">
                                                    <button
                                                        onClick={() => navigate(`/client/profile/${task.client?.username}`)}
                                                        className="font-semibold text-gray-800 text-[11px] truncate hover:text-indigo-600  text-left"
                                                    >
                                                        {task.client?.profile?.name || 'N/A'}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => navigate(`/task/${task.task_id}`)}
                                                className="text-left font-bold text-gray-800 text-[12px] truncate hover:text-indigo-600  w-full"
                                            >
                                                {task.service?.name || task.service_name || '-'}
                                            </button>
                                            
                                            <p className="text-gray-500 text-[10px] font-medium truncate">
                                                {task.firm?.firm_name || '-'}
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="relative">
                                                <motion.button
                                                    onClick={() => toggleRowDropdown(`card-${task.task_id}`)}
                                                    className="w-6 h-6 flex flex-col items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors space-y-0.5"
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                                </motion.button>
 
                                                <AnimatePresence>
                                                    {activeRowDropdown === `card-${task.task_id}` && (
                                                        <motion.div
                                                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                                                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                                        >
                                                            {/* <button 
                                                                onClick={() => { handleGetInOut(task.task_id, 'in'); setActiveRowDropdown(null); }} 
                                                                className="flex items-center w-full px-3 py-2.5 text-[11px] text-indigo-600 hover:bg-indigo-50 font-semibold"
                                                            >
                                                                <FiArrowLeft className="mr-2 w-3.5 h-3.5" /> GET IN
                                                            </button> */}
                                                            
                                                            {/* <div className="border-t my-1"></div> */}
                                                            
                                                            <button 
                                                                onClick={() => { openStatusModal(task.task_id, task.status); setActiveRowDropdown(null); }} 
                                                                className="flex items-center w-full px-3 py-2.5 text-[11px] text-blue-600 hover:bg-blue-50 font-semibold"
                                                            >
                                                                <FiCheckCircle className="mr-2 w-3.5 h-3.5" /> Change Status
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => { setActiveRowDropdown(null); navigate(`/task/${task.task_id}`); }} 
                                                                className="flex items-center w-full px-3 py-2.5 text-[11px] text-gray-700 hover:bg-gray-100 font-semibold"
                                                            >
                                                                <FiEye className="mr-2 w-3.5 h-3.5" /> View Details
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => { setActiveRowDropdown(null); handleEditTask(task); }} 
                                                                className="flex items-center w-full px-3 py-2.5 text-[11px] text-gray-700 hover:bg-gray-100 font-semibold"
                                                            >
                                                                <FiEdit className="mr-2 w-3.5 h-3.5" /> Edit Task
                                                            </button>
                                                            
                                                            <div className="border-t my-1"></div>
                                                            
                                                            <button 
                                                                onClick={() => { setActiveRowDropdown(null); }} 
                                                                className="flex items-center w-full px-3 py-2.5 text-[11px] text-red-600 hover:bg-red-50 font-semibold"
                                                            >
                                                                <FiTrash2 className="mr-2 w-3.5 h-3.5" /> Delete Task
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </div>
 
                                {/* Card Body */}
                                <div className="p-3">
                                    <div className="space-y-2">
                                        {/* Target Date & Fees */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-gray-700 text-[11px]">
                                                <FiCalendar className="w-3 h-3 text-gray-400" />
                                                <span>Target: {task.dates?.target_date ? formatDate(task.dates.target_date) : '-'}</span>
                                            </div>
                                            <div className="text-[11px] font-bold text-indigo-600">
                                                <span className="inline-flex items-center gap-1">
                                                    <FiDollarSign className="w-2.5 h-2.5" />
                                                    {checkPermissionSync('task_fees_view') ? (
                                                        `₹${task.charges?.fees?.toLocaleString() || 0}`
                                                    ) : (
                                                        <span className="blur-[3.5px] select-none">₹99,999</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex items-center gap-1 text-gray-700 text-[11px] flex-wrap">
                                            <FiCalendar className="w-3 h-3 text-gray-400" />
                                            <span>Due: {task.dates?.due_date ? formatDate(task.dates.due_date) : '-'}</span>
                                            {task.dates?.due_date && (
                                                <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {isOverdue ? `Overdue by ${Math.abs(daysLeft)}d` : `Due in ${daysLeft}d`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Mobile */}
                                        <div className="flex items-center gap-1 text-gray-700 text-[11px]">
                                            <FiPhone className="w-3 h-3 text-gray-400" />
                                            <span>{task.client?.profile?.mobile || '-'}</span>
                                        </div>

                                        {/* File No */}
                                        <div className="text-[10px] text-gray-500 font-medium">
                                            File: {task.file_no || '-'}
                                        </div>

                                        {/* Status */}
                                        <div className="pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-medium text-gray-600">Status:</span>
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusColor(task.status)}`}>
                                                    {formatStatus(task.status)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TaskCards;