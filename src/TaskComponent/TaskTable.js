// TaskTable.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiMenu, FiArrowLeft,FiChevronDown,FiChevronUp, FiCheckCircle, FiEye, FiEdit, FiTrash2, 
    FiCalendar, FiDollarSign, FiUser, FiPhone, FiMail, FiClock, FiLoader, FiXCircle, FiBriefcase, FiUsers 
} from 'react-icons/fi';

// Professional Task Table Component - Dynamic Columns with Multiple Items - LEFT ALIGNED
const TaskTable = ({ 
    tasks, 
    selectedTasks, 
    handleTaskSelect, 
    selectAll, 
    handleSelectAll, 
    columnConfig,
    renderCellContent,
    loading,
    toggleRowDropdown,
    activeRowDropdown,
    handleGetInOut,
    setActiveRowDropdown,
    handleStatusChange,
    openStatusModal,
    openUsersModal,
    openClientDetailsModal,
    handleEditTask,
    navigate,
    formatDate,
    getDaysLeft,
    getStatusStyle,
    getStatusText
}) => {
    
    // State for collapsed columns
    const [collapsedColumns, setCollapsedColumns] = React.useState({});
    
    // Toggle column collapse
    const toggleColumnCollapse = (columnId) => {
        setCollapsedColumns(prev => ({
            ...prev,
            [columnId]: !prev[columnId]
        }));
    };
    
    // Helper to get flex ratio for columns based on number of items
    const getColumnFlex = (columnId, items, isCollapsed) => {
        const hasStaffs = items?.some(item => item.id === 'staffs');
        const hasStatus = items?.some(item => item.id === 'status');
        const hasActions = items?.some(item => item.id === 'menu');
        
        // Base width
        let baseFlex = 1;
        
        if (hasStaffs) baseFlex = 0.8;
        if (hasStatus) baseFlex = 0.7;
        if (hasActions) baseFlex = 0.6;
        
        // Reduce width when collapsed
        if (isCollapsed) {
            baseFlex = baseFlex * 0.6;
        } else {
            // Increase width for columns with multiple items when expanded
            const itemCount = items?.length || 1;
            if (itemCount > 1) {
                baseFlex = baseFlex + (itemCount - 1) * 0.3;
            }
        }
        
        return baseFlex.toString();
    };

    // Skeleton Row for loading state
    const SkeletonRow = () => (
        <div className="flex items-center border-b border-gray-100 animate-pulse p-3">
            <div className="w-12 flex-shrink-0">
                <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
            </div>
            <div className="w-12 flex-shrink-0">
                <div className="h-4 bg-gray-200 rounded w-4 mx-auto"></div>
            </div>
            {columnConfig.map((column, index) => {
                const isCollapsed = collapsedColumns[column.id];
                return (
                    <div key={index} className="flex-1 p-2" style={{ flex: getColumnFlex(column.id, column.items, isCollapsed) }}>
                        <div className="space-y-2">
                            {!isCollapsed && column.items && column.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="min-h-[1.25rem] flex items-center">
                                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                </div>
                            ))}
                            {isCollapsed && column.items && column.items.length > 0 && (
                                <div className="min-h-[1.25rem] flex items-center">
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Mobile Task Card Component
    const MobileTaskCard = ({ task, index }) => {
        const daysLeft = getDaysLeft(task.dates?.due_date);
        const isOverdue = daysLeft !== null && daysLeft < 0;
        const isSelected = selectedTasks.has(task.task_id);

        return (
            <motion.div
                className={`bg-white border border-gray-200 rounded-lg p-3 mb-2 md:hidden ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isSelected}
                                onChange={() => handleTaskSelect(task.task_id)}
                            />
                            <div className={`w-8 h-4 ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${isSelected ? 'after:translate-x-full' : ''}`}></div>
                        </label>
                        <div className="font-bold text-gray-800 text-xs w-4">{index + 1}</div>
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <FiBriefcase className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <button
                                onClick={() => navigate(`/client/profile/${task.client?.username}`)}
                                className="font-semibold text-gray-800 text-xs hover:text-indigo-600  text-left"
                            >
                                {task.client?.profile?.name || task.client?.name || '-'}
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <motion.button
                            onClick={() => toggleRowDropdown(`mobile-${task.task_id}`)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                            </div>
                        </motion.button>

                        <AnimatePresence>
                            {activeRowDropdown === `mobile-${task.task_id}` && (
                                <motion.div
                                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] overflow-hidden"
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                >
                                    <button
                                        onClick={() => {
                                            handleGetInOut(task.task_id, 'in');
                                            setActiveRowDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-xs text-indigo-600 hover:bg-indigo-50 text-left"
                                    >
                                        <FiArrowLeft className="mr-3 w-3.5 h-3.5" />
                                        GET IN
                                    </button>

                                    <div className="border-t my-1"></div>

                                    <button
                                        onClick={() => {
                                            openStatusModal(task.task_id, task.status);
                                            setActiveRowDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-xs text-blue-600 hover:bg-blue-50 text-left"
                                    >
                                        <FiCheckCircle className="mr-3 w-3.5 h-3.5" />
                                        Change Status
                                    </button>

                                    <button
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            navigate(`/task/${task.task_id}`);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-xs text-gray-700 hover:bg-gray-100 text-left"
                                    >
                                        <FiEye className="mr-3 w-3.5 h-3.5" />
                                        View Details
                                    </button>

                                    <button
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                            handleEditTask(task);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-xs text-gray-700 hover:bg-gray-100 text-left"
                                    >
                                        <FiEdit className="mr-3 w-3.5 h-3.5" />
                                        Edit Task
                                    </button>

                                    <div className="border-t my-1"></div>

                                    <button
                                        onClick={() => {
                                            setActiveRowDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-3 text-xs text-red-600 hover:bg-red-50 text-left"
                                    >
                                        <FiTrash2 className="mr-3 w-3.5 h-3.5" />
                                        Delete Task
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="space-y-2 mt-2">
                    {/* Dynamically render ALL column items for mobile - LEFT ALIGNED */}
                    {columnConfig.map(column => (
                        column.items && column.items.map((item, idx) => (
                            <div key={item.id} className="w-full text-left">
                                {renderCellContent(
                                    task, 
                                    item.id,
                                    handleGetInOut,
                                    navigate,
                                    openStatusModal,
                                    openUsersModal,
                                    openClientDetailsModal,
                                    handleEditTask,
                                    setActiveRowDropdown,
                                    activeRowDropdown,
                                    toggleRowDropdown
                                )}
                                {idx < column.items.length - 1 && column.items.length > 1 && (
                                    <div className="border-b border-gray-100 my-1"></div>
                                )}
                            </div>
                        ))
                    ))}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop Header - LEFT ALIGNED with Collapse Icons */}
            <div className="hidden md:block border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
                <div className="flex items-center min-w-max bg-white">
                    {/* Select All Checkbox */}
                    <div className="w-12 p-3 flex-shrink-0 flex justify-start">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={selectAll}
                                onChange={handleSelectAll}
                            />
                            <div className={`w-8 h-4 ${selectAll ? 'bg-indigo-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${selectAll ? 'after:translate-x-full' : ''}`}></div>
                        </label>
                    </div>

                    {/* SL No Column */}
                    <div className="w-12 p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide flex-shrink-0 text-left border-l border-gray-100">
                        SL No
                    </div>

                    {/* Dynamic Columns Header with Collapse Button */}
                    {columnConfig.map(column => {
                        const isCollapsed = collapsedColumns[column.id];
                        const itemCount = column.items?.length || 0;
                        
                        return (
                            <div
                                key={column.id}
                                className="p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide flex-1 min-w-0 text-left border-l border-gray-100 group"
                                style={{ flex: getColumnFlex(column.id, column.items, isCollapsed) }}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <div className="truncate flex-1">{column.name}</div>
                                    {itemCount > 1 && (
                                        <motion.button
                                            onClick={() => toggleColumnCollapse(column.id)}
                                            className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5 rounded flex-shrink-0"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            title={isCollapsed ? "Expand column" : "Collapse column"}
                                        >
                                            {isCollapsed ? (
                                                <FiChevronDown className="w-3 h-3" />
                                            ) : (
                                                <FiChevronUp className="w-3 h-3" />
                                            )}
                                        </motion.button>
                                    )}
                                </div>
                                {/* Show item count hint for columns with multiple fields */}
                                {column.items && column.items.length > 1 && !isCollapsed && (
                                    <div className="text-[8px] font-normal text-gray-400 mt-0.5">
                                        {column.items.length} fields
                                    </div>
                                )}
                                {isCollapsed && column.items && column.items.length > 0 && (
                                    <div className="text-[8px] font-normal text-indigo-500 mt-0.5">
                                        Collapsed
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={selectAll}
                                onChange={handleSelectAll}
                            />
                            <div className={`w-8 h-4 ${selectAll ? 'bg-indigo-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${selectAll ? 'after:translate-x-full' : ''}`}></div>
                        </label>
                        <span className="font-semibold text-gray-800 text-sm">Tasks</span>
                    </div>
                    <span className="text-xs text-gray-600">{tasks.length} tasks</span>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {loading ? (
                    <div className="md:min-w-max">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <SkeletonRow key={index} />
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
                    <div className="md:min-w-max">
                        {/* Mobile Cards */}
                        <div className="md:hidden px-3 py-1">
                            {tasks.map((task, index) => (
                                <MobileTaskCard key={task.task_id} task={task} index={index} />
                            ))}
                        </div>

                        {/* Desktop Table - LEFT ALIGNED with Collapsed Columns */}
                        <div className="hidden md:block">
                            {tasks.map((task, index) => {
                                const isSelected = selectedTasks.has(task.task_id);

                                return (
                                    <motion.div
                                        key={task.task_id}
                                        className={`flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors group bg-white ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        {/* Selection Checkbox - LEFT ALIGNED */}
                                        <div className="w-12 p-3 flex-shrink-0 flex justify-start">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isSelected}
                                                    onChange={() => handleTaskSelect(task.task_id)}
                                                />
                                                <div className={`w-8 h-4 ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'} peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${isSelected ? 'after:translate-x-full' : ''}`}></div>
                                            </label>
                                        </div>

                                        {/* SL No - LEFT ALIGNED */}
                                        <div className="w-12 p-3 flex-shrink-0 text-left border-l border-gray-100">
                                            <span className="font-bold text-gray-800 text-[11px]">
                                                {index + 1}
                                            </span>
                                        </div>

                                        {/* Dynamic Column Content - DISPLAY ALL ITEMS or MINIMAL when COLLAPSED */}
                                       {columnConfig.map(column => {
    const hasMenuItem = column.items && column.items.some(item => item.id === 'menu');
    const isCollapsed = collapsedColumns[column.id];
    const itemCount = column.items?.length || 0;
    
    // When collapsed, show only first item
    const itemsToShow = isCollapsed && itemCount > 1 
        ? [column.items[0]] 
        : column.items;
    
    return (
        <div
            key={column.id}
            className={`p-3 min-w-0 text-left border-l border-gray-100 ${
                hasMenuItem ? 'relative overflow-visible' : 'overflow-hidden'
            } ${isCollapsed ? 'opacity-90' : ''}`}
            style={{ 
                flex: getColumnFlex(column.id, column.items, isCollapsed),
                overflow: hasMenuItem ? 'visible' : 'hidden',
                position: hasMenuItem ? 'static' : 'relative'
            }}
        >
            <div className={`flex flex-col items-start justify-start gap-2 ${hasMenuItem ? 'relative' : ''}`}>
                {/* Map through items to show */}
                {itemsToShow && itemsToShow.map((item, idx) => (
                    <div key={item.id} className="w-full text-left">
                        {renderCellContent(
                            task, 
                            item.id,
                            handleGetInOut,
                            navigate,
                            openStatusModal,
                            openUsersModal,
                            openClientDetailsModal,
                            handleEditTask,
                            setActiveRowDropdown,
                            activeRowDropdown,
                            toggleRowDropdown
                        )}
                        {/* Add visual separator between multiple items */}
                        {!isCollapsed && idx < itemCount - 1 && itemCount > 1 && (
                            <div className="border-b border-gray-100 my-1"></div>
                        )}
                    </div>
                ))}
                
                {/* Show collapsed indicator when multiple items */}
                {isCollapsed && itemCount > 1 && (
                    <div className="text-[8px] text-gray-400 italic mt-0.5">
                        +{itemCount - 1} more...
                    </div>
                )}
            </div>
        </div>
    );
})}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default TaskTable;