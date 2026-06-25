import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiLock, FiX } from 'react-icons/fi';
import { useUserPermissions } from '../../utils/permission-helper';
import TaskCreateForm from '../../pages/task-create/TaskCreateForm';
import TaskCreateStepIndicator from '../../pages/task-create/TaskCreateStepIndicator';
import TaskCreateFooter from '../../pages/task-create/TaskCreateFooter';
import '../../pages/task-create/task-create.css';

/**
 * Global task-create modal (max width). Same form design as the former full page.
 */
export default function TaskCreateModal({
    isOpen,
    onClose,
    onSuccess,
    onNavigateToTaskList,
    prefill = null,
}) {
    const { check } = useUserPermissions();
    const formRef = useRef(null);
    const [mounted, setMounted] = useState(false);
    const [footerState, setFooterState] = useState({
        step: 1,
        submitting: false,
        subTaskDraftActive: false,
    });

    const handleStepChange = useCallback((next) => {
        setFooterState((prev) => {
            if (
                prev.step === next.step &&
                prev.submitting === next.submitting &&
                prev.subTaskDraftActive === next.subTaskDraftActive
            ) {
                return prev;
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (isOpen) setMounted(true);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setFooterState({ step: 1, submitting: false, subTaskDraftActive: false });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const canCreate = check('task_create');
    const prefillKey = JSON.stringify(prefill || {});

    if (!mounted && !isOpen) return null;

    return createPortal(
        <AnimatePresence onExitComplete={() => setMounted(false)}>
            {isOpen && (
                <div className="fixed inset-0 z-[220] flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                        aria-hidden
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-create-modal-title"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-[1] pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-7xl h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                            <div className="flex items-start gap-3 min-h-[52px]">
                                <h2
                                    id="task-create-modal-title"
                                    className="text-sm font-semibold text-gray-900 shrink-0 whitespace-nowrap pt-1"
                                >
                                    Create New Task
                                </h2>
                                {canCreate && (
                                    <div className="flex-1 min-w-0">
                                        <TaskCreateStepIndicator
                                            step={footerState.step}
                                            headerInline
                                            disableNavigation
                                        />
                                    </div>
                                )}
                                {!canCreate && <div className="flex-1" />}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    aria-label="Close"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {!canCreate ? (
                            <div className="flex-1 min-h-0 flex items-center justify-center p-6">
                                <div className="text-center p-6 bg-white rounded-xl border border-slate-200 shadow-sm max-w-sm w-full">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FiLock className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Access Denied</h3>
                                    <p className="text-slate-500 text-xs">You do not have permission to create tasks.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div
                                    className="px-4 py-3 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    <TaskCreateForm
                                        key={prefillKey}
                                        ref={formRef}
                                        layout="modal"
                                        resourcesEnabled
                                        prefill={prefill}
                                        onClose={onClose}
                                        onSuccess={onSuccess}
                                        onNavigateToTaskList={onNavigateToTaskList}
                                        onStepChange={handleStepChange}
                                    />
                                </div>

                                <div className="shrink-0 px-4 py-2 border-t border-gray-100 bg-gray-50/90">
                                    <TaskCreateFooter
                                        step={footerState.step}
                                        onPrevious={() => formRef.current?.goPrevious()}
                                        onNext={() => formRef.current?.goNext()}
                                        onSubmit={(e) => formRef.current?.handleCreate(e)}
                                        submitting={footerState.submitting}
                                        showSubTaskForm={footerState.subTaskDraftActive}
                                    />
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
