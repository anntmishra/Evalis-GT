import React, { useState } from "react";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface SelectTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

interface SelectContentProps {
  className?: string;
  children?: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  placeholder?: string;
}>({
  value: '',
  onValueChange: () => {},
  isOpen: false,
  setIsOpen: () => {},
});

export function Select({ value = '', onValueChange = () => {}, placeholder, children, className = '', disabled = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  console.log("Select render:", { value, placeholder, isOpen, disabled });

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, placeholder }}>
      <div className={`relative inline-block w-full ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = '', children }: SelectTriggerProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);

  const handleClick = () => {
    console.log("SelectTrigger clicked, current isOpen:", isOpen);
    setIsOpen(!isOpen);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
      <svg 
        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    </button>
  );
}

export function SelectContent({ className = '', children }: SelectContentProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.select-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  console.log("SelectContent rendering, isOpen:", isOpen);

  return (
    <div className="select-container relative">
      <div className={`absolute top-1 z-50 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 ${className}`}>
        <div className="p-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SelectItem({ value, className = '', children, onClick }: SelectItemProps) {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext);

  const handleClick = () => {
    console.log("SelectItem clicked:", value);
    onValueChange(value);
    setIsOpen(false);
    if (onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
    >
      {children}
    </div>
  );
}

export function SelectValue({ placeholder, className = '' }: SelectValueProps) {
  const { value, placeholder: contextPlaceholder } = React.useContext(SelectContext);
  
  const displayText = value || placeholder || contextPlaceholder || 'Select...';
  console.log("SelectValue render:", { value, displayText });

  return (
    <span className={`${value ? '' : 'text-muted-foreground'} ${className}`}>
      {displayText}
    </span>
  );
}