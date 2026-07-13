import React, {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import useDebounce from './useDebounce';

const theme = {
    primary: '#4f46e5',
    primarySoft: '#eef2ff',
    border: '#d1d5db',
    borderHover: '#9ca3af',
    bg: '#ffffff',
    menuBg: '#ffffff',
    text: '#111827',
    textMuted: '#6b7280',
    danger: '#dc2626',
    radius: '0.5rem',
    shadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
};

const baseStyles = {
    field: {
        position: 'relative',
        width: '100%',
        fontFamily: 'inherit',
    },
    label: {
        display: 'block',
        marginBottom: '0.375rem',
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: theme.text,
    },
    required: {
        color: theme.danger,
        marginLeft: '0.125rem',
    },
    value: {
        flex: 1,
        minWidth: 0,
        fontSize: '0.875rem',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    placeholder: {
        color: theme.textMuted,
    },
    multiInput: {
        flex: '1 1 4rem',
        minWidth: '4rem',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontSize: '0.875rem',
        color: theme.text,
        padding: '0.125rem 0',
    },
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        maxWidth: '100%',
        padding: '0.125rem 0.375rem',
        borderRadius: '0.375rem',
        background: theme.primarySoft,
        color: theme.primary,
        fontSize: '0.75rem',
        fontWeight: 500,
    },
    chipLabel: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    chipRemove: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1,
        fontSize: '0.875rem',
    },
    indicators: {
        position: 'absolute',
        right: '0.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        pointerEvents: 'none',
    },
    clearBtn: {
        pointerEvents: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        color: theme.textMuted,
        cursor: 'pointer',
        padding: '0.125rem',
        lineHeight: 1,
    },
    chevron: {
        pointerEvents: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        color: theme.textMuted,
        padding: '0.125rem',
        lineHeight: 1,
        transition: 'transform 0.15s ease',
    },
    menu: {
        position: 'absolute',
        zIndex: 50,
        left: 0,
        right: 0,
        marginTop: '0.25rem',
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        background: theme.menuBg,
        boxShadow: theme.shadow,
        overflow: 'hidden',
    },
    searchRow: {
        padding: '0.5rem',
        borderBottom: '1px solid #f3f4f6',
    },
    searchInput: {
        width: '100%',
        padding: '0.5rem 0.625rem',
        border: `1px solid ${theme.border}`,
        borderRadius: 'calc(0.5rem - 2px)',
        fontSize: '0.875rem',
        outline: 'none',
    },
    options: {
        maxHeight: 240,
        overflowY: 'auto',
        padding: '0.25rem',
    },
    option: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0.5rem 0.625rem',
        border: 'none',
        borderRadius: 'calc(0.5rem - 2px)',
        background: 'transparent',
        color: theme.text,
        fontSize: '0.875rem',
        textAlign: 'left',
        cursor: 'pointer',
    },
    message: {
        padding: '0.75rem',
        textAlign: 'center',
        fontSize: '0.8125rem',
        color: theme.textMuted,
    },
    helper: {
        marginTop: '0.25rem',
        fontSize: '0.75rem',
        color: theme.textMuted,
    },
    errorText: {
        marginTop: '0.25rem',
        fontSize: '0.75rem',
        color: theme.danger,
    },
    check: {
        width: '1rem',
        height: '1rem',
        flexShrink: 0,
        accentColor: theme.primary,
    },
};

const getControlStyle = ({
    isOpen,
    isDisabled,
    error,
    isMulti,
    isHovered,
}) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minHeight: '2.5rem',
    width: '100%',
    padding: isMulti ? '0.25rem 2rem 0.25rem 0.625rem' : '0.375rem 2rem 0.375rem 0.625rem',
    border: `1px solid ${
        error ? theme.danger : isOpen ? theme.primary : isHovered && !isDisabled ? theme.borderHover : theme.border
    }`,
    borderRadius: theme.radius,
    background: isDisabled ? '#f9fafb' : theme.bg,
    color: theme.text,
    cursor: isDisabled ? 'not-allowed' : isMulti ? 'text' : 'pointer',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    textAlign: 'left',
    opacity: isDisabled ? 0.6 : 1,
    flexWrap: isMulti ? 'wrap' : 'nowrap',
    gap: isMulti ? '0.25rem' : undefined,
    boxShadow: isOpen && !error ? `0 0 0 3px ${theme.primarySoft}` : 'none',
});

const getOptionStyle = ({ disabled, selected, isFocused, isHovered }) => ({
    ...baseStyles.option,
    background: disabled
        ? 'transparent'
        : isFocused
          ? theme.primarySoft
          : isHovered
            ? '#f3f4f6'
            : 'transparent',
    color: isFocused && !disabled ? theme.primary : theme.text,
    fontWeight: selected ? 600 : 400,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
});

const defaultGetOptionLabel = (opt) => opt?.label ?? '';
const defaultGetOptionValue = (opt) => opt?.value;
const defaultIsOptionDisabled = (opt) => Boolean(opt?.isDisabled);

const normalizeLoadOptionsResult = (result) => {
    if (Array.isArray(result)) {
        return { options: result, hasMore: false };
    }
    return {
        options: Array.isArray(result?.options) ? result.options : [],
        hasMore: Boolean(result?.hasMore),
    };
};

const MENU_MAX_HEIGHT = 240;
const MENU_MIN_HEIGHT = 96;
const MENU_GAP = 4;
/** Above BaseModal shell (z-[10051]) and date-picker portals */
const MENU_PORTAL_Z_INDEX = 10060;

/**
 * Dependency-free searchable select replacement.
 * Local mode: pass `options`. API mode: pass `loadOptions` (takes priority).
 */
export default function CustomSelect({
    options,
    loadOptions,
    defaultOptions = true,

    value = null,
    onChange,

    isMulti = false,
    isSearchable = true,
    isClearable = true,
    isDisabled = false,
    minSearchLength = 0,
    debounceMs = 350,

    getOptionLabel = defaultGetOptionLabel,
    getOptionValue = defaultGetOptionValue,
    isOptionDisabled = defaultIsOptionDisabled,
    renderOption,

    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    noOptionsMessage = 'No options found',
    loadingMessage = 'Loading...',
    label,
    required = false,
    error,
    helperText,
    name,
    usePortal = true,
}) {
    const isApiMode = typeof loadOptions === 'function';
    const listboxId = useId();
    const fieldRef = useRef(null);
    const controlRef = useRef(null);
    const menuRef = useRef(null);
    const singleSearchRef = useRef(null);
    const multiSearchRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [asyncOptions, setAsyncOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [hasLoadedDefault, setHasLoadedDefault] = useState(false);
    const [asyncPage, setAsyncPage] = useState(1);
    const [hasMoreOptions, setHasMoreOptions] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isControlHovered, setIsControlHovered] = useState(false);
    const [isClearHovered, setIsClearHovered] = useState(false);
    const [hoveredOptionIndex, setHoveredOptionIndex] = useState(-1);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [menuPosition, setMenuPosition] = useState(null);

    const debouncedQuery = useDebounce(searchQuery, debounceMs);

    const selectedValues = useMemo(() => {
        if (isMulti) {
            return Array.isArray(value) ? value : [];
        }
        return value ? [value] : [];
    }, [isMulti, value]);

    const isValueSelected = useCallback(
        (option) =>
            selectedValues.some(
                (selected) =>
                    getOptionValue(selected) === getOptionValue(option)
            ),
        [getOptionValue, selectedValues]
    );

    const localFilteredOptions = useMemo(() => {
        if (isApiMode || !Array.isArray(options)) {
            return [];
        }

        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return options;
        }

        return options.filter((option) =>
            getOptionLabel(option).toLowerCase().includes(query)
        );
    }, [getOptionLabel, isApiMode, options, searchQuery]);

    const visibleOptions = isApiMode ? asyncOptions : localFilteredOptions;

    const enabledOptions = useMemo(
        () => visibleOptions.filter((option) => !isOptionDisabled(option)),
        [isOptionDisabled, visibleOptions]
    );

    const updateMenuPosition = useCallback(() => {
        const el = controlRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openAbove =
            spaceBelow < MENU_MAX_HEIGHT + MENU_GAP && spaceAbove > spaceBelow;
        const availableSpace = openAbove ? spaceAbove - MENU_GAP : spaceBelow - MENU_GAP;
        const maxHeight = Math.min(
            MENU_MAX_HEIGHT,
            Math.max(availableSpace, MENU_MIN_HEIGHT)
        );

        setMenuPosition({
            left: rect.left,
            width: rect.width,
            maxHeight,
            placement: openAbove ? 'top' : 'bottom',
            top: openAbove ? undefined : rect.bottom + MENU_GAP,
            bottom: openAbove ? window.innerHeight - rect.top + MENU_GAP : undefined,
        });
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        setHoveredOptionIndex(-1);
        setMenuPosition(null);
    }, []);

    const openMenu = useCallback(() => {
        if (isDisabled) {
            return;
        }
        if (usePortal) {
            updateMenuPosition();
        }
        setIsOpen(true);
        setHighlightedIndex(-1);
    }, [isDisabled, usePortal, updateMenuPosition]);

    const emitChange = useCallback(
        (next) => {
            onChange?.(next);
        },
        [onChange]
    );

    const selectOption = useCallback(
        (option) => {
            if (!option || isOptionDisabled(option)) {
                return;
            }

            if (isMulti) {
                const next = isValueSelected(option)
                    ? selectedValues.filter(
                          (item) =>
                              getOptionValue(item) !== getOptionValue(option)
                      )
                    : [...selectedValues, option];
                emitChange(next);
                setSearchQuery('');
                multiSearchRef.current?.focus();
            } else {
                emitChange(option);
                closeMenu();
                controlRef.current?.focus();
            }
        },
        [
            closeMenu,
            emitChange,
            getOptionValue,
            isMulti,
            isOptionDisabled,
            isValueSelected,
            selectedValues,
        ]
    );

    const clearValue = useCallback(
        (event) => {
            event?.preventDefault();
            event?.stopPropagation();
            emitChange(isMulti ? [] : null);
            setSearchQuery('');
        },
        [emitChange, isMulti]
    );

    const removeChip = useCallback(
        (option, event) => {
            event?.preventDefault();
            event?.stopPropagation();
            if (!isMulti) {
                return;
            }
            const next = selectedValues.filter(
                (item) => getOptionValue(item) !== getOptionValue(option)
            );
            emitChange(next);
        },
        [emitChange, getOptionValue, isMulti, selectedValues]
    );

    const moveHighlight = useCallback(
        (direction) => {
            if (!enabledOptions.length) {
                setHighlightedIndex(-1);
                return;
            }

            setHighlightedIndex((current) => {
                if (current < 0) {
                    return direction > 0 ? 0 : enabledOptions.length - 1;
                }

                const next = current + direction;
                if (next < 0) {
                    return enabledOptions.length - 1;
                }
                if (next >= enabledOptions.length) {
                    return 0;
                }
                return next;
            });
        },
        [enabledOptions.length]
    );

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (isMulti) {
            multiSearchRef.current?.focus();
        } else if (isSearchable) {
            singleSearchRef.current?.focus();
        }
    }, [isMulti, isOpen, isSearchable]);

    useEffect(() => {
        if (!isOpen || !isApiMode) {
            return;
        }

        let cancelled = false;

        const fetchOptions = async () => {
            const query = debouncedQuery.trim();

            if (!defaultOptions && !hasLoadedDefault && query.length === 0) {
                setAsyncOptions([]);
                setHasMoreOptions(false);
                setAsyncPage(1);
                setIsLoading(false);
                return;
            }

            if (query.length < minSearchLength) {
                if (defaultOptions && query.length === 0) {
                    setIsLoading(true);
                    setFetchError(null);
                } else {
                    setAsyncOptions([]);
                    setHasMoreOptions(false);
                    setAsyncPage(1);
                    setIsLoading(false);
                    return;
                }
            } else {
                setIsLoading(true);
                setFetchError(null);
            }

            try {
                const results = await loadOptions(query, 1);
                if (cancelled) {
                    return;
                }
                const { options, hasMore } = normalizeLoadOptionsResult(results);
                setAsyncOptions(options);
                setHasMoreOptions(hasMore);
                setAsyncPage(1);
                setFetchError(null);
                if (query.length === 0) {
                    setHasLoadedDefault(true);
                }
            } catch (err) {
                if (cancelled) {
                    return;
                }
                setAsyncOptions([]);
                setHasMoreOptions(false);
                setAsyncPage(1);
                setFetchError(
                    err?.message || 'Failed to load options'
                );
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchOptions();

        return () => {
            cancelled = true;
        };
    }, [
        debouncedQuery,
        defaultOptions,
        hasLoadedDefault,
        isApiMode,
        isOpen,
        loadOptions,
        minSearchLength,
    ]);

    const loadMoreAsyncOptions = useCallback(async () => {
        if (!isApiMode || !hasMoreOptions || isLoading || isLoadingMore) {
            return;
        }

        const query = debouncedQuery.trim();
        if (
            query.length < minSearchLength &&
            !(defaultOptions && query.length === 0)
        ) {
            return;
        }

        setIsLoadingMore(true);
        try {
            const nextPage = asyncPage + 1;
            const results = await loadOptions(query, nextPage);
            const { options, hasMore } = normalizeLoadOptionsResult(results);
            setAsyncOptions((prev) => {
                const seen = new Set(prev.map((item) => String(getOptionValue(item))));
                const merged = [...prev];
                options.forEach((option) => {
                    const key = String(getOptionValue(option));
                    if (!seen.has(key)) {
                        seen.add(key);
                        merged.push(option);
                    }
                });
                return merged;
            });
            setHasMoreOptions(hasMore);
            setAsyncPage(nextPage);
        } catch (err) {
            setFetchError(err?.message || 'Failed to load more options');
        } finally {
            setIsLoadingMore(false);
        }
    }, [
        asyncPage,
        debouncedQuery,
        defaultOptions,
        getOptionValue,
        hasMoreOptions,
        isApiMode,
        isLoading,
        isLoadingMore,
        loadOptions,
        minSearchLength,
    ]);

    const handleOptionsScroll = useCallback(
        (event) => {
            if (!isApiMode || !hasMoreOptions || isLoading || isLoadingMore) {
                return;
            }
            const target = event.currentTarget;
            const remaining =
                target.scrollHeight - target.scrollTop - target.clientHeight;
            if (remaining <= 32) {
                loadMoreAsyncOptions();
            }
        },
        [hasMoreOptions, isApiMode, isLoading, isLoadingMore, loadMoreAsyncOptions]
    );

    useEffect(() => {
        if (!isOpen) {
            setHasLoadedDefault(false);
            setAsyncPage(1);
            setHasMoreOptions(false);
            setIsLoadingMore(false);
        }
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen || !usePortal) {
            return undefined;
        }

        updateMenuPosition();

        const handleReposition = () => updateMenuPosition();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [isOpen, usePortal, updateMenuPosition, visibleOptions.length, searchQuery, isLoading]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            const target = event.target;
            const inField = fieldRef.current?.contains(target);
            const inMenu = menuRef.current?.contains(target);
            if (!inField && !inMenu) {
                closeMenu();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [closeMenu]);

    useEffect(() => {
        if (!isOpen || highlightedIndex < 0) {
            return;
        }

        const optionEl = menuRef.current?.querySelector(
            `[data-option-index="${highlightedIndex}"]`
        );
        optionEl?.scrollIntoView({ block: 'nearest' });
    }, [highlightedIndex, isOpen, visibleOptions]);

    const handleControlKeyDown = (event) => {
        if (isDisabled) {
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    openMenu();
                } else {
                    moveHighlight(1);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (!isOpen) {
                    openMenu();
                } else {
                    moveHighlight(-1);
                }
                break;
            case 'Enter':
            case ' ':
                if (!isOpen) {
                    event.preventDefault();
                    openMenu();
                } else if (highlightedIndex >= 0) {
                    event.preventDefault();
                    selectOption(enabledOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                if (isOpen) {
                    event.preventDefault();
                    closeMenu();
                }
                break;
            case 'Backspace':
                if (
                    isMulti &&
                    !searchQuery &&
                    selectedValues.length > 0
                ) {
                    event.preventDefault();
                    const next = selectedValues.slice(0, -1);
                    emitChange(next);
                }
                break;
            default:
                break;
        }
    };

    const handleControlClick = () => {
        if (isDisabled) {
            return;
        }
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    const showClear =
        isClearable &&
        !isDisabled &&
        (isMulti ? selectedValues.length > 0 : Boolean(value));

    const singleDisplayLabel =
        !isMulti && value ? getOptionLabel(value) : '';

    const menuMessage = (() => {
        if (isLoading) {
            return loadingMessage;
        }
        if (fetchError) {
            return fetchError;
        }
        if (
            isApiMode &&
            debouncedQuery.trim().length < minSearchLength &&
            debouncedQuery.trim().length > 0
        ) {
            return `Type at least ${minSearchLength} characters`;
        }
        if (!visibleOptions.length) {
            return noOptionsMessage;
        }
        return null;
    })();

    const renderDefaultOption = (option, { isSelected }) => (
        <>
            {isMulti ? (
                <input
                    type="checkbox"
                    style={baseStyles.check}
                    checked={isSelected}
                    readOnly
                    tabIndex={-1}
                />
            ) : null}
            <span>{getOptionLabel(option)}</span>
        </>
    );

    const menuContent = isOpen ? (
        <div
            ref={menuRef}
            style={{
                ...baseStyles.menu,
                ...(usePortal
                    ? {
                        position: 'fixed',
                        zIndex: MENU_PORTAL_Z_INDEX,
                        left: menuPosition?.left ?? 0,
                        width: menuPosition?.width ?? controlRef.current?.offsetWidth ?? 'auto',
                        right: 'auto',
                        marginTop: 0,
                        maxHeight: menuPosition?.maxHeight ?? MENU_MAX_HEIGHT,
                        ...(menuPosition?.placement === 'top'
                            ? { bottom: menuPosition.bottom, top: 'auto' }
                            : { top: menuPosition?.top ?? 0, bottom: 'auto' }),
                    }
                    : {
                        zIndex: 50,
                    }),
            }}
        >
            {!isMulti && isSearchable ? (
                <div
                    style={baseStyles.searchRow}
                    onClick={(event) => event.stopPropagation()}
                >
                    <input
                        ref={singleSearchRef}
                        type="text"
                        style={{
                            ...baseStyles.searchInput,
                            borderColor: isSearchFocused
                                ? theme.primary
                                : theme.border,
                            boxShadow: isSearchFocused
                                ? `0 0 0 2px ${theme.primarySoft}`
                                : 'none',
                        }}
                        value={searchQuery}
                        placeholder={searchPlaceholder}
                        onChange={(event) =>
                            setSearchQuery(event.target.value)
                        }
                        onKeyDown={handleControlKeyDown}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                </div>
            ) : null}

            {menuMessage ? (
                <div style={baseStyles.message}>{menuMessage}</div>
            ) : (
                <div
                    id={listboxId}
                    style={{
                        ...baseStyles.options,
                        maxHeight: usePortal && menuPosition?.maxHeight
                            ? Math.max(
                                (menuPosition.maxHeight || MENU_MAX_HEIGHT)
                                    - (!isMulti && isSearchable ? 56 : 0),
                                MENU_MIN_HEIGHT
                            )
                            : baseStyles.options.maxHeight,
                    }}
                    role="listbox"
                    aria-multiselectable={isMulti}
                    onScroll={isApiMode ? handleOptionsScroll : undefined}
                >
                    {visibleOptions.map((option) => {
                        const optionValue = getOptionValue(option);
                        const disabled = isOptionDisabled(option);
                        const selected = isValueSelected(option);
                        const enabledIndex = enabledOptions.findIndex(
                            (item) =>
                                getOptionValue(item) === optionValue
                        );
                        const isFocused =
                            !disabled &&
                            enabledIndex === highlightedIndex;
                        const isHovered =
                            !disabled &&
                            enabledIndex === hoveredOptionIndex;

                        return (
                            <button
                                key={String(optionValue)}
                                type="button"
                                role="option"
                                data-option-index={enabledIndex}
                                aria-selected={selected}
                                disabled={disabled}
                                style={getOptionStyle({
                                    disabled,
                                    selected,
                                    isFocused,
                                    isHovered,
                                })}
                                onMouseDown={(event) =>
                                    event.preventDefault()
                                }
                                onMouseEnter={() =>
                                    setHoveredOptionIndex(enabledIndex)
                                }
                                onMouseLeave={() =>
                                    setHoveredOptionIndex(-1)
                                }
                                onClick={(event) => {
                                    event.stopPropagation();
                                    selectOption(option);
                                }}
                            >
                                {renderOption
                                    ? renderOption(option, {
                                          isSelected: selected,
                                          isFocused,
                                      })
                                    : renderDefaultOption(option, {
                                          isSelected: selected,
                                          isFocused,
                                      })}
                            </button>
                        );
                    })}
                    {isApiMode && isLoadingMore ? (
                        <div style={baseStyles.message}>{loadingMessage}</div>
                    ) : null}
                </div>
            )}
        </div>
    ) : null;

    return (
        <div ref={fieldRef} style={baseStyles.field}>
            {label ? (
                <label style={baseStyles.label} htmlFor={name || undefined}>
                    {label}
                    {required ? <span style={baseStyles.required}>*</span> : null}
                </label>
            ) : null}

            <div
                ref={controlRef}
                style={getControlStyle({
                    isOpen,
                    isDisabled,
                    error,
                    isMulti,
                    isHovered: isControlHovered,
                })}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : 0}
                onKeyDown={handleControlKeyDown}
                onClick={handleControlClick}
                onMouseEnter={() => setIsControlHovered(true)}
                onMouseLeave={() => setIsControlHovered(false)}
            >
                {isMulti ? (
                    <>
                        {selectedValues.map((option) => (
                            <span
                                key={String(getOptionValue(option))}
                                style={baseStyles.chip}
                            >
                                <span style={baseStyles.chipLabel}>
                                    {getOptionLabel(option)}
                                </span>
                                {!isDisabled ? (
                                    <button
                                        type="button"
                                        style={baseStyles.chipRemove}
                                        aria-label={`Remove ${getOptionLabel(option)}`}
                                        onClick={(event) =>
                                            removeChip(option, event)
                                        }
                                        onMouseEnter={(event) => {
                                            event.currentTarget.style.opacity = '0.75';
                                        }}
                                        onMouseLeave={(event) => {
                                            event.currentTarget.style.opacity = '1';
                                        }}
                                    >
                                        ×
                                    </button>
                                ) : null}
                            </span>
                        ))}
                        {isSearchable ? (
                            <input
                                ref={multiSearchRef}
                                type="text"
                                style={baseStyles.multiInput}
                                value={searchQuery}
                                placeholder={
                                    selectedValues.length
                                        ? ''
                                        : placeholder
                                }
                                disabled={isDisabled}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (!isOpen) {
                                        openMenu();
                                    }
                                }}
                                onKeyDown={handleControlKeyDown}
                            />
                        ) : selectedValues.length === 0 ? (
                            <span style={baseStyles.placeholder}>{placeholder}</span>
                        ) : null}
                    </>
                ) : (
                    <span
                        style={{
                            ...baseStyles.value,
                            ...(!singleDisplayLabel ? baseStyles.placeholder : {}),
                        }}
                    >
                        {singleDisplayLabel || placeholder}
                    </span>
                )}

                <div style={baseStyles.indicators}>
                    {showClear ? (
                        <button
                            type="button"
                            style={{
                                ...baseStyles.clearBtn,
                                color: isClearHovered ? theme.text : theme.textMuted,
                            }}
                            aria-label="Clear selection"
                            onClick={clearValue}
                            onMouseEnter={() => setIsClearHovered(true)}
                            onMouseLeave={() => setIsClearHovered(false)}
                        >
                            ×
                        </button>
                    ) : null}
                    <span
                        style={{
                            ...baseStyles.chevron,
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                        }}
                        aria-hidden="true"
                    >
                        ▾
                    </span>
                </div>
            </div>

            {usePortal
                ? (menuContent && typeof document !== 'undefined'
                    ? createPortal(menuContent, document.body)
                    : null)
                : menuContent}

            {name ? (
                <input
                    type="hidden"
                    name={name}
                    value={
                        isMulti
                            ? selectedValues
                                  .map((item) => getOptionValue(item))
                                  .join(',')
                            : value
                              ? String(getOptionValue(value))
                              : ''
                    }
                    readOnly
                />
            ) : null}

            {error ? <p style={baseStyles.errorText}>{error}</p> : null}
            {!error && helperText ? (
                <p style={baseStyles.helper}>{helperText}</p>
            ) : null}
        </div>
    );
}
