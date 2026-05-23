import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';

const SearchableDropdown = ({
  data = [],
  valueField = 'id',
  displayField = 'name',
  placeholder = 'Select...',
  onSelect,
  selectedValue = '',
  isSearchable = true,
  className = '',
  disabled = false,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Find selected item
  const selectedItem = data.find(item => String(item[valueField]) === String(selectedValue));

  // Filter data based on search term
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return String(item[displayField]).toLowerCase().includes(searchLower);
  });

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onSelect(item);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-3 py-2
          border border-gray-300 rounded-lg
          bg-white text-sm cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
      >
        <div className="flex-1 truncate">
          {selectedItem ? (
            <span className="text-slate-800">{selectedItem[displayField]}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedValue && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full"
              type="button"
            >
              <FiX className="w-3 h-3 text-slate-500" />
            </button>
          )}
          <FiChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 flex flex-col">
          {/* Search Input */}
          {isSearchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-500">
                Loading...
              </div>
            ) : filteredData.length > 0 ? (
              filteredData.map((item) => (
                <div
                  key={item[valueField]}
                  onClick={() => handleSelect(item)}
                  className={`
                    px-3 py-2 text-sm cursor-pointer
                    ${String(item[valueField]) === String(selectedValue)
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-slate-800'
                    }
                  `}
                >
                  {item[displayField]}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-slate-500">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;