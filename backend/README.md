# Backend

## Requirements
- Node.js 18+
- MongoDB
- npm

## Setup
1. cd backend
2. npm install
3. Create a .env file with:
   - PORT=5000
   - MONGODB_URI=your_mongodb_connection_string
   - JWT_SECRET=your_jwt_secret
   - CORS_ORIGIN=http://localhost:5173
4. npm run dev

## Health Check
GET http://localhost:5000/health should return OK.

## Seed Data
- npm run seed:categories
- npm run seed:products
- npm run seed:all
