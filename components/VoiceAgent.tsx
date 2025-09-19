import React, { useState, useRef, useEffect } from 'react';
import { Room, Track, RemoteTrack, AudioTrack } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';

interface VoiceAgentProps {
  context?: string;
  onConnectionChange?: (connected: boolean) => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  context, 
  onConnectionChange 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Local LiveKit configuration
  const LIVEKIT_URL = 'ws://localhost:7880';
  
  // Generate a proper JWT token for local development
  const generateLocalToken = async (roomName: string, participantName: string) => {
    // Use dev credentials from local LiveKit server
    const token = new AccessToken('devkey', 'secret', {
      identity: participantName,
      ttl: '1h',
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return await token.toJwt();
  };

  const connectToAgent = async () => {
    setIsConnecting(true);
    
    try {
      const room = new Room();
      roomRef.current = room;

      // Set up event listeners
      room.on('trackSubscribed', (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          const audioTrack = track as AudioTrack;
          if (audioElementRef.current) {
            audioTrack.attach(audioElementRef.current);
          }
        }
      });

      room.on('participantConnected', () => {
        console.log('Agent connected');
        setIsTalking(true);
      });

      room.on('participantDisconnected', () => {
        console.log('Agent disconnected');
        setIsTalking(false);
      });

      room.on('disconnected', () => {
        setIsConnected(false);
        setIsTalking(false);
        onConnectionChange?.(false);
      });

      // Generate room name and token for local development
      const roomName = `history-chat-${Date.now()}`;
      const token = await generateLocalToken(roomName, 'user');

      // Connect with context metadata
      const connectOptions = {
        autoSubscribe: true,
        ...(context && {
          metadata: JSON.stringify({ context })
        })
      };

      await room.connect(LIVEKIT_URL, token, connectOptions);
      
      setIsConnected(true);
      onConnectionChange?.(true);
      console.log('Connected to LiveKit room');

    } catch (error) {
      console.error('Failed to connect to voice agent:', error);
      alert('Failed to connect to voice agent. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromAgent = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
  };

  const toggleConnection = () => {
    if (isConnected) {
      disconnectFromAgent();
    } else {
      connectToAgent();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Audio element for agent speech */}
      <audio ref={audioElementRef} autoPlay />
      
      {/* Voice Agent Button */}
      <button
        onClick={toggleConnection}
        disabled={isConnecting}
        className={`
          relative w-16 h-16 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${isConnected 
            ? 'bg-red-500 hover:bg-red-600 scale-110' 
            : 'bg-white hover:bg-gray-50 hover:scale-105'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isTalking ? 'animate-pulse ring-4 ring-green-400/50' : ''}
        `}
        title={isConnected ? 'Disconnect from History Guide' : 'Connect to History Guide'}
      >
        {isConnecting ? (
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`w-8 h-8 transition-all duration-300 ${
              isConnected ? 'text-white' : 'text-gray-700'
            }`}
          >
            <path d="M16 2C13.2386 2 11 4.23858 11 7V15C11 17.7614 13.2386 20 16 20C18.7614 20 21 17.7614 21 15V7C21 4.23858 18.7614 2 16 2Z" fill="currentColor"/>
            <path d="M8 14C8 13.4477 7.55228 13 7 13C6.44772 13 6 13.4477 6 14C6 19.5228 10.4772 24 16 24C21.5228 24 26 19.5228 26 14C26 13.4477 25.5523 13 25 13C24.4477 13 24 13.4477 24 14C24 18.4183 20.4183 22 16 22C11.5817 22 8 18.4183 8 14Z" fill="currentColor"/>
            <path d="M16 26C16.5523 26 17 26.4477 17 27V29C17 29.5523 16.5523 30 16 30C15.4477 30 15 29.5523 15 27V27C15 26.4477 15.4477 26 16 26Z" fill="currentColor"/>
            <path d="M12 28C12 28.5523 12.4477 29 13 29H19C19.5523 29 20 28.5523 20 28C20 27.4477 19.5523 27 19 27H13C12.4477 27 12 27.4477 12 28Z" fill="currentColor"/>
          </svg>
        )}
        
        {/* Connection status indicator */}
        <div className={`
          absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white
          transition-all duration-300
          ${isConnected ? 'bg-green-500' : 'bg-gray-400'}
        `} />
        
        {/* Talking indicator */}
        {isTalking && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
        )}
      </button>

      {/* Connection status text */}
      {isConnected && (
        <div className="absolute bottom-20 right-0 bg-black/80 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap">
          🎤 History Guide Active
        </div>
      )}
    </div>
  );
};