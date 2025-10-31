import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend session data to include labourer session properties
declare module 'express-session' {
  interface SessionData {
    isLabourerSession?: boolean;
    labourerId?: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // In development, disable secure cookies (localhost)
  const isProduction = process.env.NODE_ENV === "production";
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only secure in production (HTTPS)
      maxAge: sessionTtl,
      sameSite: isProduction ? 'strict' : 'lax',
    },
  });
}

// Domain restriction check
function isAllowedDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowedDomains = ["@mooya.co.za", "@mooyawireless.co.za", "@xnext.co.za"];
  return allowedDomains.some(domain => email.endsWith(domain));
}

async function upsertUser(profile: any) {
  // Check if email is from allowed domain
  if (!isAllowedDomain(profile.emails?.[0]?.value)) {
    throw new Error("Access restricted to @mooya.co.za, @mooyawireless.co.za, and @xnext.co.za email addresses");
  }

  const userId = profile.id;
  const email = profile.emails?.[0]?.value;
  
  // IMPORTANT: Look up user by email (not Google ID) to handle account changes
  // This ensures existing users keep their roles when their Google ID changes
  const existingUser = await storage.getUserByEmail(email);
  
  // Determine role priority:
  // 1. Super Admin for kholofelo@mooya.co.za (ALWAYS - cannot be overridden)
  // 2. Existing user role (if user exists)
  // 3. Default based on email domain:
  //    - @xnext.co.za → admin
  //    - @mooya.co.za, @mooyawireless.co.za → supervisor
  let role: string;
  
  if (email === "kholofelo@mooya.co.za") {
    // kholofelo is always super_admin, cannot be overridden
    role = "super_admin";
  } else if (existingUser?.role) {
    // Keep existing role
    role = existingUser.role;
  } else {
    // New user - assign default based on email domain
    if (email?.endsWith("@xnext.co.za")) {
      role = "admin";
    } else {
      role = "supervisor";
    }
  }
  
  await storage.upsertUser({
    id: userId,
    email: email,
    firstName: profile.name?.givenName,
    lastName: profile.name?.familyName,
    profileImageUrl: profile.photos?.[0]?.value,
    role: role as any,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Google OAuth Strategy
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables");
  }

  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        await upsertUser(profile);
        done(null, { 
          id: profile.id,
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
        });
      } catch (error) {
        // If domain check fails, deny access
        done(error as Error, false);
      }
    }
  ));

  // Configure local strategy for labourer authentication
  passport.use('labourer-local', new LocalStrategy(
    {
      usernameField: 'identifier', // phone or email
      passwordField: 'password', // RSA ID or passport
    },
    async (identifier, password, done) => {
      try {
        // Find labourer by phone or email
        const labourer = await storage.getLabourerByPhoneOrEmail(identifier);
        
        if (!labourer) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        // Check if password hash exists
        if (!labourer.passwordHash) {
          return done(null, false, { message: 'Account not set up for login. Please contact your supervisor.' });
        }

        // Verify password (RSA ID or Passport)
        const isValid = await bcrypt.compare(password, labourer.passwordHash);
        
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        // Return labourer info for session
        return done(null, {
          labourerId: labourer.id,
          isLabourerSession: true,
          firstName: labourer.firstName,
          surname: labourer.surname,
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  app.get("/api/callback", 
    passport.authenticate('google', { 
      failureRedirect: '/login',
    }),
    (req, res) => {
      // Successful authentication, redirect to home
      res.redirect('/');
    }
  );

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect('/login');
    });
  });

  // Labourer login routes
  app.post("/api/labourer/login", (req, res, next) => {
    passport.authenticate('labourer-local', (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }
        
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          
          // Mark session as a labourer session for session isolation
          req.session.isLabourerSession = true;
          req.session.labourerId = user.labourerId;
          
          // Explicitly save session before sending response
          req.session.save((err) => {
            if (err) {
              return next(err);
            }
            
            return res.json({ 
              success: true, 
              labourer: {
                id: user.labourerId,
                firstName: user.firstName,
                surname: user.surname,
              }
            });
          });
        });
      });
    })(req, res, next);
  });

  app.get("/api/labourer/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

// Labourer authentication middleware
export const isLabourerAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Explicitly reject staff sessions to prevent cross-mode interference
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (!user.isLabourerSession) {
    return res.status(403).json({ message: "This endpoint is for labourers only" });
  }

  // Fetch the full labourer record and attach to request
  try {
    const labourer = await storage.getLabourer(user.labourerId);
    if (!labourer) {
      return res.status(401).json({ message: "Labourer not found" });
    }
    (req as any).labourer = labourer;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Role-based authorization middleware
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    if (!user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Look up by email to ensure we have the latest role
    const dbUser = await storage.getUserByEmail(user.email);
    if (!dbUser || !allowedRoles.includes(dbUser.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    // Attach db user to request for easy access
    (req as any).dbUser = dbUser;
    next();
  };
}

