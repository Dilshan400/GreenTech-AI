import os
import json
import httpx
from typing import List, Dict, Optional
from app.config.settings import settings

SYSTEM_INSTRUCTION = (
    "You are GreenTech Advisor AI.\n"
    "Your purpose is to help users make environmentally responsible electronic purchasing decisions.\n"
    "Your answers should:\n"
    "- Explain environmental concepts clearly\n"
    "- Encourage sustainable thinking\n"
    "- Discuss benefits and limitations of electronics\n"
    "- Consider price, performance, lifespan, and usability\n"
    "- Never make unsupported environmental claims\n"
    "- Never say a company or product is completely green\n"
    "Connect answers naturally to green purchase intention, addressing environmental concern, "
    "knowledge, perceived benefits, and perceived barriers (such as cost and availability)."
)

def generate_ai_response(question: str, context_chunks: List[Dict], history: List[Dict]) -> str:
    """Generates responses using OpenAI or Gemini, with fallback to local synthesis."""
    openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    
    # Format context
    context_str = ""
    for idx, chunk in enumerate(context_chunks):
        context_str += f"Reference [{idx + 1}]:\nDocument: {chunk['title']}\nSource: {chunk['source']}\nContent: {chunk['text']}\n\n"
        
    # Format history
    history_str = ""
    for msg in history:
        sender = "User" if msg["sender"] == "user" else "Assistant"
        history_str += f"{sender}: {msg['text']}\n"
        
    # Construct prompt
    prompt = (
        f"You have the following retrieved knowledge context from the database:\n"
        f"======================\n{context_str}======================\n\n"
        f"Conversation History:\n{history_str}"
        f"User Question: {question}\n\n"
        f"Please answer the User Question using the context provided where possible. Follow the system instruction rules."
    )
    
    # OpenAI call
    if openai_key:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openai_key}"
        }
        
        messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
        for msg in history:
            role = "user" if msg["sender"] == "user" else "assistant"
            messages.append({"role": role, "content": msg["text"]})
            
        messages.append({
            "role": "user",
            "content": f"Retrieved Context:\n{context_str}\n\nUser Question: {question}"
        })
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.3
        }
        
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=25.0)
            if response.status_code == 200:
                data = response.json()
                text = data["choices"][0]["message"]["content"]
                return text
            else:
                print(f"OpenAI API error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Failed to connect to OpenAI API: {e}")
            
    # Gemini call
    elif gemini_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]}
        }
        
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=25.0)
            if response.status_code == 200:
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
            else:
                print(f"Gemini API error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Failed to connect to Gemini API: {e}")
            
    # Local fallback
    return synthesize_local_response(question, context_chunks, history)


def synthesize_local_response(question: str, context_chunks: List[Dict], history: List[Dict]) -> str:
    """Synthesizes response based on retrieved text passages."""
    q_lower = question.lower().strip().replace("?", "").replace("!", "")
    
    # Check greetings
    greetings = {"hello", "hi", "hey", "greetings", "good morning", "good afternoon", "yo", "start", "hi there", "hello there"}
    if q_lower in greetings or q_lower == "hi" or q_lower == "hello":
        return "Hello! I am GreenTech Advisor AI, your assistant for sustainable technology and eco-friendly electronic purchases. How can I help you today?"
        
    # RAG context matching
    if context_chunks:
        best_chunk = context_chunks[0]
        text = best_chunk.get("text", "").strip()
        
        # Clean border characters
        if text.startswith("n. "):
            text = text[3:]
        elif text.startswith("er. "):
            text = text[4:]
            
        # Capitalize first letter
        if text and text[0].islower():
            text = text[0].upper() + text[1:]
            
        return text

    # Default fallback
    return (
        "I couldn't find specific literature on that topic in our database. "
        "Generally, you should look for Energy Star or EPEAT certified devices, prioritize repairable "
        "configurations, and recycle older hardware at licensed electronic waste collectors. "
        "Could you please specify what device or factor you are asking about?"
    )
