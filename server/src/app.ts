/* eslint-disable import/first, import/order */
import "source-map-support/register";
import * as http from "http";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import * as chalk from "chalk";
import path from "path";
import morgan from "morgan";
import cors from "cors";
import flash from "connect-flash";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";
import { createProxyMiddleware } from "http-proxy-middleware";

import { PORT, VERSION_NUMBER, VERSION_HASH, COOKIE_OPTIONS, config } from "./common";

// Set up Express and its middleware
export const app = express();

Sentry.init({
  dsn: "https://17e4bfb7ba4e4518b2d9653d92f2d2db@o429043.ingest.sentry.io/5459941",
  integrations: [new Integrations.BrowserTracing()],

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 0.8,
});

app.use(compression());
app.use(cors());

const cookieParserInstance = cookieParser(
  undefined,
  COOKIE_OPTIONS as cookieParser.CookieParseOptions
);
app.use(cookieParserInstance);

morgan.format("hackgt", (tokens, request, response) => {
  let statusColorizer: (input: string) => string = input => input; // Default passthrough function
  if (response.statusCode >= 500) {
    statusColorizer = chalk.default.red;
  } else if (response.statusCode >= 400) {
    statusColorizer = chalk.default.yellow;
  } else if (response.statusCode >= 300) {
    statusColorizer = chalk.default.cyan;
  } else if (response.statusCode >= 200) {
    statusColorizer = chalk.default.green;
  }

  return [
    tokens.date(request, response, "iso"),
    tokens["remote-addr"](request, response),
    tokens.method(request, response),
    tokens.url(request, response),
    statusColorizer(tokens.status(request, response) || ""),
    tokens["response-time"](request, response),
    "ms",
    "-",
    tokens.res(request, response, "content-length"),
  ].join(" ");
});
app.use(morgan("hackgt"));

app.use(flash());
app.use(express.json());

// Throw and show a stack trace on an unhandled Promise rejection instead of logging an unhelpful warning
process.on("unhandledRejection", err => {
  throw err;
});

// Auth needs to be the first route configured or else requests handled before it will always be unauthenticated
import "./auth/auth";
import { authRoutes } from "./routes/auth";

app.use("/auth", authRoutes);

app.route("/version").get((request, response) => {
  response.json({
    version: VERSION_NUMBER,
    hash: VERSION_HASH,
    node: process.version,
  });
});

import { apiRoutes } from "./api";

app.use("/api", apiRoutes);

import { uploadsRoutes } from "./routes/uploads";

app.use("/uploads", uploadsRoutes);

import { taskDashboardRoutes, startTaskEngine } from "./jobs";

app.use("/admin/tasks", taskDashboardRoutes);

if (!config.server.isProduction) {
  app.use(
    createProxyMiddleware("/socket", {
      target: `http://localhost:${PORT}`,
      changeOrigin: true,
      ws: true,
    })
  );
}

startTaskEngine().catch(err => {
  throw err;
});

import { authenticateWithRedirect } from "./middleware";

app.use(authenticateWithRedirect, express.static(path.join(__dirname, "../../client/build")));
app.get("*", authenticateWithRedirect, (req, res) => {
  console.log("Serving client");
  res.sendFile(path.join(__dirname, "../../client/build", "index.html"));
});

const server = http.createServer(app);
import { WebSocketServer } from "./websocket";

export const webSocketServer = new WebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Insight system v${VERSION_NUMBER} @ ${VERSION_HASH} started on port ${PORT}`);
});
