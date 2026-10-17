import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiArrowRight, FiExternalLink } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Pagination = ({
    pagination,
    onPageChange,
    onLimitChange,
    loading = false,
    onCustomPageChange,
    showPageInfo = true,
    showLimitSelector = true,
    showCustomInput = true,
    className = ''
}) => {
    const { page, limit, total, total_pages, is_last_page } = pagination;
    
    const [customPageInput, setCustomPageInput] = useState(page.toString());
    
    // Update custom page input when page changes via pagination
    useEffect(() => {
        setCustomPageInput(page.toString());
    }, [page]);
    
    const handleCustomPageSubmit = (e) => {
        e.preventDefault();
        if (customPageInput && !isNaN(customPageInput)) {
            const pageNum = parseInt(customPageInput);
            if (pageNum >= 1 && pageNum <= total_pages) {
                onCustomPageChange(pageNum);
            } else {
                // Reset to current page if invalid
                setCustomPageInput(page.toString());
            }
        }
    };

    const handleCustomPageChange = (e) => {
        const value = e.target.value;
        // Allow empty string or numbers only
        if (value === '' || /^\d+$/.test(value)) {
            setCustomPageInput(value);
        }
    };

    const handleCustomPageBlur = () => {
        if (customPageInput === '') {
            setCustomPageInput(page.toString());
        } else {
            const pageNum = parseInt(customPageInput);
            if (pageNum >= 1 && pageNum <= total_pages) {
                if (pageNum !== page) {
                    onCustomPageChange(pageNum);
                }
            } else {
                setCustomPageInput(page.toString());
            }
        }
    };
    
    const renderPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        
        if (total_pages <= maxVisiblePages) {
            for (let i = 1; i <= total_pages; i++) {
                pages.push(i);
            }
        } else {
            let startPage = Math.max(1, page - 2);
            let endPage = Math.min(total_pages, page + 2);
            
            if (page <= 3) {
                endPage = maxVisiblePages;
            } else if (page >= total_pages - 2) {
                startPage = total_pages - maxVisiblePages + 1;
            }
            
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) {
                    pages.push('...');
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            if (endPage < total_pages) {
                if (endPage < total_pages - 1) {
                    pages.push('...');
                }
                pages.push(total_pages);
            }
        }
        
        return pages;
    };
    
    const pageNumbers = renderPageNumbers();
    
    return (
        <div className={`flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-t border-gray-200 ${className}`}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Items per page selector */}
                {showLimitSelector && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show:</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            disabled={loading}
                            className="border border-slate-200 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 bg-white disabled:opacity-50"
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span className="text-sm text-gray-600">per page</span>
                    </div>
                )}
                
                {/* Page info */}
                {showPageInfo && (
                    <div className="text-sm text-gray-600">
                        Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{total_pages}</span> • 
                        <span className="font-semibold ml-1">{total}</span> total items
                    </div>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Page navigation */}
                <div className="flex items-center gap-2">
                    {/* Previous button */}
                    <motion.button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1 || loading}
                        className="p-2 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                    </motion.button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                        {pageNumbers.map((pageNum, index) => (
                            pageNum === '...' ? (
                                <span key={`ellipsis-${index}`} className="text-gray-400 mx-1">...</span>
                            ) : (
                                <motion.button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    disabled={loading}
                                    className={`w-8 h-8 rounded text-sm font-medium ${
                                        page === pageNum
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'border border-slate-200 text-gray-700 hover:bg-slate-100'
                                    } disabled:opacity-50`}
                                >
                                    {pageNum}
                                </motion.button>
                            )
                        ))}
                    </div>
                    
                    {/* Next button */}
                    <motion.button
                        onClick={() => onPageChange(page + 1)}
                        disabled={is_last_page || loading}
                        className="p-2 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FiArrowRight className="w-4 h-4" />
                    </motion.button>
                </div>
                
                {/* Always visible custom page input */}
                {showCustomInput && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Go to:</span>
                        <form onSubmit={handleCustomPageSubmit} className="flex items-center gap-1">
                            <input
                                type="text"
                                min="1"
                                max={total_pages}
                                value={customPageInput}
                                onChange={handleCustomPageChange}
                                onBlur={handleCustomPageBlur}
                                disabled={loading}
                                className="w-16 border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 disabled:opacity-50"
                                placeholder={page.toString()}
                            />
                            <button
                                type="submit"
                                disabled={loading || customPageInput === page.toString() || customPageInput === ''}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Go
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Pagination;