import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import { 
    FiLayout, 
    FiGrid, 
    FiSidebar, 
    FiPlus, 
    FiTrash2, 
    FiSettings,
    FiEye,
    FiEyeOff,
    FiSave,
    FiRefreshCw,
    FiMove,
    FiCopy,
    FiEdit,
    FiMaximize,
    FiMinimize
} from 'react-icons/fi';

// Import DND Kit components
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
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Widget Component
const SortableWidget = ({ widget, onToggle, onDuplicate, onDelete, isDragging }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: widget.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getWidgetWidthClass = (type) => {
        switch (type) {
            case 'full-width': return 'col-span-2';
            case 'half-width': return 'col-span-1';
            case 'one-third': return 'col-span-1';
            case 'two-thirds': return 'col-span-2';
            default: return 'col-span-1';
        }
    };

    const getWidgetHeight = (type) => {
        switch (type) {
            case 'full-width': return 'h-32';
            case 'half-width': return 'h-48';
            default: return 'h-40';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`
                relative group border-2 rounded-lg p-4 transition-all duration-200
                ${widget.enabled 
                    ? 'border-green-200 bg-green-50 hover:border-green-300' 
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }
                ${isDragging ? 'rotate-3 shadow-xl z-50' : 'shadow-sm hover:shadow-md'}
                ${getWidgetWidthClass(widget.type)}
                cursor-grab active:cursor-grabbing
            `}
        >
            {/* Widget Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-3 h-3 rounded-full
                        ${widget.enabled ? 'bg-green-500' : 'bg-gray-400'}
                    `} />
                    <h4 className="font-semibold text-gray-800">{widget.title}</h4>
                    <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${widget.type === 'full-width' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }
                    `}>
                        {widget.type === 'full-width' ? 'Full Width' : 'Half Width'}
                    </span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(widget.id);
                        }}
                        className={`p-1 rounded ${
                            widget.enabled 
                                ? 'text-green-600 hover:bg-green-100' 
                                : 'text-gray-400 hover:bg-gray-200'
                        } transition-colors`}
                        title={widget.enabled ? 'Disable Widget' : 'Enable Widget'}
                    >
                        {widget.enabled ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                    </button>
                    
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(widget.id);
                        }}
                        className="p-1 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        title="Duplicate Widget"
                    >
                        <FiCopy className="w-4 h-4" />
                    </button>
                    
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(widget.id);
                        }}
                        className="p-1 text-red-600 rounded hover:bg-red-100 transition-colors"
                        title="Delete Widget"
                    >
                        <FiTrash2 className="w-4 h-4" />
                    </button>
                    
                    <button
                        {...listeners}
                        className="p-1 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        title="Drag to reorder"
                    >
                        <FiMove className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Widget Preview */}
            <div className={`
                bg-white border border-gray-200 rounded-lg mb-3 overflow-hidden
                ${getWidgetHeight(widget.type)}
            `}>
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="text-center text-gray-400">
                        <FiLayout className="w-8 h-8 mx-auto mb-2" />
                        <div className="text-sm">{widget.title} Preview</div>
                    </div>
                </div>
            </div>

            {/* Widget Settings Summary */}
            <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                    <span>Order:</span>
                    <span className="font-medium">#{widget.order}</span>
                </div>
                <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${
                        widget.enabled ? 'text-green-600' : 'text-gray-500'
                    }`}>
                        {widget.enabled ? 'Active' : 'Inactive'}
                    </span>
                </div>
                {widget.settings && Object.keys(widget.settings).length > 0 && (
                    <div className="flex justify-between">
                        <span>Settings:</span>
                        <span className="font-medium">
                            {Object.keys(widget.settings).length} configured
                        </span>
                    </div>
                )}
            </div>

            {/* Edit Button */}
            <button className="absolute bottom-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <FiSettings className="w-4 h-4" />
            </button>
        </div>
    );
};

// Widget Dragging Overlay
const WidgetDragOverlay = ({ widget }) => {
    const getWidgetWidthClass = (type) => {
        switch (type) {
            case 'full-width': return 'col-span-2';
            case 'half-width': return 'col-span-1';
            default: return 'col-span-1';
        }
    };

    return (
        <div className={`
            relative border-2 rounded-lg p-4 shadow-xl bg-white border-blue-300
            ${getWidgetWidthClass(widget.type)}
        `}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <h4 className="font-semibold text-gray-800">{widget.title}</h4>
                    <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${widget.type === 'full-width' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }
                    `}>
                        {widget.type === 'full-width' ? 'Full Width' : 'Half Width'}
                    </span>
                </div>
            </div>
            <div className="h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Dragging...</div>
            </div>
        </div>
    );
};

const WidgetSettings = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [widgets, setWidgets] = useState([]);
    const [availableWidgets, setAvailableWidgets] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [activeId, setActiveId] = useState(null);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
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

    // Mock initial widgets data
    const initialWidgets = [
        {
            id: 'hero-banner',
            title: 'Hero Banner',
            type: 'full-width',
            enabled: true,
            order: 1,
            settings: {
                title: 'Welcome to Our Platform',
                subtitle: 'Discover amazing features and services',
                background: 'gradient',
                showButton: true,
                buttonText: 'Get Started'
            },
            preview: '/widgets/hero-preview.jpg'
        },
        {
            id: 'features-grid',
            title: 'Features Grid',
            type: 'full-width',
            enabled: true,
            order: 2,
            settings: {
                columns: 3,
                showIcons: true,
                animation: 'fade-in'
            },
            preview: '/widgets/features-preview.jpg'
        },
        {
            id: 'stats-counter',
            title: 'Statistics Counter',
            type: 'half-width',
            enabled: true,
            order: 3,
            settings: {
                counters: 4,
                animation: 'count-up',
                background: 'light'
            },
            preview: '/widgets/stats-preview.jpg'
        },
        {
            id: 'testimonials',
            title: 'Customer Testimonials',
            type: 'half-width',
            enabled: true,
            order: 4,
            settings: {
                layout: 'carousel',
                autoPlay: true,
                showImages: true
            },
            preview: '/widgets/testimonials-preview.jpg'
        },
        {
            id: 'services',
            title: 'Our Services',
            type: 'full-width',
            enabled: false,
            order: 5,
            settings: {
                layout: 'grid',
                columns: 4,
                showPrices: false
            },
            preview: '/widgets/services-preview.jpg'
        },
        {
            id: 'team',
            title: 'Our Team',
            type: 'half-width',
            enabled: true,
            order: 6,
            settings: {
                layout: 'grid',
                columns: 4,
                showSocial: true
            },
            preview: '/widgets/team-preview.jpg'
        }
    ];

    const availableWidgetsList = [
        {
            id: 'pricing-table',
            title: 'Pricing Table',
            type: 'full-width',
            description: 'Display your pricing plans and packages',
            category: 'Business',
            icon: '💰',
            popular: true
        },
        {
            id: 'faq-section',
            title: 'FAQ Section',
            type: 'half-width',
            description: 'Frequently asked questions with accordion',
            category: 'Content',
            icon: '❓',
            popular: false
        },
        {
            id: 'timeline',
            title: 'Timeline',
            type: 'full-width',
            description: 'Show your company history or process',
            category: 'Content',
            icon: '⏱️',
            popular: false
        },
        {
            id: 'gallery',
            title: 'Image Gallery',
            type: 'full-width',
            description: 'Display images in a grid or masonry layout',
            category: 'Media',
            icon: '🖼️',
            popular: true
        }
    ];

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Load widgets
    useEffect(() => {
        fetchWidgets();
    }, []);

    const fetchWidgets = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setWidgets(initialWidgets);
            setAvailableWidgets(availableWidgetsList);
            setLoading(false);
        }, 1000);
    };

    const handleSaveWidgets = async () => {
        setSaving(true);
        // Simulate API save
        setTimeout(() => {
            setSaving(false);
            alert('Widget settings saved successfully!');
        }, 1500);
    };

    const handleResetWidgets = () => {
        if (window.confirm('Are you sure you want to reset all widgets to default?')) {
            setWidgets(initialWidgets);
        }
    };

    const toggleWidget = (widgetId) => {
        setWidgets(prev => prev.map(widget =>
            widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
        ));
    };

    const deleteWidget = (widgetId) => {
        setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
    };

    const duplicateWidget = (widgetId) => {
        const widgetToDuplicate = widgets.find(w => w.id === widgetId);
        if (widgetToDuplicate) {
            const newWidget = {
                ...widgetToDuplicate,
                id: `${widgetToDuplicate.id}-copy-${Date.now()}`,
                title: `${widgetToDuplicate.title} (Copy)`,
                order: widgets.length + 1
            };
            setWidgets(prev => [...prev, newWidget]);
        }
    };

    const addWidget = (widgetType) => {
        const widgetTemplate = availableWidgets.find(w => w.id === widgetType);
        if (widgetTemplate) {
            const newWidget = {
                id: `${widgetType}-${Date.now()}`,
                title: widgetTemplate.title,
                type: widgetTemplate.type,
                enabled: true,
                order: widgets.length + 1,
                settings: {},
                preview: `/widgets/${widgetType}-preview.jpg`
            };
            setWidgets(prev => [...prev, newWidget]);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over?.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                
                const newItems = arrayMove(items, oldIndex, newIndex);
                
                // Update order based on new position
                return newItems.map((item, index) => ({
                    ...item,
                    order: index + 1
                }));
            });
        }
    };

    const AvailableWidgetCard = ({ widget }) => (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{widget.icon}</span>
                    <div>
                        <h4 className="font-semibold text-gray-800">{widget.title}</h4>
                        <p className="text-xs text-gray-500">{widget.category}</p>
                    </div>
                </div>
                {widget.popular && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Popular
                    </span>
                )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{widget.description}</p>
            
            <div className="flex items-center justify-between">
                <span className={`
                    px-2 py-1 text-xs rounded
                    ${widget.type === 'full-width' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }
                `}>
                    {widget.type === 'full-width' ? 'Full Width' : 'Half Width'}
                </span>
                <motion.button
                    onClick={() => addWidget(widget.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <FiPlus className="w-3 h-3" />
                    Add
                </motion.button>
            </div>
        </div>
    );

    const activeWidget = widgets.find((widget) => widget.id === activeId);

    return (
        <div className="min-h-screen bg-gray-50">
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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Main Card - Full height with scrolling */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                            {/* Card Header */}
                            <div className="border-b border-gray-200 px-6 py-4">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div>
                                        <h5 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                            <FiGrid className="w-5 h-5" />
                                            Widget Management
                                        </h5>
                                        <p className="text-gray-500 text-xs mt-1">
                                            Drag and drop to rearrange widgets. Enable/disable as needed.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <motion.button
                                            onClick={() => setEditMode(!editMode)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                                editMode 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiEdit className="w-4 h-4" />
                                            {editMode ? 'Editing Mode' : 'Edit Layout'}
                                        </motion.button>
                                        <motion.button
                                            onClick={handleResetWidgets}
                                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiRefreshCw className="w-4 h-4" />
                                            Reset
                                        </motion.button>
                                        <motion.button
                                            onClick={handleSaveWidgets}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FiSave className="w-4 h-4" />
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                                    {/* Main Widgets Area */}
                                    <div className="xl:col-span-3">
                                        <div className="bg-white rounded-lg border border-gray-200">
                                            <div className="border-b border-gray-200 px-6 py-4">
                                                <h6 className="text-lg font-semibold text-gray-800">
                                                    Current Widget Layout
                                                </h6>
                                                <p className="text-sm text-gray-600">
                                                    {widgets.filter(w => w.enabled).length} of {widgets.length} widgets active
                                                </p>
                                            </div>

                                            <div className="p-6">
                                                {loading ? (
                                                    <div className="flex justify-center items-center py-12">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                    </div>
                                                ) : (
                                                    <DndContext
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragStart={handleDragStart}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <SortableContext items={widgets.map(w => w.id)}>
                                                            <div className="grid grid-cols-2 gap-4 min-h-96 relative">
                                                                {/* Grid Background Lines */}
                                                                <div className="absolute inset-0 pointer-events-none grid grid-cols-2 gap-4">
                                                                    {[...Array(6)].map((_, i) => (
                                                                        <div key={i} className="border border-dashed border-gray-200 rounded-lg" />
                                                                    ))}
                                                                </div>

                                                                {widgets.map((widget) => (
                                                                    <SortableWidget
                                                                        key={widget.id}
                                                                        widget={widget}
                                                                        onToggle={toggleWidget}
                                                                        onDuplicate={duplicateWidget}
                                                                        onDelete={deleteWidget}
                                                                        isDragging={activeId === widget.id}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </SortableContext>

                                                        <DragOverlay>
                                                            {activeWidget ? (
                                                                <WidgetDragOverlay widget={activeWidget} />
                                                            ) : null}
                                                        </DragOverlay>
                                                    </DndContext>
                                                )}

                                                {/* Widget Statistics */}
                                                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                        <div className="text-2xl font-bold text-gray-800">{widgets.length}</div>
                                                        <div className="text-sm text-gray-600">Total Widgets</div>
                                                    </div>
                                                    <div className="bg-green-50 rounded-lg p-4 text-center">
                                                        <div className="text-2xl font-bold text-green-800">
                                                            {widgets.filter(w => w.enabled).length}
                                                        </div>
                                                        <div className="text-sm text-green-600">Active Widgets</div>
                                                    </div>
                                                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                                                        <div className="text-2xl font-bold text-blue-800">
                                                            {widgets.filter(w => w.type === 'full-width').length}
                                                        </div>
                                                        <div className="text-sm text-blue-600">Full Width</div>
                                                    </div>
                                                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                                                        <div className="text-2xl font-bold text-purple-800">
                                                            {widgets.filter(w => w.type === 'half-width').length}
                                                        </div>
                                                        <div className="text-sm text-purple-600">Half Width</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Available Widgets Sidebar */}
                                    <div className="xl:col-span-1">
                                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm sticky top-6">
                                            <div className="border-b border-gray-200 px-6 py-4">
                                                <h6 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                                    <FiPlus className="w-4 h-4" />
                                                    Available Widgets
                                                </h6>
                                                <p className="text-sm text-gray-600">
                                                    Add new widgets to your layout
                                                </p>
                                            </div>

                                            <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                                                {availableWidgets.map((widget) => (
                                                    <AvailableWidgetCard key={widget.id} widget={widget} />
                                                ))}
                                                
                                                {/* Custom Widget Option */}
                                                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                                                    <FiPlus className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                                    <h6 className="font-medium text-gray-700 mb-1">Custom Widget</h6>
                                                    <p className="text-xs text-gray-500 mb-3">
                                                        Create a custom widget from scratch
                                                    </p>
                                                    <motion.button
                                                        className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-white transition-colors"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        Create Custom Widget
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetSettings;