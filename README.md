# Ask Heidi: Custom-Built AI Startup Advisory Platform

An advanced AI advisory platform that leverages Heidi Roizen's entrepreneurial wisdom through semantic search and AI-powered response generation.

## Project Overview

Heidi AI is a personal project I built from the ground up to create an intelligent advisory system that can provide entrepreneurial guidance based on Heidi Roizen's experiences and insights. Unlike many current AI applications that rely heavily on existing frameworks like LangChain, this project was designed and implemented from first principles, giving me complete control over the architecture and capabilities.

The platform combines vector-based semantic search with AI-powered response generation to create a system that can:

1. Interpret user queries about entrepreneurship and startup challenges
2. Search through a database of Heidi's advice and experiences
3. Generate helpful, contextually relevant responses in Heidi's distinctive communication style
4. Provide source attribution for all recommendations

## Key Features

- **Custom Vector Search Implementation**: Built a ground-up embedding-based semantic search system without relying on vector database services or LangChain abstractions
- **Two-Stage Response Generation**: Implements a novel two-stage approach for generating high-quality responses:
  - Stage 1: Analyzes user queries and identifies the most relevant advice
  - Stage 2: Reformulates responses to match Heidi's communication style while preserving factual accuracy
- **Caching System**: Implements efficient caching of embeddings to improve performance and reduce API costs
- **Streaming Responses**: Delivers responses via streaming for improved user experience
- **Modern Web Interface**: Clean, responsive UI built with React and Tailwind CSS

## Technical Stack

- **Backend**: Node.js with Express
- **Frontend**: React with Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: 
  - Anthropic Claude for response generation
  - OpenAI for embedding generation
- **Deployment**: PM2 process manager for production reliability

## Why Build From Scratch?

This project was intentionally built without using high-level AI frameworks like LangChain for several reasons:

1. **Deep Understanding**: Building components from first principles provided deeper insights into how modern AI systems work
2. **Customization**: Complete control over implementation details enabled custom optimizations for this specific use case
3. **Learning**: Developing a solution from scratch offered valuable learning opportunities about AI system design
4. **Performance**: Direct implementation allowed for tailored performance optimizations
5. **Reduced Dependencies**: Minimizing third-party dependencies results in a more maintainable codebase

## Key Implementation Details

- Custom vector search with cosine similarity scoring
- Two-phase prompt engineering with specialized system prompts
- Robust embedding caching system with backup mechanisms
- Streaming response generation
- Comprehensive error handling and rate limiting

# Project Structure
Project Structure

```
├── client/              # Frontend React application
├── server/              # Backend Express server
│   ├── services/        # Core services (Claude, VectorSearch, DataLoader)
│   ├── routes.ts        # API routes
│   └── index.ts         # Server entry point
├── shared/              # Shared types and utilities
├── dist/                # Compiled code
└── package.json         # Project dependencies
```

## Acknowledgements

Special thanks to Heidi Roizen for her entrepreneurial wisdom that forms the foundation of this advisory system.


