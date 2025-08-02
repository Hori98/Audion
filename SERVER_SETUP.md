# Server Port Management

## Port Allocation
- **Claude (Testing)**: Port 8080 - `http://192.168.11.60:8080`
- **User (Development)**: Port 8000 - `http://192.168.11.60:8000`

## User Server Startup

### Option 1: Use startup script
```bash
./start_user_server.sh
```

### Option 2: Manual startup
```bash
cd backend
source venv/bin/activate
export PORT=8000
python server.py
```

## Environment Files

- `.env` - Default (User server on port 8000)
- `.env.user` - User server configuration
- `.env.claude` - Claude server configuration

## Current Status
- Claude server: Running on port 8080
- User server: Available on port 8000

## Switching Configurations
To use Claude's server for testing:
```bash
cp .env.claude .env
```

To use your server:
```bash
cp .env.user .env
```

Then restart Expo app to reload environment variables.