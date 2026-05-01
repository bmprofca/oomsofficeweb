import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiUser, FiX, FiSearch } from 'react-icons/fi';

const AssignedStaffList = ({ isOpen, onClose, users = [], taskName = '' }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return users;
        return users.filter((user) => {
            const name = (user?.name || '').toLowerCase();
            const mobile = (user?.mobile || '').toLowerCase();
            const email = (user?.email || '').toLowerCase();
            return name.includes(query) || mobile.includes(query) || email.includes(query);
        });
    }, [users, searchTerm]);

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
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto overflow-hidden border border-gray-100"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white px-4 py-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <FiUsers className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-semibold leading-tight">Assigned Staff</h3>
                                        <p className="text-indigo-100 text-xs truncate">Task: {taskName || '-'}</p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>

                        <div className="p-3 pb-2 bg-gradient-to-b from-white to-gray-50/60 border-b border-gray-100">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    defaultValue={searchTerm}
                                    onKeyUp={(e) => setSearchTerm(e.currentTarget.value)}
                                    placeholder="Search staff by name, mobile or email"
                                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div
                            className="p-3 max-h-[52vh] overflow-y-auto bg-gradient-to-b from-white to-gray-50/60 [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <div className="space-y-2">
                                {filteredUsers.map((user, index) => (
                                    <motion.div
                                        key={user.username || index}
                                        className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200/90 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow">
                                            {(user.name || 'U').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <h4 className="font-semibold text-gray-800 text-sm truncate">{user.name || '-'}</h4>
                                            <p className="text-gray-700 text-xs truncate">{user.mobile || '-'}</p>
                                            <p className="text-gray-500 text-xs truncate">{user.email || '-'}</p>
                                        </div>
                                    </motion.div>
                                ))}

                                {users.length === 0 && (
                                    <div className="text-center py-10">
                                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FiUser className="w-7 h-7 text-gray-400" />
                                        </div>
                                        <p className="text-gray-600 font-medium text-sm">No staff assigned</p>
                                    </div>
                                )}

                                {users.length > 0 && filteredUsers.length === 0 && (
                                    <div className="text-center py-10">
                                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FiSearch className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-gray-600 font-medium text-sm">No matching staff found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-4 py-2.5 bg-white border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-600">
                                    <span className="font-semibold">{filteredUsers.length}</span> of {users.length} staff member{users.length !== 1 ? 's' : ''} shown
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium text-xs shadow-sm"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AssignedStaffList;
