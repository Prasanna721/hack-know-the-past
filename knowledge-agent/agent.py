#!/usr/bin/env python3
"""
LiveKit History Agent - Simple voice assistant for historical knowledge
Uses Gemini for LLM, Gladia for STT, and MiniMax for TTS
"""

import logging
import os
from pathlib import Path
from typing import Annotated, Optional
from dotenv import load_dotenv
import time

from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.llm import function_tool
from livekit.plugins import silero

# Custom integrations for Gemini, Gladia, MiniMax
import google.generativeai as genai
import requests
import aiohttp
import asyncio

# Load environment variables
load_dotenv("../.env")

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('agent_logs.txt')
    ]
)

logger = logging.getLogger("history-agent")
logger.setLevel(logging.INFO)

# Create separate loggers for each AI service
stt_logger = logging.getLogger("GLADIA_STT")
llm_logger = logging.getLogger("GEMINI_LLM")
tts_logger = logging.getLogger("MINIMAX_TTS")

class GeminiLLM:
    """Custom Gemini LLM wrapper for LiveKit"""
    
    def __init__(self, api_key: str, model: str = "gemini-1.5-pro"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
        self.chat = None
    
    async def chat_completion(self, messages, tools=None):
        """Handle chat completion with function calling support"""
        start_time = time.time()
        try:
            # Convert messages to Gemini format
            prompt = self._convert_messages(messages)
            
            # Log the request
            llm_logger.info(f"📤 GEMINI REQUEST: {prompt[:200]}{'...' if len(prompt) > 200 else ''}")
            
            # Initialize chat if not exists
            if not self.chat:
                self.chat = self.model.start_chat(history=[])
            
            # Send message and get response
            response = await asyncio.to_thread(self.chat.send_message, prompt)
            
            # Log the response
            response_time = time.time() - start_time
            llm_logger.info(f"📥 GEMINI RESPONSE ({response_time:.2f}s): {response.text[:300]}{'...' if len(response.text) > 300 else ''}")
            
            return {
                'choices': [{
                    'message': {
                        'content': response.text,
                        'role': 'assistant'
                    }
                }]
            }
        except Exception as e:
            response_time = time.time() - start_time
            llm_logger.error(f"❌ GEMINI ERROR ({response_time:.2f}s): {e}")
            return {
                'choices': [{
                    'message': {
                        'content': f"I apologize, but I encountered an error: {str(e)}",
                        'role': 'assistant'
                    }
                }]
            }
    
    def _convert_messages(self, messages):
        """Convert OpenAI format messages to Gemini prompt"""
        prompt_parts = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            if role == 'system':
                prompt_parts.append(f"System: {content}")
            elif role == 'user':
                prompt_parts.append(f"User: {content}")
            elif role == 'assistant':
                prompt_parts.append(f"Assistant: {content}")
        
        return "\n".join(prompt_parts)

class GladiaSTT:
    """Custom Gladia STT wrapper for LiveKit"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.gladia.io"
    
    async def recognize(self, audio_data: bytes):
        """Transcribe audio using Gladia API"""
        start_time = time.time()
        try:
            stt_logger.info(f"🎤 GLADIA STT REQUEST: Processing {len(audio_data)} bytes of audio")
            
            async with aiohttp.ClientSession() as session:
                # Upload audio file
                data = aiohttp.FormData()
                data.add_field('audio', audio_data, filename='audio.wav', content_type='audio/wav')
                data.add_field('language', 'en')
                
                headers = {'X-Gladia-Key': self.api_key}
                
                async with session.post(
                    f"{self.base_url}/v2/transcription",
                    data=data,
                    headers=headers
                ) as response:
                    response_time = time.time() - start_time
                    if response.status == 200:
                        result = await response.json()
                        transcript = result.get('transcription', {}).get('full_transcript', '')
                        stt_logger.info(f"📝 GLADIA TRANSCRIPTION ({response_time:.2f}s): '{transcript}'")
                        return transcript
                    else:
                        stt_logger.error(f"❌ GLADIA STT ERROR ({response_time:.2f}s): HTTP {response.status}")
                        return ""
        except Exception as e:
            response_time = time.time() - start_time
            stt_logger.error(f"❌ GLADIA STT ERROR ({response_time:.2f}s): {e}")
            return ""

class MinimaxTTS:
    """Custom MiniMax TTS wrapper for LiveKit"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.minimax.chat"
    
    async def synthesize(self, text: str):
        """Convert text to speech using MiniMax API"""
        start_time = time.time()
        try:
            tts_logger.info(f"🔊 MINIMAX TTS REQUEST: '{text[:100]}{'...' if len(text) > 100 else ''}'")
            
            async with aiohttp.ClientSession() as session:
                payload = {
                    "text": text,
                    "voice_setting": {
                        "voice_id": "presenter_male",
                        "speed": 1.0,
                        "vol": 1.0,
                        "pitch": 0
                    },
                    "audio_setting": {
                        "sample_rate": 24000,
                        "bitrate": 128000,
                        "format": "wav"
                    }
                }
                
                headers = {
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                }
                
                async with session.post(
                    f"{self.base_url}/v1/text_to_speech",
                    json=payload,
                    headers=headers
                ) as response:
                    response_time = time.time() - start_time
                    if response.status == 200:
                        audio_data = await response.read()
                        tts_logger.info(f"🎵 MINIMAX TTS RESPONSE ({response_time:.2f}s): Generated {len(audio_data)} bytes of audio")
                        return audio_data
                    else:
                        tts_logger.error(f"❌ MINIMAX TTS ERROR ({response_time:.2f}s): HTTP {response.status}")
                        return b""
        except Exception as e:
            response_time = time.time() - start_time
            tts_logger.error(f"❌ MINIMAX TTS ERROR ({response_time:.2f}s): {e}")
            return b""

class HistoryAgent(Agent):
    """History-focused voice agent"""
    
    def __init__(self, context: Optional[str] = None):
        # Initialize custom services
        gemini_key = os.getenv("GEMINI_API_KEY")
        gladia_key = os.getenv("GLADIA_API_KEY")  
        minimax_key = os.getenv("MINIMAX_API_KEY")
        
        if not all([gemini_key, gladia_key, minimax_key]):
            raise ValueError("Missing required API keys. Check your .env file.")
        
        self.gemini_llm = GeminiLLM(gemini_key)
        self.gladia_stt = GladiaSTT(gladia_key)
        self.minimax_tts = MinimaxTTS(minimax_key)
        self.context = context or ""
        
        # Build instructions with optional context
        base_instructions = """
        You are a knowledgeable and enthusiastic history expert specializing in historical places, events, and cultural heritage.
        
        Your role:
        - Share fascinating historical facts, stories, and insights
        - Help users discover the rich history of places around the world
        - Provide context about historical events, figures, and periods
        - Make history engaging and accessible through vivid storytelling
        - Connect past events to their modern significance
        
        Guidelines:
        - Be passionate and engaging about historical topics
        - Provide specific dates, names, and details when possible
        - Use storytelling to bring historical events to life
        - Encourage curiosity about history and cultural heritage
        - If you don't know something specific, admit it but offer related information
        - Keep responses conversational and informative
        """
        
        if self.context:
            base_instructions += f"\n\nAdditional context for this conversation:\n{self.context}"
        
        super().__init__(
            instructions=base_instructions,
            vad=silero.VAD.load(),
            stt=self._custom_stt,
            llm=self._custom_llm,
            tts=self._custom_tts,
            tools=[self.get_historical_info, self.explore_time_period]
        )
    
    async def _custom_stt(self, audio_data):
        """Custom STT using Gladia"""
        return await self.gladia_stt.recognize(audio_data)
    
    async def _custom_llm(self, messages, tools=None):
        """Custom LLM using Gemini"""
        return await self.gemini_llm.chat_completion(messages, tools)
    
    async def _custom_tts(self, text):
        """Custom TTS using MiniMax"""
        return await self.minimax_tts.synthesize(text)
    
    @function_tool()
    async def get_historical_info(
        self,
        place_or_event: Annotated[str, "The historical place, event, or topic to research"]
    ) -> str:
        """Get detailed historical information about a specific place, event, or historical topic."""
        
        # Enhanced prompt for Gemini to provide rich historical context
        prompt = f"""
        Provide comprehensive historical information about: {place_or_event}
        
        Include:
        - Key historical facts and timeline
        - Important figures and events
        - Cultural and architectural significance
        - Interesting stories or legends
        - Modern-day relevance or status
        
        Make it engaging and educational, suitable for someone curious about history.
        """
        
        try:
            response = await self.gemini_llm.chat_completion([
                {"role": "user", "content": prompt}
            ])
            return response['choices'][0]['message']['content']
        except Exception as e:
            return f"I encountered an issue researching {place_or_event}. Let me share what I know from my training data instead."
    
    @function_tool()
    async def explore_time_period(
        self,
        time_period: Annotated[str, "Historical time period or era to explore (e.g., 'Ancient Rome', 'Medieval Europe', '1920s America')"]
    ) -> str:
        """Explore and learn about a specific historical time period or era."""
        
        prompt = f"""
        Provide an engaging overview of the historical period: {time_period}
        
        Include:
        - Major events and developments
        - Daily life and society
        - Important figures and leaders
        - Cultural achievements and innovations
        - Lasting impact on modern world
        
        Make it vivid and immersive, as if taking someone on a journey through time.
        """
        
        try:
            response = await self.gemini_llm.chat_completion([
                {"role": "user", "content": prompt}
            ])
            return response['choices'][0]['message']['content']
        except Exception as e:
            return f"I had trouble exploring that time period in detail. Let me share what I know about {time_period} from my knowledge."
    
    async def on_enter(self):
        """Called when agent enters the session"""
        if self.context:
            await self.session.say(
                f"Hello! I'm your history guide. I have some context about {self.context}. "
                "What would you like to explore about history today?",
                allow_interruptions=True
            )
        else:
            await self.session.say(
                "Hello! I'm your personal history expert. I love sharing fascinating stories "
                "about historical places, events, and cultures. What historical topic interests you?",
                allow_interruptions=True
            )

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent"""
    await ctx.connect(auto_subscribe=True)
    
    # Extract context from room metadata if provided
    context = None
    if hasattr(ctx.room, 'metadata') and ctx.room.metadata:
        import json
        try:
            metadata = json.loads(ctx.room.metadata)
            context = metadata.get('context')
        except:
            pass
    
    # Create and start agent session
    agent = HistoryAgent(context=context)
    session = AgentSession()
    
    await session.start(agent=agent, room=ctx.room)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))