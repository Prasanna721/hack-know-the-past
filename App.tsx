
import React, { useState, useCallback } from 'react';
import { Map } from './components/Map';
import { Dock } from './components/Dock';
import { InfoPanel } from './components/InfoPanel';
import { VisualContentCard } from './components/VisualContentCard';
import { fetchHistoricalPlace } from './services/geminiService';
import type { HistoricalPlace } from './types';

const LoadingSpinner: React.FC = () => (
  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
    <p className="mt-4 text-lg font-semibold text-white">Discovering a place for you...</p>
  </div>
);

const App: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<HistoricalPlace | null>(null);
    const [activePanel, setActivePanel] = useState<'info' | 'visuals' | null>(null);

    const handleCategorySelect = useCallback(async (category: string) => {
        setLoading(true);
        setError(null);
        setSelectedPlace(null);
        setActivePanel(null);
        
        try {
            const place = await fetchHistoricalPlace(category);
            setSelectedPlace(place);
            setActivePanel('info'); // Default to showing info panel expanded
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to find a place. ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, []);
    
    const handleClosePanels = useCallback(() => {
        setSelectedPlace(null);
        setActivePanel(null);
    }, []);

    const handleTogglePanel = (panel: 'info' | 'visuals') => {
        setActivePanel(current => current === panel ? null : panel);
    };

    return (
        <div className="w-screen h-screen relative overflow-hidden">
            {loading && <LoadingSpinner />}

            {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white p-3 rounded-lg shadow-lg z-40">
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="absolute top-1 right-2 text-white font-bold">&times;</button>
                </div>
            )}
            
            <Map place={selectedPlace} />

            {/* Panel Container */}
            <div className={`
                fixed top-4 right-4 z-30
                flex flex-col items-end gap-4
                w-full max-w-5xl 
                transition-all duration-300 ease-in-out
                ${selectedPlace ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
                <InfoPanel 
                    place={selectedPlace} 
                    onClose={handleClosePanels} 
                    isExpanded={activePanel === 'info'}
                    onToggle={() => handleTogglePanel('info')}
                />
                <VisualContentCard
                    place={selectedPlace}
                    isExpanded={activePanel === 'visuals'}
                    onToggle={() => handleTogglePanel('visuals')}
                />
            </div>
            
            <Dock onCategorySelect={handleCategorySelect} isLoading={loading} />
        </div>
    );
};

export default App;