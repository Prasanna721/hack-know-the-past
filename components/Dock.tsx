
import React from 'react';
import { CATEGORIES } from '../constants';

interface DockProps {
  onCategorySelect: (category: string) => void;
  isLoading: boolean;
}

export const Dock: React.FC<DockProps> = ({ onCategorySelect, isLoading }) => {
  return (
    <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center justify-center gap-2 sm:gap-4 bg-gray-900/60 backdrop-blur-md p-3 rounded-full shadow-2xl shadow-black/50 ring-1 ring-white/10">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            onClick={() => onCategorySelect(category.key)}
            disabled={isLoading}
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-semibold text-gray-200 hover:bg-indigo-500/30 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Explore ${category.name}`}
          >
            <span className="text-xl sm:text-2xl">{category.emoji}</span>
            <span className="hidden sm:inline">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
