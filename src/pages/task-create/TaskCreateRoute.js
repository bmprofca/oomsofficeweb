import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskCreate } from '../../context/TaskCreateProvider';

/** Opens the global task-create modal when visiting `/task/create` (legacy route). */
export default function TaskCreateRoute() {
    const { openTaskCreate } = useTaskCreate();
    const navigate = useNavigate();
    const openedRef = useRef(false);

    useEffect(() => {
        if (openedRef.current) return;
        openedRef.current = true;
        openTaskCreate({
            onNavigateToTaskList: () => navigate('/task/view'),
        });
    }, [openTaskCreate, navigate]);

    return null;
}
