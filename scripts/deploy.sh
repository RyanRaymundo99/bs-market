#!/bin/bash

# BS Market - Quick Deployment Script
# This script helps you deploy BS Market to Vercel

set -e

echo "🚀 BS Market - Deployment Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI is not installed. Installing..."
        npm install -g vercel
    fi
    
    print_success "All dependencies are available"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
        print_warning "No .env file found. Please create one from env.example"
        print_status "Copying env.example to .env.local..."
        cp env.example .env.local
        print_warning "Please edit .env.local with your actual values before deploying"
        exit 1
    fi
}

# Run pre-deployment checks
run_checks() {
    print_status "Running pre-deployment checks..."
    
    # Type check
    print_status "Running TypeScript type check..."
    npm run type-check
    
    # Lint check
    print_status "Running ESLint..."
    npm run lint
    
    # Build check
    print_status "Building application..."
    npm run build
    
    print_success "All checks passed!"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if user is logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        print_status "Please log in to Vercel..."
        vercel login
    fi
    
    # Deploy
    print_status "Starting deployment..."
    vercel --prod
    
    print_success "Deployment completed!"
}

# Post-deployment instructions
post_deployment() {
    print_status "Post-deployment steps:"
    echo ""
    echo "1. Set up your database:"
    echo "   - Go to Vercel Dashboard > Functions > Terminal"
    echo "   - Run: npx prisma db push"
    echo ""
    echo "2. Configure environment variables:"
    echo "   - Go to Vercel Dashboard > Settings > Environment Variables"
    echo "   - Add all required variables from env.example"
    echo ""
    echo "3. Set up admin user:"
    echo "   - Go to /admin/login"
    echo "   - Create admin account"
    echo ""
    echo "4. Test your deployment:"
    echo "   - Visit your Vercel URL"
    echo "   - Test all major features"
    echo ""
    print_success "Deployment guide available in DEPLOYMENT_GUIDE.md"
}

# Main execution
main() {
    echo ""
    print_status "Starting deployment process..."
    echo ""
    
    check_dependencies
    check_env_file
    run_checks
    deploy_vercel
    post_deployment
    
    echo ""
    print_success "🎉 Deployment process completed!"
    print_status "Check DEPLOYMENT_CHECKLIST.md for verification steps"
}

# Run main function
main "$@"
