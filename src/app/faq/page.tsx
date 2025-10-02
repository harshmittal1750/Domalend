import { Metadata } from "next";
import {
  generateSEOMetadata,
  generateFAQSchema,
  generateBreadcrumbSchema,
  StructuredData,
} from "@/lib/seo";
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

export const metadata: Metadata = generateSEOMetadata({
  title: "Frequently Asked Questions - DreamLend Finance",
  description:
    "Get answers to common questions about DreamLend's P2P crypto lending platform. Learn about lending, borrowing, security, fees, and more.",
  canonical: "/faq",
  keywords: [
    "crypto lending FAQ",
    "P2P lending questions",
    "DeFi lending help",
    "crypto loan questions",
    "DreamLend support",
    "crypto lending safety",
  ],
});

const faqs = [
  {
    category: "Getting Started",
    icon: HelpCircle,
    questions: [
      {
        question: "What is DreamLend Finance?",
        answer:
          "DreamLend Finance is a peer-to-peer (P2P) cryptocurrency lending platform built on Somnia L1. It allows users to lend their crypto assets to earn interest or borrow crypto by providing collateral, all through secure smart contracts.",
      },
      {
        question: "How do I get started with DreamLend?",
        answer:
          "To get started, simply connect your Web3 wallet (like MetaMask) to our platform. Once connected, you can browse loan offers to borrow crypto or create your own loan offers to start lending and earning interest.",
      },
      {
        question: "What wallets are supported?",
        answer:
          "DreamLend supports all major Web3 wallets including MetaMask, WalletConnect, Coinbase Wallet, and any wallet compatible with WalletConnect protocol.",
      },
      {
        question: "Do I need to create an account?",
        answer:
          "No, you don't need to create a traditional account. DreamLend is fully decentralized - you just need to connect your Web3 wallet to start using the platform.",
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
          "Interest rates on DreamLend are market-driven and can vary based on supply and demand. Lenders typically earn between 5-15% APY, depending on the loan terms, duration, and market conditions.",
      },
      {
        question: "What tokens can I lend?",
        answer:
          "DreamLend supports a variety of popular cryptocurrencies including stablecoins (USDC, USDT), major tokens (WETH, WBTC), and other selected ERC-20 tokens. The supported token list is regularly updated based on market demand and security assessments.",
      },
      {
        question: "How do I create a loan offer?",
        answer:
          "To create a loan offer, go to the 'Create' page, specify your loan terms (amount, interest rate, duration), choose accepted collateral types, and submit your offer. Your offer will appear in the marketplace for borrowers to accept.",
      },
      {
        question: "Can I cancel my loan offer?",
        answer:
          "Yes, you can cancel your loan offer anytime before it's accepted by a borrower. Once a borrower accepts your offer and provides collateral, the loan becomes active and cannot be cancelled.",
      },
    ],
  },
  {
    category: "Borrowing",
    icon: Zap,
    questions: [
      {
        question: "How do crypto loans work on DreamLend?",
        answer:
          "Crypto loans on DreamLend are collateralized, meaning you must deposit crypto assets as collateral to secure your loan. The collateral value must exceed the loan value by a certain ratio to protect lenders.",
      },
      {
        question: "What can I use as collateral?",
        answer:
          "You can use various cryptocurrencies as collateral, including WETH, WBTC, and other approved tokens. The platform uses real-time oracle pricing to determine fair collateral values.",
      },
      {
        question: "What happens if I can't repay my loan?",
        answer:
          "If you fail to repay your loan by the deadline, your collateral will be liquidated to repay the lender. The liquidation process is automated and handled by smart contracts to ensure fairness.",
      },
      {
        question: "Can I repay my loan early?",
        answer:
          "Yes, you can repay your loan at any time before the deadline. Early repayment will save you interest costs, and you'll immediately regain access to your collateral.",
      },
    ],
  },
  {
    category: "Security & Safety",
    icon: Shield,
    questions: [
      {
        question: "How secure is DreamLend Finance?",
        answer:
          "DreamLend prioritizes security with multi-signature wallets, audited smart contracts, and institutional-grade security protocols. All funds are secured by smart contracts, and we never have custody of your assets.",
      },
      {
        question: "Are smart contracts audited?",
        answer:
          "Yes, all DreamLend smart contracts undergo rigorous security audits by reputable firms. We also implement additional security measures like time-locks and multi-signature requirements for critical functions.",
      },
      {
        question: "What happens if there's a smart contract bug?",
        answer:
          "While our contracts are thoroughly audited, we maintain insurance funds and emergency procedures to protect users in the unlikely event of a critical bug. We also have a bug bounty program to incentivize security researchers.",
      },
      {
        question: "How are prices determined for liquidations?",
        answer:
          "DreamLend uses Chainlink price oracles to get real-time, accurate market prices for all supported tokens. This ensures fair and transparent pricing for collateral valuations and liquidations.",
      },
    ],
  },
  {
    category: "Fees & Costs",
    icon: Clock,
    questions: [
      {
        question: "What fees does DreamLend charge?",
        answer:
          "DreamLend charges a small platform fee (typically 0.5-1%) on successful loans to maintain and improve the platform. All fees are clearly displayed before you confirm any transaction.",
      },
      {
        question: "Are there any hidden fees?",
        answer:
          "No, DreamLend believes in complete transparency. All fees, including platform fees and network gas costs, are clearly displayed before you confirm any transaction.",
      },
      {
        question: "How much are gas fees?",
        answer:
          "Gas fees depend on network congestion and are paid to the blockchain network, not DreamLend. Built on Somnia L1, our platform offers significantly lower gas fees compared to Ethereum mainnet.",
      },
      {
        question: "Do I pay fees for cancelled offers?",
        answer:
          "You only pay the network gas fee for creating an offer. If you cancel an offer that hasn't been accepted, you won't pay any platform fees - only the gas cost for the cancellation transaction.",
      },
    ],
  },
  {
    category: "Troubleshooting",
    icon: AlertTriangle,
    questions: [
      {
        question: "My transaction is stuck or pending. What should I do?",
        answer:
          "If your transaction is pending for a long time, it might be due to network congestion or low gas fees. You can try speeding up the transaction in your wallet or wait for network conditions to improve.",
      },
      {
        question: "I can't see my loan or transaction. Where is it?",
        answer:
          "Check the 'My Loans' page to see all your active loans and transaction history. If you still can't find it, verify that you're connected with the correct wallet address.",
      },
      {
        question: "How do I contact support?",
        answer:
          "For support, you can reach us through our Discord community, send an email to harsh@dreamlend.finance, or use the help chat feature on our website.",
      },
      {
        question: "Can I use DreamLend on mobile?",
        answer:
          "Yes, DreamLend is fully responsive and works on mobile devices. You can use it through mobile Web3 browsers or wallet apps like MetaMask mobile.",
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

const faqSchema = generateFAQSchema(allQuestions);
const breadcrumbSchema = generateBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "FAQ", url: "/faq" },
]);

export default function FAQ() {
  return (
    <>
      <StructuredData data={faqSchema} />
      <StructuredData data={breadcrumbSchema} />
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
            Find answers to common questions about DreamLend &apos; s P2P crypto
            lending platform. Learn about lending, borrowing, security, fees,
            and more.
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
            Can &apos;t find the answer you &apos;re looking for? Our support
            team is here to help you get the most out of DreamLend Finance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:harsh@dreamlend.finance"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="https://x.com/dreamlendfi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Contact on X (Twitter)
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
