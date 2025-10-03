"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectButton } from "@/components/ConnectButton";
import { FaucetDropdown } from "@/components/FaucetDropdown";
import { useP2PLending } from "@/hooks/useP2PLending";
import {
  Home,
  PlusCircle,
  List,
  User,
  // Wallet,
  BarChart3,
  Moon,
  Sun,
  Menu,
  X,
  Gift,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isConnected, address } = useP2PLending();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
    },
    {
      href: "/domarank",
      label: "DomaRank",
      icon: Sparkles,
    },
    {
      href: "/create",
      label: "Create",
      icon: PlusCircle,
    },
    {
      href: "/offers",
      label: "Offers",
      icon: List,
      // badge: activeLoanOfferIds?.length || 0,
    },
    {
      href: "/my-loans",
      label: "My Loans",
      icon: User,
    },
    // {
    //   href: "/analytics",
    //   label: "Analytics",
    //   icon: BarChart3,
    // },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 luxury-shadow">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105"
          >
            <div className="relative">
              <img
                src="/logo.png"
                alt="DomaLend Logo"
                className=" w-20 h-20 text-primary transition-colors duration-300 group-hover:text-primary/80"
              />
              <div className="absolute -inset-1 bg-primary/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                DomaLend
              </span>
              <Badge
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-medium"
              >
                Testnet
              </Badge>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={
                      isActive
                        ? "default"
                        : item.label === "DomaRank"
                          ? "outline"
                          : "ghost"
                    }
                    size="sm"
                    className={`
                      relative flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg btn-premium"
                          : "hover:bg-accent hover:text-accent-foreground hover:scale-105"
                      }
                      ${item.label === "DomaRank" ? "border-b-cyan-400" : ""}
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {/* {item.badge !== undefined && item.badge > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 text-xs h-5 min-w-5 bg-background/90 text-foreground border-0 shadow-sm"
                      >
                        {item.badge}
                      </Badge>
                    )} */}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0 rounded-xl hover:bg-accent hover:scale-105 transition-all duration-300"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Faucet Button */}
            <div className="hidden md:block">
              <FaucetDropdown />
            </div>

            {/* Connect Button */}
            <div className="hidden md:block">
              <ConnectButton />
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-9 w-9 p-0 rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border/50 py-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`
                        w-full justify-start space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {/* {item.badge !== undefined && item.badge > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs h-5 min-w-5"
                        >
                          {item.badge}
                        </Badge>
                      )} */}
                    </Button>
                  </Link>
                );
              })}

              {/* Mobile Faucet and Connect Buttons */}
              <div className="pt-4 border-t border-border/50 space-y-2">
                <FaucetDropdown />
                <ConnectButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navigation;
