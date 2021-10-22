import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

import { config } from "./common";
import { IUser } from "./schema";

export const postParser = bodyParser.urlencoded({
  extended: false,
});

export const MAX_FILE_SIZE = 50000000; // 50 MB
export const uploadHandler = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // The OS's default temporary directory
      // Should be changed (or moved via fs.rename()) if the files are to be persisted
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

export async function authenticateWithRedirect(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) {
  response.setHeader("Cache-Control", "private");
  const user = request.user as IUser | undefined;
  if (!request.isAuthenticated() || !user) {
    if (request.session) {
      request.session.returnTo = request.originalUrl;
    }
    response.redirect("/auth/login");
  } else {
    next();
  }
}

export function apiAuth(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) {
  response.setHeader("Cache-Control", "private");
  const user = request.user as IUser | undefined;
  const auth = request.headers.authorization;

  if (auth && typeof auth === "string" && auth.indexOf(" ") > -1) {
    const key = Buffer.from(auth.split(" ")[1], "base64").toString();
    if (key === config.secrets.apiKey) {
      next();
    } else {
      response.status(401).json({
        error: "Invalid API key",
      });
    }
  } else if (!request.isAuthenticated() || !user) {
    response.status(401).json({
      error: "You must log in to access this endpoint",
    });
  } else if ((!user.company || !user.company.verified) && !user.admin) {
    response.status(403).json({
      error: "You are not permitted to access this endpoint",
    });
  } else {
    next();
  }
}

export function isAdmin(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) {
  authenticateWithRedirect(request, response, (err?: any) => {
    if (err) {
      next(err);
      return;
    }
    if (!request.user || !(request.user as IUser).admin) {
      response.redirect("/");
      return;
    }
    next();
  });
}

export function isAdminOrEmployee(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) {
  authenticateWithRedirect(request, response, (err?: any) => {
    if (err) {
      next(err);
      return;
    }
    const user = request.user as IUser | undefined;
    if (user) {
      if (
        user.company &&
        user.company.verified &&
        user.company.company &&
        user.company.company.toString() === request.params.company
      ) {
        next();
        return;
      }
      if (user.admin) {
        next();
        return;
      }
    }
    response.redirect("/");
  });
}

export function isAnEmployer(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) {
  authenticateWithRedirect(request, response, (err?: any) => {
    if (err) {
      next(err);
      return;
    }
    if (!request.user || (request.user as IUser).type !== "employer") {
      response.redirect("/");
      return;
    }
    const user = request.user as IUser | undefined;
    if (!user?.company?.verified) {
      response.redirect("/");
      return;
    }
    next();
  });
}

export function arduinoAuth(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) {
  const bodyText = request.body.toString("utf-8").split("\n");
  const auth = bodyText.shift();
  const message = bodyText.join("\n");
  if (!auth || auth.indexOf(" ") === -1) {
    console.log("Invalid authorization:", auth);
    response.status(401).json({ error: "Invalid authorization" });
    return;
  }
  const hash = auth.split(" ")[0];
  const time = parseInt(auth.split(" ")[1]);
  const correctHash = crypto
    .createHmac("sha256", config.secrets.apiKey + time.toString())
    .update(message)
    .digest()
    .toString("hex");
  if (hash !== correctHash) {
    console.log("Invalid HMAC hash:", hash, correctHash);
    response.status(401).json({ error: "Invalid HMAC hash" });
    return;
  }
  if (isNaN(time) || Math.abs(Date.now() - time * 1000) > 60000) {
    console.log("Expired or invalid HMAC hash:", time * 1000, Date.now());
    // TODO: temporarily disabled while we search for a RTC
    // response.status(401).json({ "error": "Expired or invalid HMAC hash" });
    // return;
  }
  request.body = message;
  next();
}
