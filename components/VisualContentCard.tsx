import React, { useState, useEffect, useCallback } from 'react';
import type { HistoricalPlace, Slide } from '../types';
import { fetchVisualSlides, generateImageFromPrompt } from '../services/geminiService';

interface VisualContentCardProps {
    place: HistoricalPlace | null;
    isExpanded: boolean;
    onToggle: () => void;
}

// In-memory cache for generated images.
// It persists across re-renders because it's defined outside the component.
const imageCache = new Map<string, string>();

interface ImageState {
    status: 'loading' | 'loaded' | 'error';
    url?: string;
}

const LoadingCard: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center justify-center h-full p-6 text-gray-300">
        <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white mr-3"></div>
        <span>{message}...</span>
    </div>
);

export const VisualContentCard: React.FC<VisualContentCardProps> = ({ place, isExpanded, onToggle }) => {
    const isMinimized = !isExpanded;

    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [imageStates, setImageStates] = useState<Map<string, ImageState>>(new Map());

    const handlePlaceChange = useCallback(async (currentPlace: HistoricalPlace) => {
        setIsLoading(true);
        setError(null);
        setSlides([]);
        setCurrentSlide(0);
        imageCache.clear();
        setImageStates(new Map());
        try {
            const fetchedSlides = await fetchVisualSlides(currentPlace);
            setSlides(fetchedSlides);
            // Pre-load all images for the new set of slides
            if (fetchedSlides.length > 0) {
                fetchedSlides.forEach(slide => {
                    const prompt = slide.image_prompt;
                    
                    setImageStates(prev => new Map(prev).set(prompt, { status: 'loading' }));
                    
                    generateImageFromPrompt(prompt)
                        .then(base64ImageBytes => {
                            const generatedUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
                            imageCache.set(prompt, generatedUrl);
                            setImageStates(prev => new Map(prev).set(prompt, { status: 'loaded', url: generatedUrl }));
                        })
                        .catch(() => {
                            setImageStates(prev => new Map(prev).set(prompt, { status: 'error' }));
                        });
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (place) {
            handlePlaceChange(place);
        } else {
            setSlides([]);
            setError(null);
            setIsLoading(false);
            setCurrentSlide(0);
            setImageStates(new Map());
        }
    }, [place, handlePlaceChange]);
    
    const handlePanelClick = () => {
        if (isMinimized) {
            onToggle();
        }
    };
    
    const nextSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentSlide(s => (s + 1) % slides.length);
    };

    const prevSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentSlide(s => (s - 1 + slides.length) % slides.length);
    };

    const currentImageState = slides.length > 0 ? imageStates.get(slides[currentSlide].image_prompt) ?? { status: 'loading' } : undefined;

    return (
        <div 
            className={`w-full rounded-xl shadow-2xl transition-all duration-300 ease-in-out
            ${isMinimized 
                ? 'max-w-md bg-gray-900/70 backdrop-blur-md cursor-pointer hover:bg-gray-900/80' 
                : 'max-w-5xl bg-transparent'
            }`}
            onClick={handlePanelClick}
            aria-expanded={!isMinimized}
        >
            <div className={`relative transition-all duration-300 ease-in-out ${isMinimized ? 'h-20 overflow-hidden' : ''}`}>
                {isMinimized && (
                    <div className="p-6 flex items-center h-full">
                        {place && !error && (
                             <h2 className="text-md font-medium text-white/80">Immersive View</h2>
                        )}
                         {place && error && (
                            <h2 className="text-md font-medium text-red-400">Visuals Unavailable</h2>
                        )}
                    </div>
                )}
                
                {!isMinimized && (
                    <div className="animate-fade-in">
                        {isLoading && (
                            <div className="aspect-video w-full flex items-center justify-center bg-white rounded-xl p-6 shadow-2xl">
                                <div className="text-center text-gray-600">
                                     <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-indigo-500 mx-auto"></div>
                                    <p className="mt-4">Generating immersive view...</p>
                                </div>
                            </div>
                        )}
                        {error && <div className="w-full flex items-center justify-center bg-white rounded-xl p-6 shadow-2xl"><p className="text-center text-red-500">{error}</p></div>}
                        
                        {!isLoading && !error && slides.length > 0 && (
                            <div className="relative w-full rounded-xl overflow-hidden bg-white text-gray-800 shadow-2xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold text-gray-900">{slides[currentSlide].title}</h3>
                                        <p className="text-gray-600 text-base mt-1">{slides[currentSlide].subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                        <button onClick={prevSlide} aria-label="Previous slide" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                                        </button>
                                        <span className="text-sm text-gray-500 font-mono w-12 text-center">{currentSlide + 1}/{slides.length}</span>
                                        <button onClick={nextSlide} aria-label="Next slide" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="aspect-video bg-gray-200 w-full flex items-center justify-center overflow-hidden rounded-lg">
                                    {(currentImageState?.status === 'loading') && (
                                         <div className="text-center text-gray-600">
                                            <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-indigo-500 mx-auto"></div>
                                            <p className="mt-4 text-sm">Generating image...</p>
                                        </div>
                                    )}
                                    {currentImageState?.status === 'error' && <p className="text-red-500">Image failed to load.</p>}
                                    {currentImageState?.status === 'loaded' && currentImageState.url && (
                                        <img src={currentImageState.url} alt={slides[currentSlide].image_prompt} className="w-full h-full object-cover" />
                                    )}
                                </div>
                    
                            </div>
                        )}
                        {!isLoading && !error && slides.length === 0 && place && (
                            <div className="w-full flex items-center justify-center bg-white rounded-xl p-6 shadow-2xl">
                                <p className="text-center text-gray-500 p-4">No visual content could be generated for this place.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};