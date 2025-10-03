import { ethers } from "ethers";
import EventEmitter from "events";

/**
 * EventIndexer - Indexes blockchain events from DreamLend contract
 * Maintains in-memory cache of all loan events and provides query methods
 */
export class EventIndexer extends EventEmitter {
  constructor(config) {
    super();

    this.config = {
      rpcUrl: config.rpcUrl,
      contractAddress: config.contractAddress,
      contractABI: config.contractABI,
      startBlock: config.startBlock || 0,
      pollInterval: config.pollInterval || 5000, // 5 seconds
    };

    // In-memory storage for events
    this.storage = {
      loanCreateds: [],
      loanAccepteds: [],
      loanRepaids: [],
      loanLiquidateds: [],
      loanOfferCancelleds: [],
      loanOfferRemoveds: [],
      domaRankOracleSets: [],
    };

    // Protocol statistics
    this.stats = {
      totalLoansCreated: "0",
      totalLoanVolume: "0",
      totalLoanVolumeUSD: "0",
      lastProcessedBlock: 0,
    };

    this.provider = null;
    this.contract = null;
    this.isIndexing = false;
    this.currentBlock = config.startBlock || 0;
  }

  /**
   * Initialize the indexer
   */
  async initialize() {
    console.log("🔍 Initializing EventIndexer...");

    // Create provider
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

    // Create contract instance
    this.contract = new ethers.Contract(
      this.config.contractAddress,
      this.config.contractABI,
      this.provider
    );

    // Get current block
    const latestBlock = await this.provider.getBlockNumber();
    console.log(`Current blockchain height: ${latestBlock}`);

    if (this.currentBlock === 0) {
      // Start from recent blocks if no start block specified
      this.currentBlock = Math.max(0, latestBlock - 1000);
    }

    console.log(
      `✓ Indexer initialized. Will start from block ${this.currentBlock}`
    );

    return this;
  }

  /**
   * Start indexing events
   */
  async startIndexing() {
    if (this.isIndexing) {
      console.log("⚠️ Indexer is already running");
      return;
    }

    this.isIndexing = true;
    console.log("🚀 Starting event indexing...");

    // Do initial historical sync
    await this.syncHistoricalEvents();

    // Start polling for new events
    this.startPolling();

    this.emit("started");
  }

  /**
   * Stop indexing
   */
  stopIndexing() {
    this.isIndexing = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log("🛑 Indexer stopped");
    this.emit("stopped");
  }

  /**
   * Sync historical events from startBlock to current
   */
  async syncHistoricalEvents() {
    const latestBlock = await this.provider.getBlockNumber();
    const fromBlock = this.currentBlock;
    const toBlock = latestBlock;

    console.log(
      `📚 Syncing historical events from block ${fromBlock} to ${toBlock}...`
    );

    try {
      // Fetch all event types in parallel
      const [
        loanCreatedEvents,
        loanAcceptedEvents,
        loanRepaidEvents,
        loanLiquidatedEvents,
        loanCancelledEvents,
        loanRemovedEvents,
        domaOracleSetEvents,
      ] = await Promise.all([
        this.contract.queryFilter("LoanCreated", fromBlock, toBlock),
        this.contract.queryFilter("LoanAccepted", fromBlock, toBlock),
        this.contract.queryFilter("LoanRepaid", fromBlock, toBlock),
        this.contract.queryFilter("LoanLiquidated", fromBlock, toBlock),
        this.contract.queryFilter("LoanOfferCancelled", fromBlock, toBlock),
        this.contract.queryFilter("LoanOfferRemoved", fromBlock, toBlock),
        this.contract.queryFilter("DomaRankOracleSet", fromBlock, toBlock),
      ]);

      // Process each event type
      for (const event of loanCreatedEvents) {
        await this.processLoanCreatedEvent(event);
      }

      for (const event of loanAcceptedEvents) {
        await this.processLoanAcceptedEvent(event);
      }

      for (const event of loanRepaidEvents) {
        await this.processLoanRepaidEvent(event);
      }

      for (const event of loanLiquidatedEvents) {
        await this.processLoanLiquidatedEvent(event);
      }

      for (const event of loanCancelledEvents) {
        await this.processLoanCancelledEvent(event);
      }

      for (const event of loanRemovedEvents) {
        await this.processLoanRemovedEvent(event);
      }

      for (const event of domaOracleSetEvents) {
        await this.processDomaOracleSetEvent(event);
      }

      this.currentBlock = toBlock + 1;
      this.stats.lastProcessedBlock = toBlock;

      console.log(
        `✓ Historical sync complete. Processed ${loanCreatedEvents.length} loan creations`
      );
      this.emit("synced", {
        fromBlock,
        toBlock,
        loansIndexed: loanCreatedEvents.length,
      });
    } catch (error) {
      console.error("Error syncing historical events:", error);
      throw error;
    }
  }

  /**
   * Start polling for new events
   */
  startPolling() {
    console.log(
      `🔄 Starting event polling (interval: ${this.config.pollInterval}ms)`
    );

    this.pollingInterval = setInterval(async () => {
      if (!this.isIndexing) return;

      try {
        await this.pollNewEvents();
      } catch (error) {
        console.error("Error polling events:", error);
        this.emit("error", error);
      }
    }, this.config.pollInterval);
  }

  /**
   * Poll for new events since last processed block
   */
  async pollNewEvents() {
    const latestBlock = await this.provider.getBlockNumber();

    if (latestBlock <= this.currentBlock) {
      return; // No new blocks
    }

    const fromBlock = this.currentBlock;
    const toBlock = latestBlock;

    console.log(`🔍 Polling blocks ${fromBlock} to ${toBlock}...`);

    try {
      const [
        loanCreatedEvents,
        loanAcceptedEvents,
        loanRepaidEvents,
        loanLiquidatedEvents,
        loanCancelledEvents,
        loanRemovedEvents,
      ] = await Promise.all([
        this.contract.queryFilter("LoanCreated", fromBlock, toBlock),
        this.contract.queryFilter("LoanAccepted", fromBlock, toBlock),
        this.contract.queryFilter("LoanRepaid", fromBlock, toBlock),
        this.contract.queryFilter("LoanLiquidated", fromBlock, toBlock),
        this.contract.queryFilter("LoanOfferCancelled", fromBlock, toBlock),
        this.contract.queryFilter("LoanOfferRemoved", fromBlock, toBlock),
      ]);

      let newEvents = 0;

      for (const event of loanCreatedEvents) {
        await this.processLoanCreatedEvent(event);
        newEvents++;
      }

      for (const event of loanAcceptedEvents) {
        await this.processLoanAcceptedEvent(event);
        newEvents++;
      }

      for (const event of loanRepaidEvents) {
        await this.processLoanRepaidEvent(event);
        newEvents++;
      }

      for (const event of loanLiquidatedEvents) {
        await this.processLoanLiquidatedEvent(event);
        newEvents++;
      }

      for (const event of loanCancelledEvents) {
        await this.processLoanCancelledEvent(event);
        newEvents++;
      }

      for (const event of loanRemovedEvents) {
        await this.processLoanRemovedEvent(event);
        newEvents++;
      }

      if (newEvents > 0) {
        console.log(`✓ Processed ${newEvents} new events`);
        this.emit("newEvents", { count: newEvents, toBlock });
      }

      this.currentBlock = toBlock + 1;
      this.stats.lastProcessedBlock = toBlock;
    } catch (error) {
      console.error("Error polling new events:", error);
      throw error;
    }
  }

  /**
   * Process LoanCreated event
   */
  async processLoanCreatedEvent(event) {
    const block = await event.getBlock();
    const args = event.args;

    // ethers v6: event properties are directly on event object, not event.log
    const txHash = event.transactionHash || event.log?.transactionHash;
    const logIndex = event.index !== undefined ? event.index : event.log?.index;

    const loanCreated = {
      id: txHash + "-" + logIndex,
      loanId: args.loanId.toString(),
      lender: args.lender.toLowerCase(),
      tokenAddress: args.tokenAddress.toLowerCase(),
      amount: args.amount.toString(),
      interestRate: args.interestRate.toString(),
      duration: args.duration.toString(),
      collateralAddress: args.collateralAddress.toLowerCase(),
      collateralAmount: args.collateralAmount.toString(),
      minCollateralRatioBPS: args.minCollateralRatioBPS.toString(),
      liquidationThresholdBPS: args.liquidationThresholdBPS.toString(),
      maxPriceStaleness: args.maxPriceStaleness.toString(),
      blockNumber: event.blockNumber.toString(),
      blockTimestamp: block.timestamp.toString(),
      transactionHash: txHash,
      // Historical price data (will be fetched from oracle if available)
      priceUSD: "0",
      amountUSD: "0",
    };

    // Add to storage (avoid duplicates)
    const existing = this.storage.loanCreateds.find(
      (e) => e.id === loanCreated.id
    );
    if (!existing) {
      this.storage.loanCreateds.push(loanCreated);

      // Update stats
      this.stats.totalLoansCreated = (
        BigInt(this.stats.totalLoansCreated) + 1n
      ).toString();
      this.stats.totalLoanVolume = (
        BigInt(this.stats.totalLoanVolume) + BigInt(args.amount)
      ).toString();

      this.emit("loanCreated", loanCreated);
    }
  }

  /**
   * Process LoanAccepted event
   */
  async processLoanAcceptedEvent(event) {
    const block = await event.getBlock();
    const args = event.args;

    const txHash = event.transactionHash || event.log?.transactionHash;
    const logIndex = event.index !== undefined ? event.index : event.log?.index;

    const loanAccepted = {
      id: txHash + "-" + logIndex,
      loanId: args.loanId.toString(),
      borrower: args.borrower.toLowerCase(),
      timestamp: block.timestamp.toString(),
      initialCollateralRatio: args.initialCollateralRatio?.toString() || "0",
    };

    const existing = this.storage.loanAccepteds.find(
      (e) => e.id === loanAccepted.id
    );
    if (!existing) {
      this.storage.loanAccepteds.push(loanAccepted);
      this.emit("loanAccepted", loanAccepted);
    }
  }

  /**
   * Process LoanRepaid event
   */
  async processLoanRepaidEvent(event) {
    const block = await event.getBlock();
    const args = event.args;

    const txHash = event.transactionHash || event.log?.transactionHash;
    const logIndex = event.index !== undefined ? event.index : event.log?.index;

    const loanRepaid = {
      id: txHash + "-" + logIndex,
      loanId: args.loanId.toString(),
      borrower: args.borrower.toLowerCase(),
      repaymentAmount: args.repaymentAmount.toString(),
      timestamp: block.timestamp.toString(),
    };

    const existing = this.storage.loanRepaids.find(
      (e) => e.id === loanRepaid.id
    );
    if (!existing) {
      this.storage.loanRepaids.push(loanRepaid);
      this.emit("loanRepaid", loanRepaid);
    }
  }

  /**
   * Process LoanLiquidated event
   */
  async processLoanLiquidatedEvent(event) {
    const block = await event.getBlock();
    const args = event.args;

    const txHash = event.transactionHash || event.log?.transactionHash;
    const logIndex = event.index !== undefined ? event.index : event.log?.index;

    const loanLiquidated = {
      id: txHash + "-" + logIndex,
      loanId: args.loanId.toString(),
      liquidator: args.liquidator.toLowerCase(),
      collateralClaimedByLender: args.collateralClaimedByLender.toString(),
      liquidatorReward: args.liquidatorReward.toString(),
      timestamp: block.timestamp.toString(),
    };

    const existing = this.storage.loanLiquidateds.find(
      (e) => e.id === loanLiquidated.id
    );
    if (!existing) {
      this.storage.loanLiquidateds.push(loanLiquidated);
      this.emit("loanLiquidated", loanLiquidated);
    }
  }

  /**
   * Process LoanOfferCancelled event
   */
  async processLoanCancelledEvent(event) {
    const block = await event.getBlock();
    const args = event.args;

    const txHash = event.transactionHash || event.log?.transactionHash;
    const logIndex = event.index !== undefined ? event.index : event.log?.index;

    const loanCancelled = {
      id: txHash + "-" + logIndex,
      loanId: args.loanId.toString(),
      lender: args.lender.toLowerCase(),
      timestamp: block.timestamp.toString(),
    };

    const existing = this.storage.loanOfferCancelleds.find(
      (e) => e.id === loanCancelled.id
    );
    if (!existing) {
      this.storage.loanOfferCancelleds.push(loanCancelled);
      this.emit("loanCancelled", loanCancelled);
    }
  }

  /**
   * Process LoanOfferRemoved event
   */
  async processLoanRemovedEvent(event) {
    const args = event.args;

    const txHash = event.transactionHash || event.log?.transactionHash;
    const logIndex = event.index !== undefined ? event.index : event.log?.index;

    const loanRemoved = {
      id: txHash + "-" + logIndex,
      loanId: args.loanId.toString(),
      reason: args.reason,
    };

    const existing = this.storage.loanOfferRemoveds.find(
      (e) => e.id === loanRemoved.id
    );
    if (!existing) {
      this.storage.loanOfferRemoveds.push(loanRemoved);
      this.emit("loanRemoved", loanRemoved);
    }
  }

  /**
   * Process DomaRankOracleSet event
   */
  async processDomaOracleSetEvent(event) {
    const args = event.args;

    const txHash = event.transactionHash || event.log?.transactionHash;
    const logIndex = event.index !== undefined ? event.index : event.log?.index;

    const oracleSet = {
      id: txHash + "-" + logIndex,
      newOracleAddress: args.newOracleAddress.toLowerCase(),
      transactionHash: txHash,
      blockNumber: event.blockNumber.toString(),
    };

    const existing = this.storage.domaRankOracleSets.find(
      (e) => e.id === oracleSet.id
    );
    if (!existing) {
      this.storage.domaRankOracleSets.push(oracleSet);
      this.emit("domaOracleSet", oracleSet);
    }
  }

  /**
   * Query methods - Match subgraph API
   */

  getLoanCreatedEvents(options = {}) {
    const {
      first = 100,
      skip = 0,
      orderBy = "blockTimestamp",
      orderDirection = "desc",
    } = options;

    let results = [...this.storage.loanCreateds];

    // Sort
    results.sort((a, b) => {
      const aVal = BigInt(a[orderBy] || 0);
      const bVal = BigInt(b[orderBy] || 0);
      return orderDirection === "desc"
        ? Number(bVal - aVal)
        : Number(aVal - bVal);
    });

    // Pagination
    return results.slice(skip, skip + first);
  }

  getLoanAcceptedEvents(options = {}) {
    const { first = 100, skip = 0 } = options;
    return this.storage.loanAccepteds
      .sort((a, b) => Number(BigInt(b.timestamp) - BigInt(a.timestamp)))
      .slice(skip, skip + first);
  }

  getLoanRepaidEvents(options = {}) {
    const { first = 100, skip = 0 } = options;
    return this.storage.loanRepaids
      .sort((a, b) => Number(BigInt(b.timestamp) - BigInt(a.timestamp)))
      .slice(skip, skip + first);
  }

  getLoanLiquidatedEvents(options = {}) {
    const { first = 100, skip = 0 } = options;
    return this.storage.loanLiquidateds
      .sort((a, b) => Number(BigInt(b.timestamp) - BigInt(a.timestamp)))
      .slice(skip, skip + first);
  }

  getLoanCancelledEvents(options = {}) {
    const { first = 100, skip = 0 } = options;
    return this.storage.loanOfferCancelleds
      .sort((a, b) => Number(BigInt(b.timestamp) - BigInt(a.timestamp)))
      .slice(skip, skip + first);
  }

  getLoanRemovedEvents(options = {}) {
    const { first = 100, skip = 0 } = options;
    return this.storage.loanOfferRemoveds.slice(skip, skip + first);
  }

  getProtocolStats() {
    return {
      totalLoansCreated: this.stats.totalLoansCreated,
      totalLoanVolume: this.stats.totalLoanVolume,
      totalLoanVolumeUSD: this.stats.totalLoanVolumeUSD,
      id: "protocol-stats",
    };
  }

  /**
   * Get indexer status
   */
  getStatus() {
    return {
      isIndexing: this.isIndexing,
      currentBlock: this.currentBlock,
      lastProcessedBlock: this.stats.lastProcessedBlock,
      totalLoansIndexed: this.storage.loanCreateds.length,
      stats: this.stats,
    };
  }
}
