
import React from 'react';
import type { HistoricalPlace } from '../types';

interface InfoPanelProps {
    place: HistoricalPlace | null;
    onClose: () => void;
    isExpanded: boolean;
    onToggle: () => void;
}

const DetailItem: React.FC<{ icon: JSX.Element; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-6 h-6 text-indigo-300 mt-1">{icon}</div>
        <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-base text-gray-200">{value}</p>
        </div>
    </div>
);

// Icons
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.916 17.916 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M-4.5 12h22.5" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>;
const GeologyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M2.25 12a8.96 8.96 0 0 1 0-1.586m19.5 0a8.96 8.96 0 0 0 0-1.586M2.25 12L12 21.75l9.75-9.75M2.25 12h19.5" /></svg>;
const ArchitectureIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6M9 15.75h6" /></svg>;
const GrowthIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>;
const TimeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const MinimizeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>;

export const InfoPanel: React.FC<InfoPanelProps> = ({ place, onClose, isExpanded, onToggle }) => {
    const isMinimized = !isExpanded;

    const iconMap: { [key: string]: JSX.Element } = {
        globe: <GlobeIcon />,
        calendar: <CalendarIcon />,
        sparkles: <SparklesIcon />,
        geology: <GeologyIcon />,
        architecture: <ArchitectureIcon />,
        growth: <GrowthIcon />,
        time: <TimeIcon />,
        default: <SparklesIcon />
    };

    const handlePanelClick = () => {
        if (isMinimized) {
            onToggle();
        }
    };

    return (
        <div 
            className={`w-full max-w-md rounded-xl bg-gray-900/70 backdrop-blur-md shadow-2xl transition-all duration-300 ease-in-out
            ${isMinimized ? 'cursor-pointer hover:bg-gray-900/80' : 'cursor-default'}`}
            onClick={handlePanelClick}
            aria-expanded={!isMinimized}
        >
            <div className={`relative transition-all duration-300 ease-in-out custom-scrollbar
                ${isMinimized ? 'h-20 overflow-hidden' : 'max-h-[calc(100vh-4rem)] overflow-y-auto'}`}
            >
                {!isMinimized && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-50">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className="p-1 text-gray-400 hover:text-white transition-colors" 
                            aria-label='Minimize panel'
                        >
                            <MinimizeIcon />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 text-gray-400 hover:text-white transition-colors" aria-label="Close panel">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
                
                {place && (
                    <div className={`transition-all duration-300 
                        ${isMinimized ? 'p-6 flex items-center h-full' : 'p-6 pt-16'}`}
                    >
                        <h2 className={`text-xl font-bold text-white ${!isMinimized ? 'pr-24 mb-2' : ''}`} title={place.name}>
                            {place.name}
                        </h2>
                        
                        {!isMinimized && (
                             <div className="mt-4 animate-fade-in">
                                <p className="text-gray-300 leading-relaxed mb-6">{place.description}</p>
                                <div className="space-y-5 border-t border-gray-700 pt-6">
                                    {place.details.map((detail, index) => (
                                        <DetailItem
                                            key={index}
                                            icon={iconMap[detail.icon] || iconMap.default}
                                            label={detail.label}
                                            value={detail.value}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
