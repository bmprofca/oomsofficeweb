import React, { useEffect, useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { Header, Sidebar } from '../../components/header';
import { useUserPermissions } from '../../utils/permission-helper';
import TaskCreateForm from './TaskCreateForm';
import './task-create.css';

const TaskCreate = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const { check } = useUserPermissions();

    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    if (!check('task_create')) {
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
                    className={`pt-16 flex items-center justify-center transition-all duration-300 h-[calc(100vh-4rem)] ${
                        isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
                    }`}
                >
                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full mx-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiLock className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h3>
                        <p className="text-slate-500 text-sm">You do not have permission to create tasks.</p>
                    </div>
                </div>
            </div>
        );
    }

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
            <main
                className={`pt-16 transition-all duration-300 ease-in-out ${
                    isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
                } overflow-x-hidden min-w-0 w-full max-w-full`}
            >
                <div className="tc-page max-w-7xl mx-auto">
                    <TaskCreateForm />
                </div>
            </main>
        </div>
    );
};

export default TaskCreate;
