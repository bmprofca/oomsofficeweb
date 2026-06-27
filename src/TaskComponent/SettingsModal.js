// components/SettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMove, FiSave, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SettingsModal = ({ isOpen, onClose, columnConfig, saveColumnConfig, defaultColumnConfig }) => {
    const [localColumnConfig, setLocalColumnConfig] = useState(columnConfig);
    const [localActiveDragId, setLocalActiveDragId] = useState(null);
    const [hiddenColumns, setHiddenColumns] = useState({});
    const [hiddenFields, setHiddenFields] = useState({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (isOpen) {
            setLocalColumnConfig(columnConfig);
        }
    }, [columnConfig, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const saved = localStorage.getItem('taskColumnConfig');
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (parsed.hiddenColumns) setHiddenColumns(parsed.hiddenColumns);
            if (parsed.hiddenFields) setHiddenFields(parsed.hiddenFields);
        } catch {
            // ignore invalid saved config
        }
    }, [isOpen]);

    const handleModalDragEnd = (event) => {
        const { active, over } = event;
        setLocalActiveDragId(null);

        if (!over || active.id === over.id) return;

        setLocalColumnConfig((items) => {
            const oldIndex = items.findIndex((col) => col.id === active.id);
            const newIndex = items.findIndex((col) => col.id === over.id);

            if (oldIndex === -1 || newIndex === -1) return items;

            const sourceColumn = items[oldIndex];
            const targetColumn = items[newIndex];

            if (sourceColumn.fixed) return items;

            if (targetColumn.fixed) {
                if (newIndex > oldIndex) {
                    const firstFixedIndex = items.findIndex((col) => col.fixed);
                    if (firstFixedIndex > 0) {
                        return arrayMove(items, oldIndex, firstFixedIndex - 1);
                    }
                    return items;
                }
                const lastNonFixedIndex = items.reduce(
                    (lastIndex, col, index) => (!col.fixed ? index : lastIndex),
                    -1
                );
                if (lastNonFixedIndex !== -1) {
                    return arrayMove(items, oldIndex, lastNonFixedIndex);
                }
                return items;
            }

            return arrayMove(items, oldIndex, newIndex);
        });
    };

    const toggleFieldVisibility = (columnId, itemId) => {
        const fieldKey = `${columnId}_${itemId}`;
        setHiddenFields((prev) => ({
            ...prev,
            [fieldKey]: !prev[fieldKey],
        }));
    };

    const toggleColumnVisibility = (columnId) => {
        setHiddenColumns((prev) => ({
            ...prev,
            [columnId]: !prev[columnId],
        }));
    };

    const isFieldHidden = (columnId, itemId) => hiddenFields[`${columnId}_${itemId}`] || false;
    const isColumnHidden = (columnId) => hiddenColumns[columnId] || false;

    const saveChanges = () => {
        const configToSave = {
            columns: localColumnConfig,
            hiddenColumns,
            hiddenFields,
        };
        localStorage.setItem('taskColumnConfig', JSON.stringify(configToSave));
        saveColumnConfig(localColumnConfig);
        window.dispatchEvent(
            new CustomEvent('columnVisibilityChanged', {
                detail: { hiddenColumns, hiddenFields },
            })
        );
        onClose();
    };

    const resetToDefault = () => {
        setLocalColumnConfig(JSON.parse(JSON.stringify(defaultColumnConfig)));
        setHiddenColumns({});
        setHiddenFields({});
    };

    const ModalFieldRow = ({ item, columnId, isHidden, toggleVisibility }) => (
        <div
            className={`flex items-center justify-between bg-white border rounded-md px-2 py-1.5 text-xs transition-all duration-200 ${
                isHidden ? 'opacity-50 bg-gray-50' : 'border-gray-200'
            }`}
        >
            <span className={`font-medium text-gray-700 text-[11px] truncate ${isHidden ? 'line-through' : ''}`}>
                {item.label}
            </span>
            <button
                type="button"
                onClick={toggleVisibility}
                className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                    isHidden ? 'text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                title={isHidden ? 'Show field' : 'Hide field'}
            >
                {isHidden ? <FiEye className="w-3 h-3" /> : <FiEyeOff className="w-3 h-3" />}
            </button>
        </div>
    );

    const ModalSortableColumn = ({ column, index }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            setActivatorNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({
            id: column.id,
            disabled: column.fixed,
        });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.55 : 1,
            zIndex: isDragging ? 50 : 1,
        };

        const isColumnHiddenLocal = isColumnHidden(column.id);

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`border-2 rounded-xl p-3 transition-all duration-200 ${
                    isColumnHiddenLocal ? 'opacity-60 bg-gray-100' : ''
                } ${
                    column.fixed
                        ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300'
                }`}
            >
                <div className="mb-2 pb-2 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {!column.fixed ? (
                                <button
                                    type="button"
                                    ref={setActivatorNodeRef}
                                    {...attributes}
                                    {...listeners}
                                    className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                                    title="Drag to reorder column"
                                >
                                    <FiMove className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <FiMove className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                            )}
                            <h3 className="font-bold text-gray-800 text-xs truncate">{column.name}</h3>
                        </div>
                        {!column.fixed && (
                            <button
                                type="button"
                                onClick={() => toggleColumnVisibility(column.id)}
                                className={`p-1 rounded transition-colors ${
                                    isColumnHiddenLocal ? 'text-gray-600 bg-gray-200' : 'text-indigo-600 hover:bg-indigo-50'
                                }`}
                                title={isColumnHiddenLocal ? 'Show column' : 'Hide column'}
                            >
                                {isColumnHiddenLocal ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        {column.fixed && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                                Fixed
                            </span>
                        )}
                        <span className="text-[10px] text-gray-500">
                            {column.items.length} item{column.items.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {!isColumnHiddenLocal ? (
                    <div className="space-y-1.5 min-h-[50px]">
                        {column.items.map((item) => {
                            const isFieldHiddenLocal = isFieldHidden(column.id, item.id);
                            return (
                                <ModalFieldRow
                                    key={item.id}
                                    item={item}
                                    columnId={column.id}
                                    isHidden={isFieldHiddenLocal}
                                    toggleVisibility={() => toggleFieldVisibility(column.id, item.id)}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500 text-xs">
                        <FiEyeOff className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <p>Column hidden</p>
                        <button
                            type="button"
                            onClick={() => toggleColumnVisibility(column.id)}
                            className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-700 underline"
                        >
                            Show column
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    const activeColumn = localColumnConfig.find((col) => col.id === localActiveDragId);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-3 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-lg font-bold">Table Column Settings</h2>
                            <motion.button
                                type="button"
                                onClick={onClose}
                                className="text-white hover:text-indigo-200 p-1 rounded-lg hover:bg-indigo-500"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <FiX className="w-5 h-5" />
                            </motion.button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={(event) => setLocalActiveDragId(event.active.id)}
                                onDragEnd={handleModalDragEnd}
                                onDragCancel={() => setLocalActiveDragId(null)}
                            >
                                <SortableContext
                                    items={localColumnConfig.map((column) => column.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
                                        {localColumnConfig.map((column, index) => (
                                            <ModalSortableColumn key={column.id} column={column} index={index} />
                                        ))}
                                    </div>
                                </SortableContext>
                                <DragOverlay dropAnimation={null}>
                                    {activeColumn ? (
                                        <div className="bg-white border-2 border-indigo-400 shadow-xl rounded-lg p-3 w-44 pointer-events-none">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FiMove className="w-3.5 h-3.5 text-indigo-500" />
                                                <h3 className="font-bold text-gray-800 text-xs truncate">{activeColumn.name}</h3>
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                {activeColumn.items.length} item{activeColumn.items.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </div>

                        <div className="border-t px-5 py-3 bg-gray-50 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <motion.button
                                    type="button"
                                    onClick={resetToDefault}
                                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 gap-1.5 transition-all"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiRefreshCw className="w-3.5 h-3.5" /> Reset to Default
                                </motion.button>
                                <div className="flex gap-2">
                                    <motion.button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-all"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        onClick={saveChanges}
                                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 gap-1.5 transition-all"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <FiSave className="w-3.5 h-3.5" /> Save Changes
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal;
