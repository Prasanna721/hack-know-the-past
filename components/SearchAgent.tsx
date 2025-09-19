import React, { useEffect, useRef, useState } from 'react';
import { getSearchSuggestions, type SuggestionItem } from '../services/agentService';

interface SearchAgentProps {
    onSuggestionSelect: (item: SuggestionItem) => void;
}

export const SearchAgent: React.FC<SearchAgentProps> = ({ onSuggestionSelect }) => {
    const [expanded, setExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState(false);
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (expanded) {
            // Auto-focus on expand
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [expanded]);

    // Close when clicking outside
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setExpanded(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    // Cleanup timers and abort controllers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const performSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            setLoading(false);
            return;
        }

        // Abort any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        setPending(false);
        setLoading(true);
        try {
            const res = await getSearchSuggestions(searchQuery.trim());
            // Only update if this request wasn't aborted
            if (!abortControllerRef.current.signal.aborted) {
                setSuggestions(res);
            }
        } catch (e) {
            if (!abortControllerRef.current?.signal.aborted) {
                console.error('Suggestion error', e);
                setSuggestions([]);
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                setLoading(false);
            }
        }
    };

    const onChange = (val: string) => {
        setQuery(val);
        
        // Clear any existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Clear suggestions if empty query
        if (!val.trim()) {
            setSuggestions([]);
            setLoading(false);
            setPending(false);
            return;
        }

        // Show pending state immediately when user types
        setPending(true);
        setSuggestions([]); // Clear previous suggestions

        // Set up debounced search (500ms delay)
        debounceTimerRef.current = setTimeout(() => {
            performSearch(val);
        }, 500);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            // Clear debounce timer and search immediately
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            setPending(false);
            performSearch(query);
        }
    };

    const handleSelect = (item: SuggestionItem) => {
        setExpanded(false);
        setQuery(item.suggestion);
        onSuggestionSelect(item);
    };

    const SearchIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
    );

    return (
        <div ref={containerRef} className="fixed top-6 left-6 z-30">
            {/* Search Icon/Bar */}
            <div
                className={`flex items-center transition-all duration-300 ${expanded ? 'bg-gray-800/80 backdrop-blur-sm rounded-full px-1 py-1 w-72 sm:w-96 shadow-lg' : ''}`}
                onMouseEnter={() => setExpanded(true)}
            >
                <button
                    className="w-12 h-12 flex items-center justify-center rounded-full text-white bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-sm transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    aria-label="Open search agent"
                    onClick={() => setExpanded((v) => !v)}
                    title="Search places and events"
                >
                    <SearchIcon />
                </button>
                {expanded && (
                    <div className="ml-3 flex-1 min-w-0">
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Search events or places..."
                            className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none"
                            aria-label="Search historic events or places"
                        />
                    </div>
                )}
            </div>
            
            {/* Suggestions Dropdown */}
            {expanded && (query.trim() || loading || pending || suggestions.length > 0) && (
                <div className="mt-2 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="p-2">
                        {pending && <div className="text-gray-400 text-sm px-3 py-2">Searching...</div>}
                        {loading && <div className="text-gray-400 text-sm px-3 py-2">Thinking...</div>}
                        {!loading && !pending && suggestions.length > 0 && (
                            <ul className="space-y-1">
                                {suggestions.map((s, idx) => (
                                    <li key={idx}>
                                        <button
                                            onClick={() => handleSelect(s)}
                                            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-700/60 text-gray-200 transition-colors text-sm"
                                        >
                                            {s.suggestion}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
