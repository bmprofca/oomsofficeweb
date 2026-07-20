// TaskTable.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiMenu, FiArrowLeft, FiArrowRight, FiCheckCircle, FiEye, FiEdit, FiTrash2,
    FiCalendar, FiDollarSign, FiUser, FiPhone, FiMail, FiClock, FiLoader, FiXCircle, FiBriefcase, FiUsers, FiSettings
} from 'react-icons/fi';

const AnimatedCheckbox = ({ checked, indeterminate = false, onChange, ariaLabel }) => {
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate, checked]);

    const isActive = checked || indeterminate;

    return (
        <label className="relative inline-flex items-center cursor-pointer group">
            <input
                ref={inputRef}
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={onChange}
                aria-label={ariaLabel}
            />
            <motion.span
                className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border-2 transition-colors duration-200 ${isActive
                        ? 'bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-200'
                        : 'bg-white border-gray-300 group-hover:border-indigo-400'
                    }`}
                animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
                transition={{ duration: 0.18 }}
            >
                <AnimatePresence initial={false} mode="wait">
                    {indeterminate ? (
                        <motion.span
                            key="dash"
                            className="block w-2 h-0.5 bg-white rounded-full"
                            initial={{ opacity: 0, scaleX: 0.4 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0.4 }}
                            transition={{ duration: 0.12 }}
                        />
                    ) : checked ? (
                        <motion.svg
                            key="check"
                            viewBox="0 0 12 12"
                            className="w-3 h-3 text-white"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.15 }}
                        >
                            <path
                                d="M2.5 6l2.2 2.2 4.8-4.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.svg>
                    ) : null}
                </AnimatePresence>
            </motion.span>
        </label>
    );
};

const getGridTemplateColumns = (columnConfig, { fitContainer = false } = {}) => {
    const dynamicCols = columnConfig.map((column) => {
        const hasMenu = column.items?.some((item) => item.id === 'menu');
        const hasStaffs = column.items?.some((item) => item.id === 'staffs');
        const hasStatus = column.items?.some((item) => item.id === 'status');
        const hasDates = column.items?.some((item) =>
            ['create_date', 'due_date', 'due_days', 'target_date'].includes(item.id)
        );
        const itemCount = column.items?.length || 1;

        if (fitContainer) {
            if (hasMenu) return '56px';
            if (hasStaffs) return 'minmax(0, 0.95fr)';
            if (hasStatus) return 'minmax(0, 0.95fr)';
            if (hasDates) return 'minmax(0, 0.85fr)';
            if (itemCount >= 3) return 'minmax(0, 1.45fr)';
            if (itemCount === 2) return 'minmax(0, 1.15fr)';
            return 'minmax(0, 1fr)';
        }

        if (hasMenu) return '72px';
        if (hasStaffs) return 'minmax(150px, 1fr)';
        if (hasStatus) return 'minmax(170px, 1fr)';
        if (hasDates) return 'minmax(108px, 0.85fr)';
        if (itemCount >= 3) return 'minmax(210px, 1.5fr)';
        if (itemCount === 2) return 'minmax(170px, 1.2fr)';
        return 'minmax(130px, 1fr)';
    });

    return `48px 48px ${dynamicCols.join(' ')}`;
};

// Professional Task Table Component - Dynamic Columns with Multiple Items - LEFT ALIGNED
const TaskTable = ({
    tasks,
    selectedTasks,
    handleTaskSelect,
    selectAll,
    isSelectionIndeterminate = false,
    handleSelectAll,
    columnConfig,
    renderCellContent,
    loading,
    toggleRowDropdown,
    activeRowDropdown,
    handleGetInOut,
    getTaskInOutState,
    getInOutLoadingId,
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
    getStatusText,
    onRowContextMenu,
    /** When false, rows appear in place (no staggered enter motion). */
    animateRows = true,
    /** Instant scroll offset applied on mount (browser-back restore). */
    initialScrollTop = null,
    /** Fit parent width without forcing a 960px min (avoids horizontal scroll in narrow tabs). */
    fitContainer = false,
}) => {

    const scrollContainerRef = React.useRef(null);

    React.useLayoutEffect(() => {
        if (initialScrollTop == null || !scrollContainerRef.current) return;
        const el = scrollContainerRef.current;
        const prevBehavior = el.style.scrollBehavior;
        el.style.scrollBehavior = 'auto';
        el.scrollTop = Number(initialScrollTop) || 0;
        el.style.scrollBehavior = prevBehavior;
    }, [initialScrollTop]);

    const getRowBackgroundClass = (task, isSelected = false, index = 0) => {
        const inOutState = getTaskInOutState?.(task) || {};
        if (inOutState.mode === 'self') {
            return isSelected
                ? 'bg-emerald-600/25 hover:bg-emerald-600/30'
                : 'bg-emerald-700/20 hover:bg-emerald-700/25';
        }
        if (inOutState.mode === 'other') {
            return isSelected
                ? 'bg-amber-600/25 hover:bg-amber-600/30'
                : 'bg-amber-700/20 hover:bg-amber-700/25';
        }
        const stripe = index % 2 === 1 ? 'bg-slate-50' : 'bg-white';
        return isSelected
            ? 'bg-indigo-50/50 hover:bg-indigo-50/70'
            : `${stripe} hover:bg-slate-100/80`;
    };

    const getCardShellClass = (task, isSelected = false, index = 0) => {
        const inOutState = getTaskInOutState?.(task) || {};
        if (inOutState.mode === 'self') {
            return `bg-emerald-700/20 border border-gray-200 ${isSelected ? 'ring-2 ring-emerald-600' : ''}`;
        }
        if (inOutState.mode === 'other') {
            return `bg-amber-700/20 border border-gray-200 ${isSelected ? 'ring-2 ring-amber-600' : ''}`;
        }
        const stripe = index % 2 === 1 ? 'bg-slate-50' : 'bg-white';
        return `${stripe} border border-gray-200 ${isSelected ? 'ring-2 ring-indigo-500' : ''}`;
    };

    const gridTemplateColumns = React.useMemo(
        () => getGridTemplateColumns(columnConfig, { fitContainer }),
        [columnConfig, fitContainer]
    );

    // Skeleton Row for loading state
    const SkeletonRow = () => (
        <div className="flex items-center border-b border-gray-100 animate-pulse p-3">
            <div className="w-12 flex-shrink-0">
                <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
            </div>
            <div className="w-12 flex-shrink-0">
                <div className="h-4 bg-gray-200 rounded w-4 mx-auto"></div>
            </div>
            {columnConfig.map((column, index) => (
                <div key={index} className="flex-1 p-2">
                    <div className="space-y-2">
                        {column.items && column.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="min-h-[1.25rem] flex items-center">
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    // Mobile Task Card Component
    const MobileTaskCard = ({ task, index }) => {
        const daysLeft = getDaysLeft(task.dates?.due_date);
        const isOverdue = daysLeft !== null && daysLeft < 0;
        const isSelected = selectedTasks.has(task.task_id);

        return (
            <motion.div
                className={`border rounded-lg p-3 mb-2 md:hidden transition-colors ${getCardShellClass(task, isSelected, index)}`}
                initial={animateRows ? { opacity: 0, y: 5 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={animateRows ? undefined : { duration: 0 }}
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <AnimatedCheckbox
                            checked={isSelected}
                            onChange={() => handleTaskSelect(task.task_id)}
                            ariaLabel={`Select task ${index + 1}`}
                        />
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
                                    {(() => {
                                        const inOutState = getTaskInOutState?.(task) || {};
                                        const isLoading = getInOutLoadingId === task.task_id;
                                        return (
                                            <>
                                                {inOutState.badge && (
                                                    <div className={`px-4 py-2 text-[10px] font-medium border-b ${inOutState.mode === 'self'
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                                            : 'bg-amber-50 text-amber-800 border-amber-100'
                                                        }`}>
                                                        {inOutState.badge}
                                                    </div>
                                                )}

                                                {inOutState.showGetIn && (
                                                    <button
                                                        disabled={isLoading}
                                                        onClick={() => {
                                                            handleGetInOut(task.task_id, 'in');
                                                            setActiveRowDropdown(null);
                                                        }}
                                                        className="flex items-center w-full px-4 py-3 text-xs text-indigo-600 hover:bg-indigo-50 text-left disabled:opacity-60"
                                                    >
                                                        {isLoading ? (
                                                            <FiLoader className="mr-3 w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <FiArrowLeft className="mr-3 w-3.5 h-3.5" />
                                                        )}
                                                        GET IN
                                                    </button>
                                                )}

                                                {inOutState.showGetOut && (
                                                    <button
                                                        disabled={isLoading}
                                                        onClick={() => {
                                                            handleGetInOut(task.task_id, 'out');
                                                            setActiveRowDropdown(null);
                                                        }}
                                                        className="flex items-center w-full px-4 py-3 text-xs text-orange-600 hover:bg-orange-50 text-left disabled:opacity-60"
                                                    >
                                                        {isLoading ? (
                                                            <FiLoader className="mr-3 w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <FiArrowRight className="mr-3 w-3.5 h-3.5" />
                                                        )}
                                                        GET OUT
                                                    </button>
                                                )}

                                                {(inOutState.showGetIn || inOutState.showGetOut) && (
                                                    <div className="border-t my-1" />
                                                )}
                                            </>
                                        );
                                    })()}

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

    const renderDynamicColumns = (task) => columnConfig.map((column) => {
        const hasMenuItem = column.items && column.items.some((item) => item.id === 'menu');
        const itemCount = column.items?.length || 0;

        return (
            <div
                key={column.id}
                className={`p-3 min-w-0 text-left border-l border-gray-100 ${
                    hasMenuItem ? 'relative overflow-visible' : 'overflow-hidden'
                }`}
            >
                <div className={`flex flex-col items-start justify-start gap-2 ${hasMenuItem ? 'relative items-center justify-center min-h-[2rem]' : ''}`}>
                    {column.items && column.items.map((item, idx) => (
                        <div key={item.id} className={`w-full ${hasMenuItem ? 'flex items-center justify-center text-center' : 'text-left'}`}>
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
                            {idx < itemCount - 1 && itemCount > 1 && (
                                <div className="border-b border-gray-100 my-1" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    });

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Mobile Header */}
            <div className="md:hidden border-b border-gray-200 bg-white px-3 py-2 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AnimatedCheckbox
                            checked={selectAll}
                            indeterminate={isSelectionIndeterminate}
                            onChange={handleSelectAll}
                            ariaLabel="Select all tasks"
                        />
                        <span className="font-semibold text-gray-800 text-sm">Tasks</span>
                    </div>
                    <span className="text-xs text-gray-600">{tasks.length} tasks</span>
                </div>
            </div>

            {/* Body */}
            <div
                id="task-table-scroll"
                ref={scrollContainerRef}
                className={`flex-1 ${fitContainer ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}`}
                style={{ scrollBehavior: 'auto' }}
            >
                {loading ? (
                    <div className={fitContainer ? 'w-full min-w-0' : 'min-w-[960px]'}>
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
                    <>
                        {/* Mobile Cards */}
                        <div className="md:hidden px-3 py-1">
                            {tasks.map((task, index) => (
                                <MobileTaskCard key={task.task_id} task={task} index={index} />
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className={`hidden md:block ${fitContainer ? 'w-full min-w-0' : 'min-w-[960px]'}`}>
                            <div
                                className="sticky top-0 z-10 grid items-center border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white"
                                style={{ gridTemplateColumns }}
                            >
                                <div className="p-3 flex items-center justify-start">
                                    <AnimatedCheckbox
                                        checked={selectAll}
                                        indeterminate={isSelectionIndeterminate}
                                        onChange={handleSelectAll}
                                        ariaLabel="Select all tasks"
                                    />
                                </div>
                                <div className="p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide text-left border-l border-gray-100">
                                    #
                                </div>
                                {columnConfig.map((column) => (
                                    <div
                                        key={column.id}
                                        className="p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide min-w-0 text-left border-l border-gray-100"
                                    >
                                        {column.items?.some((item) => item.id === 'menu')
                                            ? <FiSettings className="w-4 h-4 text-gray-600 mx-auto" />
                                            : <span className="truncate block">{column.name}</span>}
                                    </div>
                                ))}
                            </div>

                            {tasks.map((task, index) => {
                                const isSelected = selectedTasks.has(task.task_id);

                                return (
                                    <motion.div
                                        key={task.task_id}
                                        className={`grid items-start border-b border-gray-100 transition-colors group ${getRowBackgroundClass(task, isSelected, index)}`}
                                        style={{ gridTemplateColumns }}
                                        initial={animateRows ? { opacity: 0, y: 5 } : false}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={
                                            animateRows
                                                ? { delay: index * 0.03 }
                                                : { duration: 0 }
                                        }
                                        onContextMenu={(e) => {
                                            if (e.target.closest('button, a, input, label, .task-row-action-trigger')) return;
                                            onRowContextMenu?.(e, task.task_id);
                                        }}
                                    >
                                        <div className="p-3 flex items-center justify-start">
                                            <AnimatedCheckbox
                                                checked={isSelected}
                                                onChange={() => handleTaskSelect(task.task_id)}
                                                ariaLabel={`Select task ${index + 1}`}
                                            />
                                        </div>
                                        <div className="p-3 text-left border-l border-gray-100">
                                            <span className="font-bold text-gray-800 text-[11px]">
                                                {index + 1}
                                            </span>
                                        </div>
                                        {renderDynamicColumns(task)}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
export default TaskTable;