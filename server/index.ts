import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import MemoryStore from "memorystore";
import crypto from 'crypto';
import net from 'net';  // Add explicit net import

const app = express();
// Try alternate ports if 3000 is in use
const findAvailablePort = async (startPort: number): Promise<number> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '0.0.0.0', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
};

// Trust proxy - required for rate limiting and proper IP detection behind Replit proxy
app.set('trust proxy', '2');  // Set to 2 to handle Replit's proxy setup

// Security middleware with Replit-friendly CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "*.replit.app", "*.replit.dev"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.replit.app", "*.replit.dev"],
      styleSrc: ["'self'", "'unsafe-inline'", "*.replit.app", "*.replit.dev"],
      imgSrc: ["'self'", "data:", "https:", "*.replit.app", "*.replit.dev"],
      connectSrc: ["'self'", "https:", "wss:", "*.replit.app", "*.replit.dev"],
      fontSrc: ["'self'", "https:", "data:", "*.replit.app", "*.replit.dev"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "*.replit.app", "*.replit.dev"],
      frameSrc: ["'self'", "*.replit.app", "*.replit.dev"],
      workerSrc: ["'self'", "blob:", "*.replit.app", "*.replit.dev"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

// CORS setup for Replit deployment
app.use((req, res, next) => {
  const origin = req.get('origin');
  // Allow both .replit.dev and .replit.app domains
  if (origin && (origin.endsWith('.replit.dev') || origin.endsWith('.replit.app'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rate limiting with proper configuration for Replit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development environment
    return process.env.NODE_ENV === 'development';
  }
});
app.use(limiter);

// Session configuration using MemoryStore only
const MemoryStoreSession = MemoryStore(session);
const sessionStore = new MemoryStoreSession({
  checkPeriod: 86400000 // prune expired entries every 24h
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: app.get('env') === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    httpOnly: true // Adding httpOnly flag for security
  }
}));

// Body parsing middleware with increased limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;

  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`${method} ${path} ${res.statusCode} in ${duration}ms`);

    // Log errors in detail
    if (res.statusCode >= 400) {
      console.error('Request error:', {
        method,
        path,
        statusCode: res.statusCode,
        duration,
        headers: req.headers,
        query: req.query,
        body: req.body
      });
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('API Error:', {
      path: req.path,
      method: req.method,
      status,
      message: err.message,
      stack: err.stack,
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    res.status(status).json({ 
      message: app.get("env") === "development" ? message : "Internal Server Error",
      ...(app.get("env") === "development" ? { stack: err.stack } : {})
    });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Production static file serving with proper caching
    app.use((req, res, next) => {
      if (req.url.match(/\.(js|css|ico|jpg|jpeg|png|gif|woff|woff2|ttf|eot)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000");
      } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
      next();
    });
    serveStatic(app);
  }

  try {
    const port = await findAvailablePort(Number(process.env.PORT) || 3000);
    server.listen(port, "0.0.0.0", () => {
      log(`Server running in ${app.get("env")} mode on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();