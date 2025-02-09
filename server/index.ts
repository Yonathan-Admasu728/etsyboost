import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

// Trust proxy - required for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security middleware with development-friendly CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "*.replit.dev"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.replit.dev"],
      styleSrc: ["'self'", "'unsafe-inline'", "*.replit.dev"],
      imgSrc: ["'self'", "data:", "https:", "*.replit.dev"],
      connectSrc: ["'self'", "https:", "wss:", "*.replit.dev"],
      fontSrc: ["'self'", "https:", "data:", "*.replit.dev"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "*.replit.dev"],
      frameSrc: ["'self'", "*.replit.dev"],
      workerSrc: ["'self'", "blob:", "*.replit.dev"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

// CORS setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*.replit.dev');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms ${
      capturedJsonResponse ? `:: ${JSON.stringify(capturedJsonResponse).slice(0, 80)}` : ''
    }`;
    log(logLine);
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error details
    console.error(`Error: ${err.message}\nStack: ${err.stack}`);

    // In production, don't expose error details
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
      // Cache static assets for 1 year
      if (req.url.match(/\.(js|css|ico|jpg|jpeg|png|gif|woff|woff2|ttf|eot)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000");
      } else {
        // For HTML and other dynamic content, no cache
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
      next();
    });
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(Number(PORT), "0.0.0.0", () => {
    log(`Server running in ${app.get("env")} mode on port ${PORT}`);
  });
})();