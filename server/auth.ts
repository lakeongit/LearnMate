import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
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
      name: string | null;
      grade: number | null;
      learningStyle: string | null;
      subjects: string[] | null;
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
    cookie: {
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = { 
      ...sessionSettings.cookie,
      secure: true 
    };
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

        return done(null, {
          id: user.id,
          username: user.username,
          name: user.name,
          grade: user.grade,
          learningStyle: user.learningStyle,
          subjects: user.subjects,
          createdAt: user.createdAt
        });
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

      if (!user) {
        return done(new Error("User not found"));
      }

      done(null, {
        id: user.id,
        username: user.username,
        name: user.name,
        grade: user.grade,
        learningStyle: user.learningStyle,
        subjects: user.subjects,
        createdAt: user.createdAt
      });
    } catch (err) {
      done(err);
    }
  });

  // Login route with session handling
  app.post("/api/login", (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, async (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ error: "Session error" });
        }

        return res.json({ 
          success: true,
          user
        });
      });
    })(req, res, next);
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      user: req.user
    });
  });

  // Register route
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Create user with hashed password
      const hashedPassword = await crypto.hash(password);
      const [user] = await db
        .insert(users)
        .values({ username, password: hashedPassword })
        .returning();

      // Log the user in automatically
      req.login({
        id: user.id,
        username: user.username,
        name: user.name,
        grade: user.grade,
        learningStyle: user.learningStyle,
        subjects: user.subjects,
        createdAt: user.createdAt
      }, (err) => {
        if (err) {
          return res.status(500).json({ error: "Error logging in after registration" });
        }
        res.json({ 
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            grade: user.grade,
            learningStyle: user.learningStyle,
            subjects: user.subjects,
            createdAt: user.createdAt
          }
        });
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error logging out" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
}