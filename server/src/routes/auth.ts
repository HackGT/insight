import * as crypto from "crypto";
import { URL } from "url";
import express from "express";
import passport, { AuthenticateOptions } from "passport";

import { validateAndCacheHostName, createLink, GroundTruthStrategy } from "../auth/strategies";
import { config } from "../common";
import { IUser } from "../schema";

export const authRoutes = express.Router();

authRoutes.get("/login", validateAndCacheHostName, (request, response, next) => {
  const callbackURL = createLink(request, "auth/login/callback");
  passport.authenticate("oauth2", { callbackURL } as AuthenticateOptions)(request, response, next);
});

authRoutes.get("/login/callback", validateAndCacheHostName, (request, response, next) => {
  const callbackURL = createLink(request, "auth/login/callback");

  if (request.query.error === "access_denied") {
    request.flash("error", "Authentication request was denied");
    response.redirect("/login");
    return;
  }
  passport.authenticate("oauth2", {
    failureRedirect: "/login",
    successReturnToOrRedirect: "/",
    callbackURL,
  } as AuthenticateOptions)(request, response, next);
});

authRoutes.get("/validatehost/:nonce", (request, response) => {
  const nonce: string = request.params.nonce || "";
  response.send(
    crypto.createHmac("sha256", config.secrets.session).update(nonce).digest().toString("hex")
  );
});

authRoutes.route("/check").get((req, res) => {
  if (req.user) {
    return res.status(200).json(req.user);
  }
  return res.status(400).json({ success: false });
});

authRoutes.all("/logout", async (request, response) => {
  const user = request.user as IUser | undefined;
  if (user) {
    const groundTruthURL = new URL(config.secrets.groundTruth.url);
    // Invalidates token and logs user out of Ground Truth too
    try {
      await GroundTruthStrategy.apiRequest(
        "POST",
        new URL("/api/user/logout", groundTruthURL).toString(),
        user.token || ""
      );
    } catch (err) {
      // User might already be logged out of Ground Truth
      // Log them out of registration and continue
      console.error(err);
    }
    request.logout();
  }
  if (request.session) {
    request.session.loginAction = "render";
  }
  response.redirect("/login");
});
