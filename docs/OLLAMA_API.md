Ollama API Guide

Base URL

https://ollama.peaknext.cloud

Authentication

All requests require an API key via the Authorization header:

Authorization: Bearer 17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c

Requests without a valid key will receive 401 Unauthorized.

Available Models

┌──────────┬────────────┬──────────────┬───────────────────────────────────────────┐
│ Model │ Parameters │ Quantization │ Best For │
├──────────┼────────────┼──────────────┼───────────────────────────────────────────┤
│ llama3.2 │ 3.2B │ Q4_K_M │ General chat, summarization, simple tasks │
└──────────┴────────────┴──────────────┴───────────────────────────────────────────┘

API Endpoints

1. Chat Completion (Recommended)

POST /api/chat

Use this for conversational interactions with message history.

curl -X POST https://ollama.peaknext.cloud/api/chat \
 -H "Authorization: Bearer 17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c" \
 -H "Content-Type: application/json" \
 -d '{
"model": "llama3.2",
"messages": [
{"role": "system", "content": "You are a helpful assistant."},
{"role": "user", "content": "What is Docker?"}
],
"stream": false
}'

Response:

{
"model": "llama3.2",
"message": {
"role": "assistant",
"content": "Docker is a platform for building, shipping, and running applications in containers..."
},
"done": true
}

Parameters:

┌─────────────┬────────┬──────────┬──────────────────────────────────────────────────────────────┐
│ Parameter │ Type │ Default │ Description │
├─────────────┼────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ model │ string │ required │ Model name (e.g. llama3.2) │
├─────────────┼────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ messages │ array │ required │ Array of message objects with role and content │
├─────────────┼────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ stream │ bool │ true │ Set false to get a single JSON response instead of streaming │
├─────────────┼────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ temperature │ float │ 0.8 │ Controls randomness (0.0 = deterministic, 1.0 = creative) │
├─────────────┼────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ top_p │ float │ 0.9 │ Nucleus sampling threshold │
├─────────────┼────────┼──────────┼──────────────────────────────────────────────────────────────┤
│ num_predict │ int │ 128 │ Max number of tokens to generate │
└─────────────┴────────┴──────────┴──────────────────────────────────────────────────────────────┘

2. Text Generation

POST /api/generate

Use this for single-prompt completions without chat history.

curl -X POST https://ollama.peaknext.cloud/api/generate \
 -H "Authorization: Bearer 17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c" \
 -H "Content-Type: application/json" \
 -d '{
"model": "llama3.2",
"prompt": "Explain Kubernetes in 3 bullet points.",
"stream": false
}'

3. Embeddings

POST /api/embeddings

Generate vector embeddings for text (useful for RAG, semantic search).

curl -X POST https://ollama.peaknext.cloud/api/embeddings \
 -H "Authorization: Bearer 17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c" \
 -H "Content-Type: application/json" \
 -d '{
"model": "llama3.2",
"prompt": "The quick brown fox jumps over the lazy dog."
}'

4. List Models

GET /api/tags

curl https://ollama.peaknext.cloud/api/tags \
 -H "Authorization: Bearer 17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c"

5. Check Server Status

GET /api/version

curl https://ollama.peaknext.cloud/api/version \
 -H "Authorization: Bearer 17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c"

Code Examples

Python

import requests

API_URL = "https://ollama.peaknext.cloud"
API_KEY = "17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c"

headers = {
"Authorization": f"Bearer {API_KEY}",
"Content-Type": "application/json",
}

# Chat completion

response = requests.post(f"{API_URL}/api/chat", headers=headers, json={
"model": "llama3.2",
"messages": [
{"role": "user", "content": "Write a Python function to reverse a string."}
],
"stream": False,
})

data = response.json()
print(data["message"]["content"])

Python (OpenAI-compatible)

Ollama supports the OpenAI API format, so you can use the OpenAI Python SDK:

from openai import OpenAI

client = OpenAI(
base_url="https://ollama.peaknext.cloud/v1",
api_key="17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c",
)

response = client.chat.completions.create(
model="llama3.2",
messages=[
{"role": "user", "content": "Write a Python function to reverse a string."}
],
)

print(response.choices[0].message.content)

JavaScript / TypeScript

const API_URL = "https://ollama.peaknext.cloud";
const API_KEY = "17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c";

const response = await fetch(`${API_URL}/api/chat`, {
method: "POST",
headers: {
"Authorization": `Bearer ${API_KEY}`,
"Content-Type": "application/json",
},
body: JSON.stringify({
model: "llama3.2",
messages: [
{ role: "user", content: "Write a function to reverse a string." }
],
stream: false,
}),
});

const data = await response.json();
console.log(data.message.content);

JavaScript (OpenAI-compatible)

import OpenAI from "openai";

const client = new OpenAI({
baseURL: "https://ollama.peaknext.cloud/v1",
apiKey: "17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c",
});

const response = await client.chat.completions.create({
model: "llama3.2",
messages: [
{ role: "user", content: "Write a function to reverse a string." }
],
});

console.log(response.choices[0].message.content);

Docker Container Access

If your app runs in Docker on the same host, you can join the ollama-net network for direct access (no auth required internally):

# In your app's docker-compose.yml

services:
myapp:
image: your-app
environment: - OLLAMA_URL=http://ollama-api:11434
networks: - ollama-net

networks:
ollama-net:
external: true

Streaming Responses

By default, responses stream as newline-delimited JSON. To use streaming:

import requests

response = requests.post(
"https://ollama.peaknext.cloud/api/chat",
headers={
"Authorization": "Bearer 17xG0LiQyySUnVLEbuk3ipHZvS2_wlXpkZFtZNoce5c",
},
json={
"model": "llama3.2",
"messages": [{"role": "user", "content": "Tell me a story."}],
"stream": True,
},
stream=True,
)

for line in response.iter_lines():
if line:
import json
chunk = json.loads(line)
print(chunk["message"]["content"], end="", flush=True)

Rate Limits and Constraints

- No rate limit enforced, but the server processes one inference at a time; concurrent requests are queued.
- The model runs on CPU, so expect response times of a few seconds for short replies.
- Max request timeout is 300 seconds.

Troubleshooting

┌─────────────────────────┬───────────────────────────────────────────────────────────────────┐
│ Issue │ Solution │
├─────────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 401 Unauthorized │ Check that your Authorization header is correct: Bearer <key> │
├─────────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 404 model not found │ Use llama3.2 — check /api/tags for available models │
├─────────────────────────┼───────────────────────────────────────────────────────────────────┤
│ Timeout / slow response │ The server is CPU-only; try shorter prompts or reduce num_predict │
├─────────────────────────┼───────────────────────────────────────────────────────────────────┤
│ Connection refused │ Contact the server admin to verify the service is running │
└─────────────────────────┴───────────────────────────────────────────────────────────────────┘

Bonus
Prompting Llama 3.2 (3B) Effectively

This is a small 3B parameter model with Q4 quantization, so prompt design matters a lot. Here are the key guidelines:

Structure

1. System prompt — Keep it short and specific (1-2 sentences):
   {"role": "system", "content": "You are a concise technical assistant. Answer in plain language."}
   Avoid long personas or complex instructions — the model can't reliably follow them.

2. User prompt — Be direct and explicit:
   // Bad (too vague)
   "Tell me about Docker"

// Good (specific, constrained)
"Explain what a Docker container is in 3 bullet points."

What works well with 3B models

┌─────────────────────────┬──────────────────────────────────────────────────────────────────┐
│ Technique │ Example │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Constrain output format │ "Answer with only YES or NO" │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ One task per prompt │ Don't combine summarize + translate + format │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Give examples (1-shot) │ "Example: Input: 'happy' → Output: 'glad'. Now: Input: 'fast' →" │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Keep context short │ Under ~500 words of input text │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Use simple instructions │ "List 3 reasons" instead of "Provide a comprehensive analysis" │
└─────────────────────────┴──────────────────────────────────────────────────────────────────┘

What to avoid

- Long chain-of-thought prompts — 3B models struggle with multi-step reasoning
- Multiple instructions — they tend to follow only the first or last one
- Large input text — summarizing 2000+ words will degrade quality
- Ambiguous requests — the model won't infer what you really mean
- Asking it to "not" do something — positive instructions work better than negations

Optimal prompt length

- System prompt: 20-50 tokens (~1-2 sentences)
- User prompt: 30-200 tokens for best results
- Input text (if summarizing/analyzing): under 500 words
- num_predict: set this to match your expected output length to avoid rambling (your default is 128)

Practical example

{
"model": "llama3.2",
"messages": [
{"role": "system", "content": "You are a helpful coding assistant. Give short answers."},
{"role": "user", "content": "Write a Python function that checks if a string is a palindrome. Include a docstring."}
],
"stream": False,
"temperature": 0.3, # lower = more predictable
"num_predict": 256 # enough for a short function
}

Rule of thumb: treat Llama 3.2 3B like a capable junior — give it one clear task with explicit constraints, and it performs well. Ask it to juggle multiple things and quality drops fast.
