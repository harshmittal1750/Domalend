import express from "express";
import cors from "cors";
import { EventIndexer } from "./EventIndexer.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * IndexerServer - Express server that exposes indexed data via REST/GraphQL endpoints
 * Compatible with existing frontend subgraph queries
 */
export class IndexerServer {
  constructor(config) {
    this.config = {
      port: config.port || 3001,
      indexer: config.indexer,
      customRoutes: config.customRoutes,
    };

    this.app = express();
    this.indexer = config.indexer;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS for frontend
    this.app.use(
      cors({
        origin: this.config.cors?.origin || "*",
        credentials: true,
      })
    );

    // Parse JSON bodies
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      const status = this.indexer.getStatus();
      res.json({
        status: "ok",
        indexer: status,
        timestamp: new Date().toISOString(),
      });
    });

    // GraphQL-compatible endpoint (mimics The Graph)
    this.app.post("/graphql", async (req, res) => {
      try {
        const { query, variables } = req.body;

        // Validate query exists
        if (!query) {
          return res.status(400).json({
            errors: [
              {
                message: "GraphQL query is required",
                extensions: { code: "BAD_REQUEST" },
              },
            ],
          });
        }

        const result = await this.handleGraphQLQuery(query, variables);
        res.json(result);
      } catch (error) {
        console.error("GraphQL query error:", error);
        res.status(500).json({
          errors: [
            {
              message: error.message,
              extensions: { code: "INTERNAL_SERVER_ERROR" },
            },
          ],
        });
      }
    });

    // REST endpoints for easier direct access

    // Get loan created events
    this.app.get("/api/loans/created", (req, res) => {
      const first = parseInt(req.query.first) || 100;
      const skip = parseInt(req.query.skip) || 0;
      const orderBy = req.query.orderBy || "blockTimestamp";
      const orderDirection = req.query.orderDirection || "desc";

      const events = this.indexer.getLoanCreatedEvents({
        first,
        skip,
        orderBy,
        orderDirection,
      });

      res.json({ loanCreateds: events });
    });

    // Get loan accepted events
    this.app.get("/api/loans/accepted", (req, res) => {
      const first = parseInt(req.query.first) || 100;
      const skip = parseInt(req.query.skip) || 0;

      const events = this.indexer.getLoanAcceptedEvents({ first, skip });
      res.json({ loanAccepteds: events });
    });

    // Get loan repaid events
    this.app.get("/api/loans/repaid", (req, res) => {
      const first = parseInt(req.query.first) || 100;
      const skip = parseInt(req.query.skip) || 0;

      const events = this.indexer.getLoanRepaidEvents({ first, skip });
      res.json({ loanRepaids: events });
    });

    // Get loan liquidated events
    this.app.get("/api/loans/liquidated", (req, res) => {
      const first = parseInt(req.query.first) || 100;
      const skip = parseInt(req.query.skip) || 0;

      const events = this.indexer.getLoanLiquidatedEvents({ first, skip });
      res.json({ loanLiquidateds: events });
    });

    // Get loan cancelled events
    this.app.get("/api/loans/cancelled", (req, res) => {
      const first = parseInt(req.query.first) || 100;
      const skip = parseInt(req.query.skip) || 0;

      const events = this.indexer.getLoanCancelledEvents({ first, skip });
      res.json({ loanOfferCancelleds: events });
    });

    // Get loan removed events
    this.app.get("/api/loans/removed", (req, res) => {
      const first = parseInt(req.query.first) || 100;
      const skip = parseInt(req.query.skip) || 0;

      const events = this.indexer.getLoanRemovedEvents({ first, skip });
      res.json({ loanOfferRemoveds: events });
    });

    // Get protocol stats
    this.app.get("/api/stats", (req, res) => {
      const stats = this.indexer.getProtocolStats();
      res.json({ protocolStats_collection: [stats] });
    });

    // Get all data (matches subgraph combined query)
    this.app.get("/api/loans/all", (req, res) => {
      const first = parseInt(req.query.first) || 100;
      const skip = parseInt(req.query.skip) || 0;

      const data = {
        loanCreateds: this.indexer.getLoanCreatedEvents({ first, skip }),
        loanAccepteds: this.indexer.getLoanAcceptedEvents({ first, skip }),
        loanRepaids: this.indexer.getLoanRepaidEvents({ first, skip }),
        loanLiquidateds: this.indexer.getLoanLiquidatedEvents({ first, skip }),
        loanOfferCancelleds: this.indexer.getLoanCancelledEvents({
          first,
          skip,
        }),
        loanOfferRemoveds: this.indexer.getLoanRemovedEvents({ first, skip }),
        protocolStats_collection: [this.indexer.getProtocolStats()],
      };

      res.json(data);
    });

    // Add custom routes if provided (before 404 handler)
    if (
      this.config.customRoutes &&
      typeof this.config.customRoutes === "function"
    ) {
      this.config.customRoutes(this.app);
    }

    // 404 handler (must be last)
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not found",
        path: req.path,
      });
    });
  }

  /**
   * Handle GraphQL queries (simplified parser)
   * Matches The Graph subgraph query format
   */
  async handleGraphQLQuery(query, variables = {}) {
    // Validate query is a string
    if (typeof query !== "string") {
      throw new Error("Query must be a string");
    }

    // Parse the query to determine what data to return
    const result = { data: {} };

    // Extract query parameters from GraphQL query string
    const parseOptions = (queryString) => {
      if (!queryString || typeof queryString !== "string") {
        return {
          first: 100,
          skip: 0,
          orderBy: "blockTimestamp",
          orderDirection: "desc",
        };
      }

      const firstMatch = queryString.match(/first:\s*(\d+)/);
      const skipMatch = queryString.match(/skip:\s*(\d+)/);
      const orderByMatch = queryString.match(/orderBy:\s*(\w+)/);
      const orderDirectionMatch = queryString.match(/orderDirection:\s*(\w+)/);

      return {
        first: firstMatch ? parseInt(firstMatch[1]) : 100,
        skip: skipMatch ? parseInt(skipMatch[1]) : 0,
        orderBy: orderByMatch ? orderByMatch[1] : "blockTimestamp",
        orderDirection: orderDirectionMatch ? orderDirectionMatch[1] : "desc",
      };
    };

    const options = parseOptions(query);

    // Check which entities are requested
    if (query.includes("loanCreateds")) {
      result.data.loanCreateds = this.indexer.getLoanCreatedEvents(options);
    }

    if (query.includes("loanAccepteds")) {
      result.data.loanAccepteds = this.indexer.getLoanAcceptedEvents(options);
    }

    if (query.includes("loanRepaids")) {
      result.data.loanRepaids = this.indexer.getLoanRepaidEvents(options);
    }

    if (query.includes("loanLiquidateds")) {
      result.data.loanLiquidateds =
        this.indexer.getLoanLiquidatedEvents(options);
    }

    if (query.includes("loanOfferCancelleds")) {
      result.data.loanOfferCancelleds =
        this.indexer.getLoanCancelledEvents(options);
    }

    if (query.includes("loanOfferRemoveds")) {
      result.data.loanOfferRemoveds =
        this.indexer.getLoanRemovedEvents(options);
    }

    if (
      query.includes("protocolStats_collection") ||
      query.includes("protocolStatsCollection")
    ) {
      result.data.protocolStats_collection = [this.indexer.getProtocolStats()];
    }

    return result;
  }

  /**
   * Start the server
   */
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`\n${"=".repeat(60)}`);
        console.log("📡 INDEXER SERVER STARTED");
        console.log(`${"=".repeat(60)}`);
        console.log(`Port: ${this.config.port}`);
        console.log(`Health: http://localhost:${this.config.port}/health`);
        console.log(`GraphQL: http://localhost:${this.config.port}/graphql`);
        console.log(`REST API: http://localhost:${this.config.port}/api/*`);
        console.log(`${"=".repeat(60)}\n`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("📡 Indexer server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
