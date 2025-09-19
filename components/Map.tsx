
import React, { useRef, useEffect, useState } from 'react';
import type { HistoricalPlace } from '../types';

// FIX: Add google to the window object to avoid TypeScript errors when the Google Maps script is loaded externally.
declare global {
  interface Window {
    google: any;
  }
}

interface MapProps {
  place: HistoricalPlace | null;
}

const INITIAL_CENTER = { lat: 40.7831, lng: -73.9712 }; // Manhattan
const INITIAL_ZOOM = 11;

const mapStyles: any[] = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
];

const MapComponent: React.FC<MapProps> = ({ place }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any | null>(null);
    const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('satellite');
    const markerRef = useRef<any | null>(null);
    const geocoderRef = useRef<any | null>(null);

    // Initialize map
    useEffect(() => {
        if (mapRef.current && window.google && window.google.maps && !map) {
            const newMap = new window.google.maps.Map(mapRef.current, {
                center: INITIAL_CENTER,
                zoom: INITIAL_ZOOM,
                mapId: 'KNOW_THE_PAST_MAP_DARK',
                disableDefaultUI: true,
                styles: mapStyles,
            });
            setMap(newMap);
            geocoderRef.current = new window.google.maps.Geocoder();
        }
    }, [map]);

    // Update map view based on selected place
    useEffect(() => {
        if (!map || !window.google) return;

        // Clear previous marker
        if (markerRef.current) {
            markerRef.current.map = null;
        }

        if (place) {
            if (place.locationType === 'point') {
                map.panTo({ lat: place.latitude, lng: place.longitude });
                map.setZoom(place.zoom_level);
                
                markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: { lat: place.latitude, lng: place.longitude },
                });
            } else if (place.locationType === 'area' && geocoderRef.current) {
                geocoderRef.current.geocode({ 'placeId': place.placeId }, (results: any[], status: string) => {
                    if (status === 'OK' && results[0]?.geometry?.viewport) {
                        map.fitBounds(results[0].geometry.viewport);
                    } else {
                        console.error('Geocode was not successful for the following reason: ' + status);
                        // Fallback to point view if geocoding fails
                        map.panTo({ lat: place.latitude, lng: place.longitude });
                        map.setZoom(12); // Default zoom for failed area
                    }
                });
            }
        } else {
            // Optional: Reset to initial view when place is deselected
            // map.panTo(INITIAL_CENTER);
            // map.setZoom(INITIAL_ZOOM);
        }

    }, [map, place]);


    // Update map type based on user selection
    useEffect(() => {
        if (map) {
            if (mapType === 'satellite') {
                map.setMapTypeId('satellite');
                map.setOptions({ styles: null }); // Remove custom styles for satellite view
                map.setTilt(45); // Enable 3D view
            } else { // 'roadmap'
                map.setMapTypeId('roadmap');
                map.setOptions({ styles: mapStyles }); // Re-apply custom styles
                map.setTilt(0); // Disable tilt for 2D view
            }
        }
    }, [map, mapType]);


    const toggleMapType = () => {
        setMapType(prev => (prev === 'roadmap' ? 'satellite' : 'roadmap'));
    };

    const CubeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
    );
    
    const MapIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20.25l-4.5-2.25v-10.5L9 9.75l4.5 2.25L18 9.75v10.5l-4.5 2.25L9 20.25ZM9 4.5l4.5 2.25l4.5-2.25M9 4.5L4.5 6.75L9 9.75l4.5-2.25L9 4.5Z" />
        </svg>
    );

    return (
        <div className="relative w-full h-full">
            <div ref={mapRef} className="w-full h-full" />
            <div className="absolute bottom-6 left-6 z-10">
                <button
                    onClick={toggleMapType}
                    className="w-12 h-12 flex items-center justify-center rounded-full text-white bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-sm transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    aria-label={`Switch to ${mapType === 'roadmap' ? 'Satellite (3D)' : 'Terrain'} view`}
                    title={`Switch to ${mapType === 'roadmap' ? 'Satellite (3D)' : 'Terrain'} view`}
                >
                    {mapType === 'roadmap' ? <CubeIcon /> : <MapIcon />}
                </button>
            </div>
        </div>
    );
};

export const Map = React.memo(MapComponent);
