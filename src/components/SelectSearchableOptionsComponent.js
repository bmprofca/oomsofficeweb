import React, { useState, useMemo, useRef, useEffect } from "react";

const SearchableSelectOptions = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select option...",
  labelKey = "name",
  valueKey = "value",
  className = "",
  inputClassName = "w-full border border-slate-200 px-3 py-2.5 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 bg-white outline-none"
}) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Sync display from value when value or options change (e.g. form reset)
  useEffect(() => {
    const opt = options.find((o) => o[valueKey] === value);
    setSearch(opt ? opt[labelKey] : "");
  }, [value, options, labelKey, valueKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search input
  const filteredOptions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return options;

    return options.filter((option) =>
      option[labelKey]
        ?.toString()
        .toLowerCase()
        .includes(searchTerm)
    );
  }, [search, options, labelKey]);

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setSearch(option[labelKey]);
    setIsOpen(false);
  };

  const displayValue = search || options.find((o) => o[valueKey] === value)?.[labelKey] || "";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={inputClassName}
        readOnly={false}
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option[valueKey]}
                onClick={() => handleSelect(option)}
                className="px-3 py-2.5 cursor-pointer text-sm text-gray-800 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
              >
                {option[labelKey]}
              </div>
            ))
          ) : (
            <div className="px-3 py-2.5 text-sm text-gray-500">No options found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelectOptions;
