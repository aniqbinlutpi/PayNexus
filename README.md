# PayNexus - The Unified Payment Network

## Overview
PayNexus is an intelligent, decentralized payment aggregator and router that securely links users' existing financial accounts into a single, unified profile. It uses Smart Routing to automatically select the optimal payment rail for each transaction.

## Architecture

### Frontend (Mobile App)
- **React Native with Expo**: Cross-platform mobile development
- **TypeScript**: Type safety and better development experience
- **React Navigation**: Navigation between screens
- **Zustand**: Lightweight state management
- **React Hook Form**: Form handling and validation

### Backend (API Server)
- **Node.js with Express.js**: Fast, scalable server
- **TypeScript**: Type safety across the stack
- **Prisma ORM**: Database management and migrations
- **Redis**: Caching and session management
- **Socket.io**: Real-time notifications
- **JWT**: Authentication and authorization

### Database
- **PostgreSQL**: Primary database for user data, transactions, and rules
- **Redis**: In-memory cache for routing decisions and real-time data

### External Integrations
- **Mock Banking APIs**: Simulated DuitNow, FPX, PromptPay
- **FX API**: Real-time exchange rates
- **Open Finance APIs**: Account linking simulation

## Project Structure

```
PayNet/
├── 📱 mobile/                    # React Native + Expo Mobile App
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── screens/            # App screens
│   │   ├── navigation/         # Navigation setup
│   │   ├── stores/            # Zustand state management
│   │   ├── services/          # API and business logic
│   │   ├── utils/             # Utility functions
│   │   └── theme/             # Design system
│   ├── App.tsx                # Main app component
│   ├── app.json              # Expo configuration
│   └── package.json
│
├── 🖥️ backend/                  # Node.js + Express API Server
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic services
│   │   ├── middleware/        # Express middleware
│   │   ├── config/           # Database & Redis config
│   │   ├── utils/            # Utility functions
│   │   └── index.ts          # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Database migrations
│   ├── env.example           # Environment variables template
│   ├── tsconfig.json         # TypeScript configuration
│   └── package.json
│
├── 🔗 shared/                   # Shared Types & Utilities
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Shared utility functions
│   ├── index.ts              # Main exports
│   ├── tsconfig.json         # TypeScript configuration
│   └── package.json
│
├── 🐳 docker-compose.yml        # PostgreSQL + Redis services
├── 🚀 setup.sh                 # Automated setup script
└── 📖 README.md                # This file
```

## Quick Start

1. **Prerequisites**
   ```bash
   # Install Node.js 18+, Docker, and Expo CLI
   npm install -g @expo/cli
   ```

2. **Setup Database**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run db:migrate
   npm run dev
   ```

4. **Mobile App Setup**
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

## Key Features

- **Smart Routing**: Intelligent payment rail selection
- **Multi-Account Linking**: Connect multiple banks and e-wallets
- **Fallback Logic**: Automatic rerouting when primary methods fail
- **Cross-Border Payments**: Seamless international transactions
- **Real-time Notifications**: Instant payment confirmations
- **User-Defined Rules**: Customizable payment preferences

## Development Roadmap

### Phase 1: Core MVP
- [ ] User authentication and onboarding
- [ ] Account linking simulation
- [ ] Basic payment processing
- [ ] Smart routing engine
- [ ] Mobile app UI/UX

### Phase 2: Advanced Features
- [ ] Cross-border payment simulation
- [ ] Advanced routing rules
- [ ] Transaction history and analytics
- [ ] Push notifications
- [ ] QR code generation and scanning

### Phase 3: Integration Ready
- [ ] Real banking API integration
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Comprehensive testing

## Contributing

This is a hackathon project. See individual component READMEs for specific development instructions.

## License

MIT License - Built for PayHack 2025 