import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientCreateModal from '../components/Modals/ClientCreateModal';

const ClientCreateContext = createContext(null);

/**
 * Open the global client-create modal from anywhere.
 *
 * @example
 * const { openClientCreate } = useClientCreate();
 * openClientCreate({ onCreated: (client) => refreshList() });
 *
 * Every successful create also fires a `ooms:client-created` window event,
 * so lists can refresh without wiring a callback.
 */
export function ClientCreateProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const callbacksRef = useRef({});

    const openClientCreate = useCallback((options = {}) => {
        callbacksRef.current = { onCreated: options.onCreated };
        setIsOpen(true);
    }, []);

    const closeClientCreate = useCallback(() => setIsOpen(false), []);

    const value = useMemo(
        () => ({ openClientCreate, closeClientCreate, isOpen }),
        [openClientCreate, closeClientCreate, isOpen]
    );

    return (
        <ClientCreateContext.Provider value={value}>
            {children}
            <ClientCreateModal
                isOpen={isOpen}
                onClose={closeClientCreate}
                onCreated={(client) => callbacksRef.current.onCreated?.(client)}
            />
        </ClientCreateContext.Provider>
    );
}

export function useClientCreate() {
    const ctx = useContext(ClientCreateContext);
    if (!ctx) {
        throw new Error('useClientCreate must be used within ClientCreateProvider');
    }
    return ctx;
}

export default ClientCreateProvider;

/**
 * Old `/client/create` links (bookmarks, global search) open the modal on top of the client list.
 */
export function ClientCreateRoute() {
    const { openClientCreate } = useClientCreate();
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/client/view', { replace: true });
        openClientCreate();
    }, [navigate, openClientCreate]);
    return null;
}
