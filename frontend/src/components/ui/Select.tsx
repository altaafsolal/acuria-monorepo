import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import './Select.css';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  compact?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  wrapperClassName?: string;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>['onChange'];
}

function parseOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    if (element.type !== 'option') return;

    const label = typeof element.props.children === 'string'
      ? element.props.children
      : Children.toArray(element.props.children).join('');

    options.push({
      value: String(element.props.value ?? ''),
      label: label || String(element.props.value ?? ''),
      disabled: element.props.disabled,
    });
  });

  return options;
}

function createChangeEvent(value: string): React.ChangeEvent<HTMLSelectElement> {
  return {
    target: { value } as HTMLSelectElement,
    currentTarget: { value } as HTMLSelectElement,
  } as React.ChangeEvent<HTMLSelectElement>;
}

function optionMatchesQuery(option: SelectOption, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return option.label.toLowerCase().includes(normalized);
}

export default function Select({
  compact = false,
  searchable = true,
  searchPlaceholder = 'Rechercher…',
  wrapperClassName,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  name,
  id,
  'aria-label': ariaLabel,
}: SelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const searchId = `${controlId}-search`;

  const options = useMemo(() => parseOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentValue = value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : '';
  const selectedOption = options.find((option) => option.value === currentValue);
  const displayLabel = selectedOption?.label ?? (currentValue ? currentValue : '—');

  const visibleOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    return options.filter((option) => optionMatchesQuery(option, searchQuery));
  }, [options, searchQuery, searchable]);

  const enabledOptions = visibleOptions.filter((option) => !option.disabled);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const searchHeight = searchable ? 44 : 0;
    const maxMenuHeight = (compact ? 200 : 260) + searchHeight;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const availableHeight = Math.min(maxMenuHeight, openUpward ? spaceAbove - 6 : spaceBelow - 6);

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(availableHeight, searchable ? 160 : 120),
      zIndex: 600,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, compact, searchable]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setHighlightedIndex(-1);
      return;
    }

    if (searchable) {
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = enabledOptions.findIndex((option) => option.value === currentValue);
    setHighlightedIndex(
      selectedIndex >= 0 ? selectedIndex : enabledOptions.length > 0 ? 0 : -1,
    );
  }, [open, currentValue, searchQuery, visibleOptions.length, enabledOptions.length]);

  const commitValue = (nextValue: string) => {
    onChange?.(createChangeEvent(nextValue));
    setOpen(false);
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (enabledOptions.length === 0) return;
    setHighlightedIndex((prev) => {
      const start = prev < 0 ? 0 : prev;
      return (start + direction + enabledOptions.length) % enabledOptions.length;
    });
  };

  const handleListNavigation = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveHighlight(-1);
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0) {
          commitValue(enabledOptions[highlightedIndex].value);
        }
        break;
      case 'Home':
        event.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setHighlightedIndex(enabledOptions.length - 1);
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          handleListNavigation(event);
        }
        break;
      default:
        break;
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Home' || event.key === 'End') {
      handleListNavigation(event);
    }
  };

  const rootClasses = [
    'custom-select',
    compact ? 'custom-select--compact' : '',
    open ? 'custom-select--open' : '',
    disabled ? 'custom-select--disabled' : '',
    searchable ? 'custom-select--searchable' : '',
    wrapperClassName ?? '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClasses} ref={rootRef}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      <button
        ref={triggerRef}
        type="button"
        id={controlId}
        className="custom-select__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`custom-select__value${!selectedOption && !currentValue ? ' custom-select__value--placeholder' : ''}`}>
          {displayLabel}
        </span>
        <FiChevronDown className="custom-select__chevron" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="custom-select__menu-panel"
          style={menuStyle}
        >
          {searchable && (
            <div className="custom-select__search">
              <FiSearch aria-hidden="true" />
              <input
                ref={searchInputRef}
                id={searchId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                aria-controls={listboxId}
                aria-label={ariaLabel ? `${ariaLabel} — recherche` : 'Rechercher dans la liste'}
                autoComplete="off"
              />
            </div>
          )}

          {visibleOptions.length === 0 ? (
            <p className="custom-select__empty">Aucun résultat</p>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              className="custom-select__menu"
              role="listbox"
              aria-labelledby={controlId}
            >
              {visibleOptions.map((option) => {
                const enabledIndex = enabledOptions.indexOf(option);
                const isSelected = option.value === currentValue;
                const isHighlighted = enabledIndex >= 0 && enabledIndex === highlightedIndex;

                return (
                  <li
                    key={`${option.value}-${option.label}`}
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      'custom-select__option',
                      isSelected ? 'custom-select__option--selected' : '',
                      isHighlighted ? 'custom-select__option--active' : '',
                      option.disabled ? 'custom-select__option--disabled' : '',
                    ].filter(Boolean).join(' ')}
                    onMouseEnter={() => {
                      if (!option.disabled && enabledIndex >= 0) {
                        setHighlightedIndex(enabledIndex);
                      }
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      if (!option.disabled) commitValue(option.value);
                    }}
                  >
                    {option.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
