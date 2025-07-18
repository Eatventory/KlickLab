import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CollapseProps {
  title: string;
  children: React.ReactNode;
  isShown?: boolean;
}

const Collapse: React.FC<CollapseProps> = ({ title, children, isShown = false }) => {
  const [isOpen, setIsOpen] = useState(isShown);
  const [rotation, setRotation] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      el.style.maxHeight = isOpen ? `${el.scrollHeight}px` : "0px";
    }
  }, [isOpen]);

  return (
    <div className="w-full">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setRotation((prev) => prev + 1);
        }}
        className="w-full px-4 py-2 text-left flex items-center gap-4"
      >
        <ChevronDown
          className="w-5 h-5 transform transition-transform duration-300"
          style={{ transform: `rotate(${rotation * 180}deg)` }}
        />
        <span>{title}</span>
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out border-b-2"
        style={{ maxHeight: "0px" }}
      >
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Collapse;
