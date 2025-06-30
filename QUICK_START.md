# PayNexus - Quick Start Guide

## 🚀 Get PayNexus Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Docker Desktop running
- Git installed

### 1. Clone and Setup (Automated)
```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd PayNet

# Run the automated setup script
chmod +x setup.sh
./setup.sh
```

The setup script will:
- ✅ Install all dependencies
- ✅ Start PostgreSQL and Redis containers
- ✅ Generate Prisma client
- ✅ Run database migrations
- ✅ Create environment files

### 2. Start Development Servers

#### Terminal 1: Backend API
```bash
cd backend
npm run dev
```
🌐 Backend running at: http://localhost:3000

#### Terminal 2: Mobile App
```bash
cd mobile
npm start
```
📱 Expo dev server will start with QR code for mobile testing

### 3. Test the Setup

#### Test Backend API
```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...,"environment":"development"}
```

#### Test User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@paynexus.com",
    "password": "password123",
    "firstName": "Demo",
    "lastName": "User",
    "phoneNumber": "+60123456789",
    "countryCode": "MY"
  }'
```

#### Test User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@paynexus.com",
    "password": "password123"
  }'
```

### 4. Mobile App Testing

1. Install Expo Go app on your phone
2. Scan the QR code from the terminal
3. The app will load (currently shows foundation structure)

## 🛠️ Development Commands

### Backend
```bash
cd backend

# Start development server
npm run dev

# Database operations
npm run db:migrate      # Run migrations
npm run db:reset        # Reset database
npm run db:generate     # Generate Prisma client

# Build for production
npm run build
npm start
```

### Mobile App
```bash
cd mobile

# Start Expo development server
npm start

# Start on specific platform
npm run android
npm run ios
npm run web

# Build for production
npm run build:android
npm run build:ios
```

### Shared Module
```bash
cd shared

# Build shared types and utilities
npm run build

# Watch for changes during development
npm run dev
```

## 🐳 Docker Services

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Database Access
```bash
# PostgreSQL
docker exec -it paynexus-postgres psql -U paynexus -d paynexus

# Redis CLI
docker exec -it paynexus-redis redis-cli
```

## 🔧 Configuration

### Backend Environment Variables
Copy `backend/env.example` to `backend/.env` and update:

```env
# Database
DATABASE_URL="postgresql://paynexus:paynexus123@localhost:5432/paynexus?schema=public"

# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# API Keys (get your own)
EXCHANGE_RATE_API_KEY="your-exchange-rate-api-key"
```

## 🎯 Next Development Steps

1. **Implement Smart Routing Engine**
   - File: `backend/src/services/SmartRoutingService.ts`
   - Add account selection logic

2. **Create Mobile Authentication Screens**
   - Folder: `mobile/src/screens/auth/`
   - Login, Register, and Profile screens

3. **Build Payment Flow**
   - Backend: Payment processing pipeline
   - Mobile: Payment initiation and QR scanning

4. **Add Mock Banking Integration**
   - File: `backend/src/services/MockBankingService.ts`
   - Simulate real banking APIs

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

#### Database Connection Error
```bash
# Restart Docker services
docker-compose down
docker-compose up -d

# Wait 10 seconds, then retry
```

#### Expo Not Starting
```bash
# Clear Expo cache
npx expo start --clear

# Or reinstall Expo CLI
npm uninstall -g @expo/cli
npm install -g @expo/cli
```

#### TypeScript Errors
```bash
# Rebuild shared module
cd shared
npm run build

# Regenerate Prisma client
cd backend
npx prisma generate
```

## 📊 Project Status Dashboard

- ✅ **Backend API**: Authentication, Database, Real-time ready
- ✅ **Database**: Complete schema for all features
- ✅ **Mobile Foundation**: Navigation, State management ready
- 🚧 **Payment Processing**: Core logic needed
- 🚧 **Mobile UI**: Screens need implementation
- 🚧 **Smart Routing**: Algorithm implementation needed

## 🆘 Need Help?

1. Check `PROJECT_STATUS.md` for detailed implementation status
2. Review `README.md` for architecture overview
3. Examine the codebase - it's well-commented
4. The database schema in `backend/prisma/schema.prisma` shows all available features

---

**You're now ready to build the future of unified payments! 🚀** 