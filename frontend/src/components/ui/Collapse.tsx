import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CollapseProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  isCard?: boolean;
  onToggle: () => void;
}

const Collapse: React.FC<CollapseProps> = ({ title, children, isOpen, isCard = false, onToggle }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (isOpen) {
      el.style.maxHeight = `${el.scrollHeight}px`;
      const handleEnd = () => (el.style.maxHeight = 'none');
      el.addEventListener('transitionend', handleEnd);
      return () => el.removeEventListener('transitionend', handleEnd);
    } else {
      el.style.maxHeight = `${el.scrollHeight}px`;
      requestAnimationFrame(() => (el.style.maxHeight = '0px'));
    }
  }, [isOpen]);

  return (
    <div className="w-full">
      <button onClick={onToggle} className="w-full px-4 py-2 text-left flex items-center gap-4">
        <ChevronDown
          className="w-5 h-5 transform transition-transform duration-300"
          style={{ transform: `rotate(${isOpen ? 180 : 0}deg)` }}
        />
        <span className={isCard ? "text-lg font-semibold" : ""}>{title}</span>
      </button>

      <div
        ref={contentRef}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${!isCard && "border-b-2"}`}
        style={{ maxHeight: '0px' }}
      >
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Collapse;
