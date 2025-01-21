import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, students } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      createdAt: Date;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "education-platform-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = { secure: true };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register route
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Create user with hashed password
      const hashedPassword = await crypto.hash(password);
      const [user] = await db
        .insert(users)
        .values({ username, password: hashedPassword })
        .returning();

      // Log the user in automatically
      req.login(user, (err) => {
        if (err) {
          return res.status(500).send("Error logging in after registration");
        }
        res.json({ id: user.id, username: user.username });
      });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(401).json({ error: info.message });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        return res.json({ id: user.id, username: user.username });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Error logging out");
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    res.json(req.user);
  });

  // Add this new endpoint after the existing authentication routes
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      // Find user by email (username in our case since we're using email as username)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, email))
        .limit(1);

      if (!user) {
        // For security reasons, always return success even if email doesn't exist
        return res.json({ 
          message: "If an account exists with this email, you will receive password reset instructions." 
        });
      }

      // In a real application, you would:
      // 1. Generate a password reset token
      // 2. Save it to the database with an expiration
      // 3. Send an email with a reset link

      // For now, we'll just return a success message
      res.json({ 
        message: "If an account exists with this email, you will receive password reset instructions." 
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });
}