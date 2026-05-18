# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites Check
- ✅ Node.js 20+ installed
- ✅ PostgreSQL 15+ running
- ✅ OpenRouter API key ready

### Step 1: Install Dependencies (2 minutes)

```bash
cd "d:\Real-Time Intelligence POC"

# Install backend
cd backend
npm install

# Install frontend
cd ..\frontend
npm install
```

### Step 2: Configure Environment (1 minute)

Edit `backend\.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/realtime_intelligence?schema=public"
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
```

### Step 3: Setup Database (1 minute)

```bash
# Create database
createdb realtime_intelligence

# Run migrations
cd backend
npm run prisma:migrate
```

### Step 4: Start Application (1 minute)

```bash
# Option 1: Use start script
cd ..
start-dev.bat

# Option 2: Manual start
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

### Step 5: Access Application

Open your browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🎯 First Steps

1. **Register**: Create an account at http://localhost:3000
2. **Login**: Sign in with your credentials
3. **Start Session**: Click "Start New Session"
4. **Upload Documents**: Upload PDF, DOCX, TXT, or MD files
5. **Interact**: Type messages or record audio
6. **Get AI Insights**: Receive real-time AI suggestions

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check PostgreSQL
psql -U postgres -c "SELECT version();"

# Regenerate Prisma Client
cd backend
npm run prisma:generate

# Check logs
type logs\error.log
```

### Frontend won't connect
```bash
# Verify backend is running
curl http://localhost:5000/health

# Check environment
type frontend\.env
```

### Database errors
```bash
# Reset database
cd backend
npx prisma migrate reset

# Rerun migrations
npm run prisma:migrate
```

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for design details
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

## 🆘 Need Help?

1. Check logs in `backend\logs\`
2. Verify environment variables
3. Test database connection
4. Review error messages

---

**Happy Building! 🎉**
