import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend session data to include labourer session properties
declare module 'express-session' {
  interface SessionData {
    isLabourerSession?: boolean;
    labourerId?: string;
  }
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Domain restriction check
function isAllowedDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowedDomains = ["@mooya.co.za", "@mooyawireless.co.za", "@xnext.co.za"];
  return allowedDomains.some(domain => email.endsWith(domain));
}

async function upsertUser(
  claims: any,
) {
  // Check if email is from allowed domain
  if (!isAllowedDomain(claims["email"])) {
    throw new Error("Access restricted to @mooya.co.za, @mooyawireless.co.za, and @xnext.co.za email addresses");
  }

  const userId = claims["sub"];
  // IMPORTANT: Look up user by email (not sub) to handle OIDC sub rotation
  // This ensures existing users keep their roles when their sub changes
  const existingUser = await storage.getUserByEmail(claims["email"]);
  
  // Determine role priority:
  // 1. Super Admin for kholofelo@mooya.co.za (ALWAYS - cannot be overridden)
  // 2. Role from OIDC claims if present (ALWAYS overrides existing role - for testing)
  // 3. Existing user role (if user exists and no OIDC role claim)
  // 4. Default based on email domain:
  //    - @xnext.co.za → admin
  //    - @mooya.co.za, @mooyawireless.co.za → supervisor
  let role: string;
  
  if (claims["email"] === "kholofelo@mooya.co.za") {
    // kholofelo is always super_admin, cannot be overridden
    role = "super_admin";
  } else if (claims["role"]) {
    // OIDC role claim ALWAYS overrides any existing role (for testing and role changes)
    role = claims["role"];
  } else if (existingUser?.role) {
    // Keep existing role if no OIDC role claim
    role = existingUser.role;
  } else {
    // New user with no OIDC role claim - assign default based on email domain
    if (claims["email"]?.endsWith("@xnext.co.za")) {
      role = "admin";
    } else {
      role = "supervisor";
    }
  }
  
  await storage.upsertUser({
    id: userId,
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: role as any,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      // If domain check fails, deny access
      verified(error as Error, false);
    }
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

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

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
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
    })(req, res, next);
  });

  app.get("/api/labourer/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
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
    if (!user?.claims?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Look up by email (not sub) to handle OIDC sub rotation
    const dbUser = await storage.getUserByEmail(user.claims.email);
    if (!dbUser || !allowedRoles.includes(dbUser.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    // Attach db user to request for easy access
    (req as any).dbUser = dbUser;
    next();
  };
}