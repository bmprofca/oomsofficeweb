import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../components/header';
import CreateTask from '../components/Modals/CreateTask';

/**
 * Full-page create task route: app chrome + {@link CreateTask} in embedded mode.
 * For modal usage, import `CreateTask` directly and pass `isOpen` / `onClose`.
 */
const TaskCreate = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

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

    return (
        <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full box-border">
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
            <div
                className={`pt-16 transition-all duration-300 ease-in-out ${
                    isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
                } overflow-x-hidden min-w-0 w-full max-w-full flex-1`}
            >
                <CreateTask
                    embedded
                    isOpen
                    onNavigateToTaskList={() => navigate('/task/view')}
                />
            </div>
        </div>
    );
};

export default TaskCreate;
