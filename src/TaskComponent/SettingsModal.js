// components/SettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMove, FiSave, FiRefreshCw, FiPlus, FiArrowUp, FiArrowDown, FiEye, FiEyeOff } from 'react-icons/fi';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SettingsModal = ({ isOpen, onClose, columnConfig, saveColumnConfig, defaultColumnConfig, availableFields }) => {
    const [localColumnConfig, setLocalColumnConfig] = useState(columnConfig);
    const [localActiveDragId, setLocalActiveDragId] = useState(null);
    const [localActiveItemDragId, setLocalActiveItemDragId] = useState(null);
    
    // Store hidden state per column and per field
    const [hiddenColumns, setHiddenColumns] = useState({});
    const [hiddenFields, setHiddenFields] = useState({});

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        setLocalColumnConfig(columnConfig);
    }, [columnConfig, isOpen]);

    const handleModalDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setLocalActiveDragId(null);
            return;
        }
        
        const oldIndex = localColumnConfig.findIndex((col) => col.id === active.id);
        const newIndex = localColumnConfig.findIndex((col) => col.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) {
            setLocalActiveDragId(null);
            return;
        }
        
        const sourceColumn = localColumnConfig[oldIndex];
        const targetColumn = localColumnConfig[newIndex];
        
        if (sourceColumn.fixed) {
            setLocalActiveDragId(null);
            return;
        }
        
        if (targetColumn.fixed) {
            if (newIndex > oldIndex) {
                const firstFixedIndex = localColumnConfig.findIndex(col => col.fixed);
                if (firstFixedIndex > 0) {
                    const newConfig = arrayMove(localColumnConfig, oldIndex, firstFixedIndex - 1);
                    setLocalColumnConfig(newConfig);
                }
            } else {
                const lastNonFixedIndex = localColumnConfig.reduce((lastIndex, col, index) => !col.fixed ? index : lastIndex, -1);
                if (lastNonFixedIndex !== -1) {
                    const newConfig = arrayMove(localColumnConfig, oldIndex, lastNonFixedIndex);
                    setLocalColumnConfig(newConfig);
                }
            }
        } else {
            const newConfig = arrayMove(localColumnConfig, oldIndex, newIndex);
            setLocalColumnConfig(newConfig);
        }
        setLocalActiveDragId(null);
    };

    const handleModalItemDragEnd = (event, columnIndex) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setLocalColumnConfig((items) => {
                const newConfig = [...items];
                const columnItems = newConfig[columnIndex].items;
                const oldIndex = columnItems.findIndex((item) => item.id === active.id);
                const newIndex = columnItems.findIndex((item) => item.id === over.id);
                newConfig[columnIndex].items = arrayMove(columnItems, oldIndex, newIndex);
                return newConfig;
            });
        }
        setLocalActiveItemDragId(null);
    };

    // Move item up within column
    const moveItemUp = (columnIndex, itemIndex) => {
        if (itemIndex > 0) {
            setLocalColumnConfig((prev) => {
                const newConfig = [...prev];
                const items = [...newConfig[columnIndex].items];
                [items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]];
                newConfig[columnIndex].items = items;
                return newConfig;
            });
        }
    };

    // Move item down within column
    const moveItemDown = (columnIndex, itemIndex) => {
        setLocalColumnConfig((prev) => {
            const newConfig = [...prev];
            const items = [...newConfig[columnIndex].items];
            if (itemIndex < items.length - 1) {
                [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
                newConfig[columnIndex].items = items;
            }
            return newConfig;
        });
    };

    // Toggle field visibility (hide/show)
    const toggleFieldVisibility = (columnId, itemId) => {
        const fieldKey = `${columnId}_${itemId}`;
        setHiddenFields(prev => ({
            ...prev,
            [fieldKey]: !prev[fieldKey]
        }));
    };

    // Toggle column visibility
    const toggleColumnVisibility = (columnId) => {
        setHiddenColumns(prev => ({
            ...prev,
            [columnId]: !prev[columnId]
        }));
    };

    const isFieldHidden = (columnId, itemId) => {
        const fieldKey = `${columnId}_${itemId}`;
        return hiddenFields[fieldKey] || false;
    };

    const isColumnHidden = (columnId) => {
        return hiddenColumns[columnId] || false;
    };

    const addItemToColumn = (columnIndex, fieldId) => {
        const field = availableFields.find(f => f.id === fieldId);
        if (!field) return;

        const fieldExists = localColumnConfig.some(col => 
            col.items.some(item => item.id === field.id)
        );
        
        if (fieldExists) {
            alert(`${field.label} is already added to another column`);
            return;
        }

        const newConfig = [...localColumnConfig];
        if (newConfig[columnIndex].items.length < 5) {
            newConfig[columnIndex].items.push({ id: field.id, label: field.label });
            setLocalColumnConfig(newConfig);
        } else {
            alert('Maximum 5 fields per column');
        }
    };

    const removeItemFromColumn = (columnIndex, columnId, itemId) => {
        const fieldKey = `${columnId}_${itemId}`;
        setHiddenFields(prev => {
            const newHidden = { ...prev };
            delete newHidden[fieldKey];
            return newHidden;
        });
        
        const newConfig = [...localColumnConfig];
        newConfig[columnIndex].items = newConfig[columnIndex].items.filter(item => item.id !== itemId);
        setLocalColumnConfig(newConfig);
    };

    const addNewColumn = () => {
        const newConfig = [...localColumnConfig];
        const newColumnId = `col-${Date.now()}`;
        const firstFixedIndex = newConfig.findIndex(col => col.fixed);
        const insertIndex = firstFixedIndex >= 0 ? firstFixedIndex : newConfig.length;
        newConfig.splice(insertIndex, 0, {
            id: newColumnId,
            name: `New Column`,
            items: [],
            fixed: false
        });
        setLocalColumnConfig(newConfig);
    };
// components/SettingsModal.jsx (Updated saveChanges function)

const saveChanges = () => {
    // Save both column config and visibility states
    const configToSave = {
        columns: localColumnConfig,
        hiddenColumns: hiddenColumns,
        hiddenFields: hiddenFields
    };
    localStorage.setItem('taskColumnConfig', JSON.stringify(configToSave));
    
    // Also save just the columns for backward compatibility
    saveColumnConfig(localColumnConfig);
    
    // Dispatch a custom event to notify TaskDisplay about hidden states
    window.dispatchEvent(new CustomEvent('columnVisibilityChanged', { 
        detail: { hiddenColumns, hiddenFields } 
    }));
    
    onClose();
};

    const resetToDefault = () => {
        setLocalColumnConfig(JSON.parse(JSON.stringify(defaultColumnConfig)));
        setHiddenColumns({});
        setHiddenFields({});
    };

    const removeColumn = (columnIndex, columnId) => {
        setHiddenColumns(prev => {
            const newHidden = { ...prev };
            delete newHidden[columnId];
            return newHidden;
        });
        
        const newConfig = [...localColumnConfig];
        newConfig.splice(columnIndex, 1);
        setLocalColumnConfig(newConfig);
    };

    const ModalSortableColumn = ({ column, index }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
            id: column.id,
            disabled: column.fixed
        });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            zIndex: isDragging ? 1000 : 1,
            cursor: column.fixed ? 'not-allowed' : 'move'
        };

        const isColumnHiddenLocal = isColumnHidden(column.id);

        return (
            <motion.div 
                ref={setNodeRef} 
                style={style} 
                {...(column.fixed ? {} : attributes)} 
                {...(column.fixed ? {} : listeners)}
                className={`border-2 rounded-xl p-3 transition-all duration-200 ${isColumnHiddenLocal ? 'opacity-60 bg-gray-100' : ''} ${column.fixed ? 'bg-indigo-50 border-indigo-300 shadow-sm cursor-not-allowed' : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300 cursor-move'}`}
                whileHover={{ scale: column.fixed ? 1 : 1.01 }}
            >
                {/* Column Header - Compact */}
                <div className="mb-2 pb-2 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {!column.fixed && <FiMove className="w-3.5 h-3.5 text-gray-400 cursor-grab flex-shrink-0" />}
                            <h3 className="font-bold text-gray-800 text-xs truncate">{column.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {!column.fixed && (
                                <button 
                                    onClick={() => toggleColumnVisibility(column.id)}
                                    className={`p-1 rounded transition-colors ${isColumnHiddenLocal ? 'text-gray-600 bg-gray-200' : 'text-indigo-600 hover:bg-indigo-50'}`}
                                    title={isColumnHiddenLocal ? "Show column" : "Hide column"}
                                >
                                    {isColumnHiddenLocal ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
                                </button>
                            )}
                            {!column.fixed && column.items.length === 0 && (
                                <button onClick={() => removeColumn(index, column.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Delete column">
                                    <FiX className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        {column.fixed && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">Fixed</span>}
                        <span className="text-[10px] text-gray-500">{column.items.length} item{column.items.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Column Items */}
                {!isColumnHiddenLocal && (
                    <>
                        <div className="space-y-1.5 mb-2 min-h-[50px]">
                            {column.items.map((item, itemIndex) => {
                                const isFieldHiddenLocal = isFieldHidden(column.id, item.id);
                                return (
                                    <div key={item.id} className="flex items-center gap-1">
                                        <div className="flex-1">
                                            <ModalSortableItem 
                                                item={item} 
                                                columnId={column.id}
                                                itemIndex={itemIndex} 
                                                removeItem={removeItemFromColumn}
                                                isHidden={isFieldHiddenLocal}
                                                toggleVisibility={() => toggleFieldVisibility(column.id, item.id)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                                            <button
                                                onClick={() => moveItemUp(index, itemIndex)}
                                                disabled={itemIndex === 0}
                                                className={`p-0.5 rounded transition-colors ${itemIndex === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                title="Move Up"
                                            >
                                                <FiArrowUp className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => moveItemDown(index, itemIndex)}
                                                disabled={itemIndex === column.items.length - 1}
                                                className={`p-0.5 rounded transition-colors ${itemIndex === column.items.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                title="Move Down"
                                            >
                                                <FiArrowDown className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Field Dropdown - Compact */}
                        {column.items.length < 5 && (
                            <select 
                                value="" 
                                onChange={(e) => { if (e.target.value) { addItemToColumn(index, e.target.value); e.target.value = ''; } }}
                                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 bg-white"
                            >
                                <option value="">+ Add field</option>
                                {availableFields
                                    .filter(field => field.id !== 'menu')
                                    .filter(field => !localColumnConfig.some(col => col.items.some(item => item.id === field.id)))
                                    .map(field => (
                                        <option key={field.id} value={field.id}>{field.label}</option>
                                    ))}
                            </select>
                        )}

                        {column.items.length === 0 && (
                            <div className="text-center py-3 text-gray-400 text-[11px]">
                                <p>No fields added</p>
                            </div>
                        )}
                    </>
                )}

                {isColumnHiddenLocal && (
                    <div className="text-center py-4 text-gray-500 text-xs">
                        <FiEyeOff className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <p>Column hidden</p>
                        <button 
                            onClick={() => toggleColumnVisibility(column.id)}
                            className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-700 underline"
                        >
                            Show column
                        </button>
                    </div>
                )}
            </motion.div>
        );
    };

    const ModalSortableItem = ({ item, columnId, itemIndex, removeItem, isHidden, toggleVisibility }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
        const style = { 
            transform: CSS.Transform.toString(transform), 
            transition, 
            opacity: isDragging ? 0.5 : 1, 
            zIndex: isDragging ? 1000 : 1 
        };

        return (
            <motion.div 
                ref={setNodeRef} 
                style={style} 
                {...attributes} 
                {...listeners}
                className={`flex items-center justify-between bg-white border rounded-md px-2 py-1.5 text-xs transition-all duration-200 ${isHidden ? 'opacity-50 bg-gray-50' : ''} ${isDragging ? 'shadow-lg border-indigo-400' : 'border-gray-200 hover:bg-gray-50'}`}
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: itemIndex * 0.03 }}
            >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <FiMove className="w-3 h-3 text-gray-400 cursor-grab flex-shrink-0" />
                    <span className={`font-medium text-gray-700 text-[11px] truncate ${isHidden ? 'line-through' : ''}`}>
                        {item.label}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button 
                        onClick={toggleVisibility}
                        className={`p-0.5 rounded transition-colors ${isHidden ? 'text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title={isHidden ? "Show field" : "Hide field"}
                    >
                        {isHidden ? <FiEye className="w-3 h-3" /> : <FiEyeOff className="w-3 h-3" />}
                    </button>
                    <button 
                        onClick={() => removeItem(itemIndex, columnId, item.id)} 
                        className="text-gray-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors"
                        title="Remove field"
                    >
                        <FiX className="w-3 h-3" />
                    </button>
                </div>
            </motion.div>
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                    <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-3 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-bold">Table Column Settings</h2>
                                <span className="text-indigo-100 text-xs">— Drag & drop, hide/show fields</span>
                            </div>
                            <motion.button onClick={onClose} className="text-white hover:text-indigo-200 p-1 rounded-lg hover:bg-indigo-500" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <FiX className="w-5 h-5" />
                            </motion.button>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto flex-1">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => setLocalActiveDragId(event.active.id)}
                                onDragEnd={handleModalDragEnd} onDragCancel={() => setLocalActiveDragId(null)}>
                                <SortableContext items={localColumnConfig.map(column => column.id)} strategy={horizontalListSortingStrategy}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
                                        {localColumnConfig.map((column, index) => (
                                            <ModalSortableColumn key={column.id} column={column} index={index} />
                                        ))}
                                    </div>
                                </SortableContext>
                                <DragOverlay>
                                    {localActiveDragId ? (
                                        <div className="bg-white border-2 border-indigo-300 shadow-xl rounded-lg p-3 w-40">
                                            <div className="flex items-center gap-2 mb-2"><FiMove className="w-3.5 h-3.5 text-indigo-400" /><h3 className="font-bold text-gray-800 text-xs">{localColumnConfig.find(col => col.id === localActiveDragId)?.name || 'Column'}</h3></div>
                                            <div className="text-[10px] text-gray-500">{localColumnConfig.find(col => col.id === localActiveDragId)?.items.length || 0} items</div>
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>

                            {/* Add New Column Button */}
                            <div className="mb-4">
                                <motion.button 
                                    onClick={addNewColumn} 
                                    className="px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 text-sm font-medium hover:from-gray-200 hover:to-gray-300 flex items-center gap-1.5 transition-all" 
                                    whileHover={{ scale: 1.01 }} 
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiPlus className="w-4 h-4" /> Add New Column
                                </motion.button>
                            </div>

                            {/* Info Box - Compact */}
                            <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-[11px] text-blue-700 flex items-center gap-3 flex-wrap">
                                    <strong>💡 Tips:</strong> 
                                    <span>Drag columns to reorder</span>
                                    <span>↑↓ arrows to move fields</span>
                                    <span>👁️ icons to hide/show</span>
                                    <span>🗑️ to remove fields</span>
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t px-5 py-3 bg-gray-50 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <motion.button 
                                    onClick={resetToDefault} 
                                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 gap-1.5 transition-all" 
                                    whileHover={{ scale: 1.02 }} 
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiRefreshCw className="w-3.5 h-3.5" /> Reset to Default
                                </motion.button>
                                <div className="flex gap-2">
                                    <motion.button onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                                    <motion.button onClick={saveChanges} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 gap-1.5 transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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