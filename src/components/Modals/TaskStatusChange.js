import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiClock, FiEye, FiLoader, FiX, FiXCircle } from 'react-icons/fi';

const TaskStatusChange = ({ isOpen, onClose, taskId, taskName = '', currentStatus, onStatusChange, statusOptions = [] }) => {
    const [selectedStatus, setSelectedStatus] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedStatus('');
        }
    }, [currentStatus, isOpen]);

    const getStatusColor = (status) => ({
        unassign: 'bg-blue-100 text-blue-700',
        'in process': 'bg-orange-100 text-orange-700',
        'pending from client': 'bg-purple-100 text-purple-700',
        'pending from department': 'bg-yellow-100 text-yellow-700',
        complete: 'bg-green-100 text-green-700',
        cancel: 'bg-red-100 text-red-700'
    }[status] || 'bg-gray-100 text-gray-700');

    const getStatusIcon = (status) => ({
        unassign: <FiClock />,
        'in process': <FiLoader />,
        'pending from client': <FiEye />,
        'pending from department': <FiXCircle />,
        complete: <FiCheckCircle />,
        cancel: <FiXCircle />
    }[status] || <FiClock />);

    const handleConfirm = async () => {
        setLoading(true);
        await onStatusChange(taskId, selectedStatus);
        setLoading(false);
        onClose();
    };

    const visibleStatusOptions = statusOptions.filter((status) => status.value !== 'unassign');

    const showFinalStatusWarning = selectedStatus === 'complete';
    const isUpdateDisabled = loading || !selectedStatus;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden max-h-[82vh] flex flex-col"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                        <FiCheckCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold">Change Status</h3>
                                        <p className="text-indigo-100 text-xs truncate max-w-[210px]">{taskName || '-'}</p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="text-white p-1 rounded-lg hover:bg-white/10"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>

                        <div className="p-4 border-b border-gray-200 overflow-y-auto">
                            <div className="mb-2">
                                <div className="space-y-1.5">
                                    {visibleStatusOptions.map((status) => {
                                        const isCurrentStatus = status.value === currentStatus;
                                        const isBlockedByCompleteRule = currentStatus === 'complete' && status.value !== 'complete';
                                        const isDisabled = isCurrentStatus || isBlockedByCompleteRule;
                                        const isSelected = selectedStatus === status.value;
                                        return (
                                            <motion.button
                                                key={status.value}
                                                onClick={() => !isDisabled && setSelectedStatus(status.value)}
                                                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${isSelected ? 'ring-1 ring-indigo-500' : ''
                                                    } ${getStatusColor(status.value)} ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                disabled={isDisabled}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(status.value)}
                                                    <span className="font-medium text-sm">{status.name}</span>
                                                </div>
                                                {isCurrentStatus ? (
                                                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold">
                                                        <FiCheckCircle className="w-3.5 h-3.5" />
                                                        Current
                                                    </div>
                                                ) : (
                                                    isSelected && <FiCheckCircle className="w-4 h-4" />
                                                )}
                                            </motion.button>
                                        )
                                    })}
                                    {visibleStatusOptions.length === 0 && (
                                        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                            No other status available to select.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-4 py-3 bg-gray-50">
                            {showFinalStatusWarning && (
                                <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    After changing the status can't be changed on other status.
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                <motion.button
                                    onClick={onClose}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={loading}
                                >
                                    Cancel
                                </motion.button>

                                <motion.button
                                    onClick={handleConfirm}
                                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium text-sm flex items-center gap-2"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={isUpdateDisabled}
                                >
                                    {loading ? (<><FiLoader className="w-4 h-4 animate-spin" />Updating...</>) : ('Update')}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TaskStatusChange;
