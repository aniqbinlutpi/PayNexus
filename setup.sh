#!/bin/bash

# PayNexus Setup Script
# This script sets up the complete PayNexus development environment

set -e

echo "🚀 Setting up PayNexus - The Unified Payment Network"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker is available"

# Check if Expo CLI is installed globally
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI globally..."
    npm install -g @expo/cli
fi

echo "✅ Expo CLI is available"

# Function to install dependencies
install_dependencies() {
    local dir=$1
    local name=$2
    
    echo "📦 Installing dependencies for $name..."
    cd "$dir"
    npm install
    cd ..
}

# Setup shared module
echo "🔧 Setting up shared module..."
install_dependencies "shared" "shared module"

# Build shared module
echo "🔨 Building shared module..."
cd shared
npm run build
cd ..

# Setup backend
echo "🔧 Setting up backend..."
install_dependencies "backend" "backend API"

# Copy environment file
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend environment file..."
    cp backend/env.example backend/.env
    echo "⚠️  Please update backend/.env with your actual configuration values"
fi

# Setup mobile app
echo "📱 Setting up mobile app..."
install_dependencies "mobile" "mobile app"

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL & Redis)..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for database services to be ready..."
sleep 10

# Generate Prisma client and run migrations
echo "🗃️  Setting up database..."
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..

echo ""
echo "🎉 PayNexus setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your actual configuration values"
echo "2. Start the backend server: cd backend && npm run dev"
echo "3. Start the mobile app: cd mobile && npm start"
echo ""
echo "🔗 Useful URLs:"
echo "- Backend API: http://localhost:3000"
echo "- Health Check: http://localhost:3000/health"
echo "- PostgreSQL: localhost:5432 (paynexus/paynexus123)"
echo "- Redis: localhost:6379"
echo ""
echo "🛠️  Development Commands:"
echo "- Backend: cd backend && npm run dev"
echo "- Mobile: cd mobile && npm start"
echo "- Database reset: cd backend && npm run db:reset"
echo "- View logs: docker-compose logs -f"
echo ""
echo "Happy coding! 🚀" 