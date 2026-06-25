import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import TaskCreateModal from '../components/Modals/TaskCreateModal';

const TaskCreateContext = createContext(null);

/**
 * Open the global task-create modal from anywhere.
 *
 * @example
 * openTaskCreate({ ca: 'ca_username', caName: 'John CA' });
 * openTaskCreate({ client: 'client_username' });
 * openTaskCreate({ service_id: '...', firms: [...] });
 */
export function TaskCreateProvider({ children }) {
    const [state, setState] = useState({
        isOpen: false,
        prefill: null,
    });
    const callbacksRef = useRef({});

    const openTaskCreate = useCallback((options = {}) => {
        const { prefill, onSuccess, onNavigateToTaskList, ...rest } = options;
        const mergedPrefill = prefill ? { ...prefill, ...rest } : Object.keys(rest).length ? rest : null;
        callbacksRef.current = { onSuccess, onNavigateToTaskList };
        setState({
            isOpen: true,
            prefill: mergedPrefill,
        });
    }, []);

    const closeTaskCreate = useCallback(() => {
        setState((s) => ({ ...s, isOpen: false }));
    }, []);

    const value = useMemo(
        () => ({ openTaskCreate, closeTaskCreate, isOpen: state.isOpen }),
        [openTaskCreate, closeTaskCreate, state.isOpen]
    );

    return (
        <TaskCreateContext.Provider value={value}>
            {children}
            <TaskCreateModal
                isOpen={state.isOpen}
                prefill={state.prefill}
                onClose={closeTaskCreate}
                onSuccess={(result) => {
                    callbacksRef.current.onSuccess?.(result);
                }}
                onNavigateToTaskList={() => {
                    const fn = callbacksRef.current.onNavigateToTaskList;
                    closeTaskCreate();
                    fn?.();
                }}
            />
        </TaskCreateContext.Provider>
    );
}

export function useTaskCreate() {
    const ctx = useContext(TaskCreateContext);
    if (!ctx) {
        throw new Error('useTaskCreate must be used within TaskCreateProvider');
    }
    return ctx;
}

export default TaskCreateProvider;
