import * as crypto from "crypto";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import requester from "request";
import * as passport from "passport";
import { Strategy as OAuthStrategy } from "passport-oauth2";
import { Request, Response, NextFunction } from "express";

import { config } from "../common";
import { createNew, IUser, User } from "../schema";
import { isParticipant } from "../registration";

type PassportDone = (
  err: Error | null,
  user?: IUser | false,
  errMessage?: { message: string }
) => void;
type PassportProfileDone = (err: Error | null, profile?: IProfile) => void;
interface IStrategyOptions {
  passReqToCallback: true; // Forced to true for our usecase
}
interface IOAuthStrategyOptions extends IStrategyOptions {
  authorizationURL: string;
  tokenURL: string;
  clientID: string;
  clientSecret: string;
}
interface IProfile {
  uuid: string;
  name: string;
  nameParts: {
    first: string;
    preferred?: string;
    last: string;
  };
  email: string;
  token: string;
}

// Because the passport typedefs don't include this for some reason
// Defined: https://github.com/jaredhanson/passport-oauth2/blob/9ddff909a992c3428781b7b2957ce1a97a924367/lib/strategy.js#L135
export type AuthenticateOptions = passport.AuthenticateOptions & {
  callbackURL: string;
};

export class GroundTruthStrategy extends OAuthStrategy {
  public readonly url: string;

  public static async apiRequest<T = unknown>(
    method: "GET" | "POST",
    url: string,
    token: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      requester(
        url,
        {
          method,
          auth: {
            sendImmediately: true,
            bearer: token,
          },
        },
        (error, response, body) => {
          if (error) {
            reject(error);
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Invalid JSON: ${body}`));
          }
        }
      );
    });
  }

  public static get defaultUserProperties() {
    return {
      admin: false,
      company: null,
      resume: null,
    };
  }

  constructor(url: string) {
    const secrets = config.secrets.groundTruth;
    if (!secrets || !secrets.id || !secrets.secret) {
      throw new Error(
        `Client ID or secret not configured in config.json or environment variables for Ground Truth`
      );
    }
    const options: IOAuthStrategyOptions = {
      authorizationURL: new URL("/oauth/authorize", url).toString(),
      tokenURL: new URL("/oauth/token", url).toString(),
      clientID: secrets.id,
      clientSecret: secrets.secret,
      passReqToCallback: true,
    };
    super(options, GroundTruthStrategy.passportCallback);
    this.url = url;
  }

  public userProfile(accessToken: string, done: PassportProfileDone) {
    GroundTruthStrategy.apiRequest<IProfile>(
      "GET",
      new URL("/api/user", this.url).toString(),
      accessToken
    )
      .then(data => {
        try {
          const profile: IProfile = {
            ...data,
            token: accessToken,
          };
          done(null, profile);
        } catch (err) {
          return done(err);
        }
      })
      .catch(err => {
        done(err);
      });
  }

  protected static async passportCallback(
    request: Request,
    accessToken: string,
    refreshToken: string,
    profile: IProfile,
    done: PassportDone
  ) {
    let user = await User.findOne({ uuid: profile.uuid });
    if (!user) {
      const participant = await isParticipant(profile.uuid);

      user = createNew<IUser>(User, {
        ...GroundTruthStrategy.defaultUserProperties,
        ...profile,
        name: profile.nameParts,
        type: participant ? "participant" : "employer",
      });
    } else {
      user.token = accessToken;
    }

    const domain = user.email.split("@").pop();
    if (domain && config.server.adminDomains.includes(domain)) {
      user.admin = true;
    }
    if (config.server.admins.includes(profile.email)) {
      user.admin = true;
    }
    await user.save();
    done(null, user);
  }
}

// Authentication helpers
function getExternalPort(request: Request): number {
  function defaultPort(): number {
    // Default ports for HTTP and HTTPS
    return request.protocol === "http" ? 80 : 443;
  }

  const { host } = request.headers;
  if (!host || Array.isArray(host)) {
    return defaultPort();
  }

  // IPv6 literal support
  const offset = host[0] === "[" ? host.indexOf("]") + 1 : 0;
  const index = host.indexOf(":", offset);
  if (index !== -1) {
    return parseInt(host.substring(index + 1), 10);
  }
  return defaultPort();
}

const validatedHostNames: string[] = [];
export function validateAndCacheHostName(request: Request, response: Response, next: NextFunction) {
  // Basically checks to see if the server behind the hostname has the same session key by HMACing a random nonce
  if (validatedHostNames.find(hostname => hostname === request.hostname)) {
    next();
    return;
  }

  const nonce = crypto.randomBytes(64).toString("hex");
  function callback(message: http.IncomingMessage) {
    if (message.statusCode !== 200) {
      console.error(`Got non-OK status code when validating hostname: ${request.hostname}`);
      message.resume();
      return;
    }
    message.setEncoding("utf8");
    let data = "";
    message.on("data", chunk => (data += chunk));
    message.on("end", () => {
      const localHMAC = crypto
        .createHmac("sha256", config.secrets.session)
        .update(nonce)
        .digest()
        .toString("hex");
      if (localHMAC === data) {
        validatedHostNames.push(request.hostname);
        next();
      } else {
        console.error(`Got invalid HMAC when validating hostname: ${request.hostname}`);
      }
    });
  }
  function onError(err: Error) {
    console.error(`Error when validating hostname: ${request.hostname}`, err);
  }
  if (request.protocol === "http") {
    http
      .get(
        `http://${request.hostname}:${getExternalPort(request)}/auth/validatehost/${nonce}`,
        callback
      )
      .on("error", onError);
  } else {
    https
      .get(
        `https://${request.hostname}:${getExternalPort(request)}/auth/validatehost/${nonce}`,
        callback
      )
      .on("error", onError);
  }
}

export function createLink(request: Request, link: string): string {
  if (link[0] === "/") {
    link = link.substring(1);
  }
  if (
    (request.secure && getExternalPort(request) === 443) ||
    (!request.secure && getExternalPort(request) === 80)
  ) {
    return `http${request.secure ? "s" : ""}://${request.hostname}/${link}`;
  }
  return `http${request.secure ? "s" : ""}://${request.hostname}:${getExternalPort(
    request
  )}/${link}`;
}
