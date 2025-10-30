---
title: Installation
sidebar_position: 1
---

# Installation

This guide will help you set up your development environment for the AgriTech Platform. Follow these steps to install all necessary prerequisites.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

#### 1. Node.js and npm

The frontend requires **Node.js 18.x or higher** and npm (which comes with Node.js).

**Check your current version:**

```bash
node --version
npm --version
```

**Installation:**

- **macOS**: Using Homebrew
  ```bash
  brew install node@18
  ```

- **Linux**: Using nvm (recommended)
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  nvm install 18
  nvm use 18
  ```

- **Windows**: Download from [nodejs.org](https://nodejs.org/)

:::tip
We recommend using [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) to manage multiple Node.js versions on your machine.
:::

#### 2. Package Manager (npm or yarn)

The project supports both npm and yarn. We'll use npm in these examples, but you can use yarn if you prefer.

**Install Yarn (optional):**

```bash
npm install -g yarn
```

#### 3. Git

**Check your current version:**

```bash
git --version
```

**Installation:**

- **macOS**: `brew install git`
- **Linux**: `sudo apt-get install git` (Debian/Ubuntu) or `sudo yum install git` (CentOS/RHEL)
- **Windows**: Download from [git-scm.com](https://git-scm.com/)

#### 4. Supabase CLI

The Supabase CLI is required for local database development and deployment.

**Installation:**

```bash
npm install -g supabase
```

**Verify installation:**

```bash
supabase --version
```

**Initialize Docker for Supabase:**

The Supabase CLI requires Docker to run a local instance. Install Docker Desktop:

- **macOS**: Download from [docker.com](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow instructions at [docs.docker.com](https://docs.docker.com/engine/install/)
- **Windows**: Download from [docker.com](https://www.docker.com/products/docker-desktop)

**Verify Docker installation:**

```bash
docker --version
docker-compose --version
```

:::warning
Ensure Docker Desktop is running before starting local Supabase services. The Supabase CLI will fail if Docker is not running.
:::

### Python Setup (for Satellite Service)

The satellite indices service requires **Python 3.9 or higher**.

#### 1. Python Installation

**Check your current version:**

```bash
python3 --version
```

**Installation:**

- **macOS**: Using Homebrew
  ```bash
  brew install python@3.9
  ```

- **Linux**: Using apt (Debian/Ubuntu)
  ```bash
  sudo apt-get update
  sudo apt-get install python3.9 python3.9-venv python3-pip
  ```

- **Windows**: Download from [python.org](https://www.python.org/downloads/)

#### 2. Virtual Environment (recommended)

Create a virtual environment for the satellite service:

```bash
cd satellite-indices-service
python3 -m venv venv
```

**Activate the virtual environment:**

- **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```

- **Windows**:
  ```bash
  venv\Scripts\activate
  ```

#### 3. Python Dependencies

With the virtual environment activated, install the required packages:

```bash
pip install -r requirements.txt
```

**Key Python packages:**
- `fastapi` - Web framework for the satellite service
- `uvicorn` - ASGI server
- `earthengine-api` - Google Earth Engine Python API
- `celery` - Background task processing
- `redis` - Celery broker and result backend

:::tip
If you encounter issues with Google Earth Engine authentication, you'll need to authenticate with a service account. See the [Environment Setup](./environment-setup.md) guide for details.
:::

### Optional Tools

#### Redis (for background jobs)

Redis is required for Celery background jobs (batch satellite processing).

**Installation:**

- **macOS**: `brew install redis`
- **Linux**: `sudo apt-get install redis-server`
- **Windows**: Use [WSL](https://docs.microsoft.com/en-us/windows/wsl/) or Docker

**Start Redis:**

```bash
redis-server
```

**Verify Redis is running:**

```bash
redis-cli ping
# Should return: PONG
```

#### PostgreSQL Client (optional)

For direct database inspection, you can install the PostgreSQL client:

```bash
# macOS
brew install postgresql

# Linux
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### Code Editor Recommendations

We recommend **Visual Studio Code** with the following extensions:

- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **TypeScript Vue Plugin** - TypeScript support
- **Tailwind CSS IntelliSense** - Tailwind CSS autocomplete
- **Python** - Python language support
- **Pylance** - Python type checking and IntelliSense

## Verify Installation

Once you've installed all prerequisites, verify your setup:

```bash
# Node.js and npm
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Git
git --version

# Supabase CLI
supabase --version

# Docker
docker --version
docker-compose --version

# Python
python3 --version  # Should be 3.9 or higher
pip --version

# Redis (optional)
redis-cli --version
```

## Next Steps

Now that you have all prerequisites installed, proceed to the [Quick Start Guide](./quick-start.md) to clone the repository and run the application locally.

## Troubleshooting

### Node.js Installation Issues

**Problem**: `node: command not found`

**Solution**: Ensure Node.js is in your PATH. If using nvm, run `nvm use 18`.

### Supabase CLI Issues

**Problem**: `supabase: command not found`

**Solution**: Reinstall globally with `npm install -g supabase` and ensure npm global bin directory is in your PATH.

### Docker Issues

**Problem**: `Cannot connect to the Docker daemon`

**Solution**: Ensure Docker Desktop is running. On Linux, start the Docker service with `sudo systemctl start docker`.

### Python Virtual Environment Issues

**Problem**: `python3: command not found`

**Solution**: On some systems, Python 3 is available as `python` instead of `python3`. Try using `python --version`.

### Redis Connection Issues

**Problem**: `Error: Redis connection to localhost:6379 failed`

**Solution**: Ensure Redis is running with `redis-server`. Check if it's running with `redis-cli ping`.

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Docker Documentation](https://docs.docker.com/)
- [Python Virtual Environments](https://docs.python.org/3/tutorial/venv.html)
- [Google Earth Engine Setup](https://developers.google.com/earth-engine/guides/python_install)
