# Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- OpenRouter API Key
- (Optional) Docker & Docker Compose

## Local Development Deployment

### Step 1: Install Dependencies

```bash
# Run setup script
setup.bat

# Or manually:
cd backend
npm install
cd ../frontend
npm install
```

### Step 2: Configure Environment

Edit `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/realtime_intelligence?schema=public"
OPENROUTER_API_KEY=your_actual_api_key_here
JWT_SECRET=your_secure_random_string_here
```

### Step 3: Setup Database

```bash
# Create PostgreSQL database
createdb realtime_intelligence

# Run migrations
cd backend
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### Step 4: Start Services

```bash
# Option 1: Use start script
start-dev.bat

# Option 2: Manual start
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 5: Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## Docker Deployment

### Step 1: Create Environment File

Create `.env` in project root:
```env
OPENROUTER_API_KEY=your_api_key_here
JWT_SECRET=your_secure_secret_here
```

### Step 2: Build and Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Run Migrations

```bash
# Run migrations in container
docker-compose exec backend npx prisma migrate deploy
```

## Production Deployment

### Environment Variables

Set these in your production environment:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
OPENROUTER_API_KEY=your_production_key
JWT_SECRET=strong_random_secret_min_32_chars
FRONTEND_URL=https://your-domain.com
LOG_LEVEL=warn
```

### Build for Production

```bash
# Backend
cd backend
npm ci --production
npm run build
npm start

# Frontend
cd frontend
npm ci --production
npm run build
npm start
```

### Nginx Configuration

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/TLS Configuration

Use Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Cloud Deployment Options

### AWS

1. **RDS** for PostgreSQL
2. **EC2** or **ECS** for backend
3. **S3 + CloudFront** for frontend
4. **ElastiCache** for Redis (optional)
5. **CloudWatch** for logging

### Azure

1. **Azure Database for PostgreSQL**
2. **App Service** for backend
3. **Static Web Apps** for frontend
4. **Application Insights** for monitoring

### Google Cloud

1. **Cloud SQL** for PostgreSQL
2. **Cloud Run** for backend
3. **Firebase Hosting** for frontend
4. **Cloud Logging** for logs

### Vercel (Frontend Only)

```bash
cd frontend
vercel deploy --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

## Database Migrations

### Development

```bash
# Create migration
npm run prisma:migrate

# Reset database
npx prisma migrate reset
```

### Production

```bash
# Deploy migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

## Monitoring & Logging

### Application Logs

Logs are stored in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Error logs only

### Health Checks

- Backend: `GET /health`
- Database: Check Prisma connection
- WebSocket: Monitor connection count

### Metrics to Monitor

1. API response times
2. Database query performance
3. WebSocket connection count
4. Memory usage
5. CPU usage
6. Error rates
7. AI suggestion latency

## Backup & Recovery

### Database Backup

```bash
# Backup
pg_dump -U postgres realtime_intelligence > backup.sql

# Restore
psql -U postgres realtime_intelligence < backup.sql
```

### File Backup

Backup these directories:
- `backend/uploads/` - Uploaded documents
- `backend/vectorstore/` - Vector embeddings
- `backend/logs/` - Application logs

## Scaling

### Horizontal Scaling

1. Use load balancer (Nginx, HAProxy)
2. Run multiple backend instances
3. Use Redis for session storage
4. Use shared file storage (S3, Azure Blob)

### Database Scaling

1. Enable connection pooling
2. Add read replicas
3. Implement caching layer
4. Optimize queries with indexes

### WebSocket Scaling

1. Use Redis adapter for Socket.IO
2. Enable sticky sessions
3. Use WebSocket-aware load balancer

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong database passwords
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Enable SQL injection protection
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated
- [ ] Use environment variables
- [ ] Enable database encryption
- [ ] Implement audit logging
- [ ] Configure firewall rules

## Troubleshooting

### Backend won't start

1. Check PostgreSQL is running
2. Verify DATABASE_URL is correct
3. Run `npm run prisma:generate`
4. Check logs in `backend/logs/`

### Frontend won't connect

1. Verify backend is running
2. Check NEXT_PUBLIC_API_URL
3. Check CORS configuration
4. Verify network connectivity

### Database connection errors

1. Check PostgreSQL service status
2. Verify credentials
3. Check firewall rules
4. Test connection: `psql -U postgres`

### WebSocket connection fails

1. Check Socket.IO configuration
2. Verify CORS settings
3. Check proxy/load balancer config
4. Test with Socket.IO client

## Performance Optimization

1. Enable gzip compression
2. Use CDN for static assets
3. Implement caching strategy
4. Optimize database queries
5. Use connection pooling
6. Enable HTTP/2
7. Minify frontend assets
8. Lazy load components
9. Implement pagination
10. Use database indexes

## Maintenance

### Regular Tasks

- Update dependencies monthly
- Review and rotate logs weekly
- Backup database daily
- Monitor disk space
- Review error logs
- Update SSL certificates
- Security patches

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update packages
npm update

# Update major versions
npm install package@latest
```

## Support

For issues or questions:
1. Check logs in `backend/logs/`
2. Review error messages
3. Check database connectivity
4. Verify environment variables
5. Test API endpoints manually
6. Check WebSocket connection

---

**Remember**: Always test in staging before deploying to production!
