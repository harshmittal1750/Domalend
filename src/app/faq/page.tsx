import { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Shield,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";

const faqs = [
  {
    category: "Getting Started",
    icon: HelpCircle,
    questions: [
      {
        question: "What is DomaLend?",
        answer:
          "DomaLend is the world's first lending protocol that accepts fractionalized Doma domain tokens as collateral. Built on Doma Testnet, it uses an AI-powered DomaRank Oracle to intelligently value domain tokens, enabling users to unlock liquidity from their premium domain holdings.",
      },
      {
        question: "How do I get started with DomaLend?",
        answer:
          "First, bridge Sepolia ETH to Doma Testnet using the Doma Bridge. Then, buy fractionalized domain tokens on Mizu DEX (like software.ai or crypto.ai tokens). Finally, connect your wallet to DomaLend to create loan offers or use your domain tokens as collateral to borrow stablecoins.",
      },
      {
        question: "What are fractionalized domain tokens?",
        answer:
          "Fractionalized domain tokens are ERC20 tokens representing fractional ownership of premium Doma domains. For example, if 'software.ai' is fractionalized into 1 million tokens, owning 10,000 tokens means you own 1% of that domain. These tokens can be traded on Mizu DEX and used as collateral on DomaLend.",
      },
      {
        question: "What wallets are supported?",
        answer:
          "DomaLend supports all major Web3 wallets including MetaMask, WalletConnect, Coinbase Wallet, and any wallet compatible with the WalletConnect protocol. Make sure to connect to Doma Testnet (Chain ID: 97476).",
      },
    ],
  },
  {
    category: "Lending & Earning",
    icon: TrendingUp,
    questions: [
      {
        question: "How much interest can I earn by lending?",
        answer:
          "Interest rates on DomaLend are set by lenders when creating loan offers, typically ranging from 5-25% APY. You have full control over your loan terms including interest rate, duration, and accepted collateral types. Higher rates may attract borrowers with premium domain tokens.",
      },
      {
        question: "What tokens can I lend?",
        answer:
          "You can lend stablecoins (USDC, USDT, DAI) and other ERC-20 tokens on Doma Testnet. Borrowers can use fractionalized domain tokens (like software.ai, crypto.ai) or standard crypto assets as collateral. Our DomaRank Oracle ensures fair valuations for domain tokens.",
      },
      {
        question: "How do I create a loan offer?",
        answer:
          "Go to the 'Create Loan Offer' page, specify your lending token and amount, set your interest rate and duration, choose which collateral tokens you'll accept (domain tokens and/or standard tokens), and submit. Your offer appears in the marketplace immediately.",
      },
      {
        question: "What is DomaRank and how does it protect me?",
        answer:
          "DomaRank is our AI-powered oracle that values domain tokens using 6+ metrics: domain age, TLD quality (.ai, .com score higher), keyword value (crypto, defi, nft), length, social presence, and market liquidity. This ensures you're protected by accurately valued collateral.",
      },
    ],
  },
  {
    category: "Borrowing with Domain Tokens",
    icon: Zap,
    questions: [
      {
        question: "How can I borrow using my domain tokens?",
        answer:
          "If you own fractionalized domain tokens (purchased from Mizu DEX), browse loan offers on DomaLend, select one that accepts your domain token as collateral, lock your tokens, and receive stablecoins instantly. Your domain tokens are valued using our DomaRank AI Oracle.",
      },
      {
        question: "What domain tokens are accepted as collateral?",
        answer:
          "Any fractionalized domain token from Doma Protocol can be used as collateral. Premium domains with high-value TLDs (.ai, .com, .io), short names, and strong keywords (crypto, nft, defi, web3) receive higher DomaRank scores and better loan-to-value ratios.",
      },
      {
        question: "How is my domain token valued?",
        answer:
          "Our DomaRank Oracle analyzes your domain token using AI: TLD premium scoring (.ai/.com get 100 points), keyword analysis (crypto terms valued higher), domain age (older = better), length (shorter = better), social links, and market liquidity on Mizu DEX. Prices update every 10 minutes.",
      },
      {
        question: "Can I add more collateral or repay partially?",
        answer:
          "Yes! You can add more domain tokens or other approved collateral to improve your loan health ratio. You can also make partial repayments at any time to reduce your debt and improve your collateral position, preventing liquidation.",
      },
    ],
  },
  {
    category: "DomaRank Oracle & Pricing",
    icon: Shield,
    questions: [
      {
        question: "What makes DomaRank Oracle special?",
        answer:
          "DomaRank is the world's first AI-powered oracle specifically designed for domain token valuation. Unlike generic price feeds, it analyzes domain-specific metrics like TLD quality, keyword relevance, domain age, and social presence to provide accurate, risk-adjusted valuations for fractionalized domain tokens.",
      },
      {
        question: "How often are domain token prices updated?",
        answer:
          "Our backend oracle updates DomaRank prices every 10 minutes by fetching real-time market data from Mizu DEX and Doma's GraphQL subgraph. The system also triggers instant updates when new loans are created with domain token collateral, ensuring you always have fresh pricing.",
      },
      {
        question: "Can I trust the DomaRank valuations?",
        answer:
          "Yes! DomaRank uses conservative, risk-adjusted scoring to protect lenders. We apply safety margins (80-90% LTV ratios) and multi-factor analysis. For standard tokens, we use battle-tested Chainlink/DIA oracles. Domain token valuations combine AI analysis with real Mizu DEX market prices.",
      },
      {
        question: "What is the Custom Event Indexer?",
        answer:
          "DomaLend built a custom high-performance indexer that tracks blockchain events in real-time (5-second polling), providing 95% faster updates than The Graph Protocol. This powers our real-time loan dashboard and instant oracle price updates when loans are created.",
      },
    ],
  },
  {
    category: "Doma Ecosystem Integration",
    icon: Clock,
    questions: [
      {
        question: "How do I get testnet ETH for gas fees?",
        answer:
          "Get Sepolia ETH from any faucet (like Alchemy or Infura), then use the Doma Bridge (bridge-testnet.doma.xyz) to bridge it to Doma Testnet. Gas fees on Doma are extremely low - a few cents per transaction - so 0.1 ETH will last you hundreds of transactions.",
      },
      {
        question: "Where can I buy domain tokens?",
        answer:
          "Visit Mizu DEX (mizu-testnet.doma.xyz) - Doma's official DeFi marketplace for fractionalized domain tokens. You can browse premium domains like software.ai, crypto.ai, nft.io and buy fractional shares using your Doma testnet ETH.",
      },
      {
        question: "Can I see my domain token metadata?",
        answer:
          "Yes! DomaLend integrates deeply with Doma's Subgraph to display rich metadata for domain tokens: domain images, Twitter links, website URLs, fractionalization date, total supply, and current Mizu DEX prices. All visible in our loan offer interface.",
      },
      {
        question: "What happens when my loan is liquidated?",
        answer:
          "If your collateral value drops below the liquidation threshold and you don't add more collateral or make a partial repayment, the smart contract automatically transfers your locked domain tokens to the lender. This protects lenders from losses while ensuring fairness.",
      },
    ],
  },
  {
    category: "Technical & Troubleshooting",
    icon: AlertTriangle,
    questions: [
      {
        question: "What blockchain network does DomaLend use?",
        answer:
          "DomaLend is deployed on Doma Testnet (Chain ID: 97476, RPC: https://rpc-testnet.doma.xyz). Make sure your wallet is connected to this network. You can add it manually or DomaLend will prompt you to switch networks when you connect your wallet.",
      },
      {
        question: "Where can I verify the smart contracts?",
        answer:
          "Our smart contracts are deployed and verified on Doma Testnet Explorer (explorer-testnet.doma.xyz). DomaLend contract: 0x55c351F83F9Ad1bCE69a4A2A655BB55E48E67a40, DomaRankOracle: 0x4EB31C15D33FaC33A1C68aE3b7f8Ce40e2e65F1C. All code is open-source on GitHub.",
      },
      {
        question: "I can't see my loan or transaction. What should I do?",
        answer:
          "Check the 'My Loans' page to see all your active loans. Verify you're connected to Doma Testnet (Chain ID: 97476) with the correct wallet address. You can also check transactions on Doma Testnet Explorer using your wallet address or transaction hash.",
      },
      {
        question: "How do I contact support?",
        answer:
          "For support, email harshmittal.dev@gmail.com or reach out on Twitter @DomaLendFi. You can also open an issue on our GitHub repository. We typically respond within 24 hours.",
      },
    ],
  },
];

const allQuestions = faqs.flatMap((category) =>
  category.questions.map((q) => ({
    question: q.question,
    answer: q.answer,
  }))
);

export default function FAQ() {
  return (
    <>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <Badge variant="secondary" className="px-4 py-2">
            Help & Support
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to know about DomaLend - the world&apos;s first
            lending protocol for fractionalized domain tokens. Learn about
            DomaRank AI Oracle, domain token collateral, Doma ecosystem, and
            more.
          </p>
        </section>

        {/* FAQ Categories */}
        <section className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-4 w-4 text-primary" />
                  </div>
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`${categoryIndex}-${index}`}
                    >
                      <AccordionTrigger className="text-left hover:text-primary">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Contact Section */}
        <section className="text-center space-y-6 py-12 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl">
          <h2 className="text-2xl md:text-3xl font-bold">
            Still have questions?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Can&apos;t find the answer you&apos;re looking for? Our support team
            is here to help you unlock liquidity from your domain tokens.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:harshmittal.dev@gmail.com"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="https://twitter.com/DomaLendFi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Follow on X (Twitter)
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
