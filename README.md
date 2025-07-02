# Firefly transaction merger

## Rationale

I really like the [Firefly III](https://firefly-iii.org/) personal finance manager, but
entring my transactions is always a PITA. [Waterfly III](https://github.com/dreautall/waterfly-iii) simplifies
this process a lot, but it has its pitfalls:
* it misses transactions sometimes;
* it doesn't store the notifications, so if you accidentally swipe them out or reboot your phone, you lose them;
* if there's more than 10 unprocessed notifications, the earlier ones get lost too.

Plus, I always wanted to have an ability to load the data (description, account and category) from the latest similar
transation; some transactions, like buying food in my local supermarket, are occuring frequently, and it just bugs me to
enter these details manually, even with all the autocompletes. Using Firefly III rules isn't ideal either, as I'd like to
have this info when entering the transaction, to be able to correct it if needed.

## My use-case

Matters get more complicated, as my bank ([Raiffeisen Ukraine](https://raiffeisen.ua/)) doesn't provide any API to get the bank statement; all it has currently is an ability to export a statement it a PDF(!) format.

The project is rather bank-specific, especially the merging part, but it could probably be customized if needed.

In general, you probably won't be able to use this project as is unless your use-case is nearly the same as mine.

## Usage

### Hosted Version (Recommended)

The hosted version allows you to upload bank statements through a web interface and process them without running the application locally.

#### Using Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lvu/firemerge.git
   cd firemerge
   ```

2. **Create environment file:**
   ```bash
   cp env.example .env
   # Edit .env with your Firefly III credentials
   ```

3. **Run with Docker Compose:**

   **Option A: Memory Storage (Default)**
   ```bash
   docker-compose up -d
   ```

   **Option B: Redis Storage (Production)**
   ```bash
   docker-compose -f docker-compose.redis.yml up -d
   ```

4. **Access the web interface:**
   Open http://localhost:8080 in your browser

#### Manual Installation

If you prefer to install manually:

1. **Install the project:**
   ```bash
   git clone https://github.com/lvu/firemerge.git
   cd firemerge
   python -m venv venv
   . ./venv/bin/activate
   pip install -e .
   ```

2. **Configure Firefly III credentials:**
   Create a `.env` file in the project directory:
   ```
   FIREFLY_BASE_URL=https://my-firefly-installation.my-domain/
   FIREFLY_TOKEN=MY.FIREFLY.PERSONAL.ACCESS.TOKEN
   ```

3. **Start the web server:**
   ```bash
   firemerge serve-web
   ```

4. **Access the web interface:**
   Open http://localhost:8080 in your browser

### Legacy Local Version

The original local version is still available but deprecated:

```bash
firemerge merge statement.pdf
```

> [!CAUTION]
> The web app is intended to be used locally or in a secure environment; do not deploy it on the public web without proper authentication! The frontend communicates with the backend without any kind of authentication!

## Features

### Hosted Version
- **File Upload**: Upload PDF bank statements through a web interface
- **Statement Preview**: Review uploaded transactions before processing
- **Account Selection**: Choose which Firefly III account to merge into
- **Transaction Matching**: Intelligent matching with existing transactions
- **Data Enrichment**: Auto-fill transaction details from similar previous transactions
- **Real-time Processing**: Store transactions directly to Firefly III

### Security Considerations
- Files are processed in memory and stored temporarily (Redis or memory)
- Uploaded files are automatically deleted after 24 hours (Redis) or on restart (memory)
- No persistent filesystem storage of uploaded files
- Both storage backends provide secure, temporary storage with automatic cleanup

## Other commands
Apart from `serve-web` and `merge`, there are other commands, which automate some operations I need, and are used from command-line.
Just read the code.

## Requirements

### Storage (Redis or Memory)
FireMerge supports two storage backends for temporary data:

#### Redis (Recommended for Production)
- Automatic cleanup with 24-hour TTL
- No filesystem dependencies
- Better scalability for containerized deployments
- Persistent across application restarts
- Multi-instance support

#### Memory (Default)
- No external dependencies
- Faster startup
- Perfect for development and single-instance deployments
- Data is lost on application restart

Redis is optional - if not configured, the application will automatically use in-memory storage.

## Deployment
The included Dockerfile and docker-compose files make deployment straightforward:

```bash
# Memory storage (default)
docker-compose up -d

# Redis storage (production)
docker-compose -f docker-compose.redis.yml up -d

# Manual build with memory storage
docker build -t firemerge .
docker run -p 8080:8080 \
  -e FIREFLY_BASE_URL=... \
  -e FIREFLY_TOKEN=... \
  firemerge

# Manual build with Redis storage
docker build -t firemerge .
docker run -p 8080:8080 \
  -e FIREFLY_BASE_URL=... \
  -e FIREFLY_TOKEN=... \
  -e REDIS_URL=redis://your-redis-host:6379 \
  firemerge
```

### Production Considerations
- Add reverse proxy (nginx) for SSL termination
- Implement proper authentication/authorization
- Use environment variables for configuration
- Consider using a process manager (systemd, supervisor)
- Monitor logs and application health