// Google Analytics 4 setup for Next.js 15

// Google Analytics types
interface GtagConfig {
  page_title?: string;
  page_location?: string;
  custom_map?: Record<string, string>;
  send_page_view?: boolean;
  [key: string]: string | number | boolean | Record<string, string> | undefined;
}

interface GtagEvent {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: string | number | boolean | undefined;
}

type GtagTarget = string | Date | GtagConfig;
type DataLayerItem = Record<string, unknown> | unknown[];

// Performance API types
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

declare global {
  interface Window {
    gtag: (
      command: "config" | "event" | "js" | "set",
      targetId: GtagTarget,
      config?: GtagConfig | GtagEvent
    ) => void;
    dataLayer: DataLayerItem[];
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_TRACKING_ID) {
    console.warn("Google Analytics tracking ID not found");
    return;
  }

  // Load gtag script
  const script1 = document.createElement("script");
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script1);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (!GA_TRACKING_ID || typeof window.gtag !== "function") return;

  window.gtag("config", GA_TRACKING_ID, {
    page_title: title || document.title,
    page_location: url,
  });
};

// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number,
  customParameters?: Record<string, string | number | boolean | undefined>
) => {
  if (!GA_TRACKING_ID || typeof window.gtag !== "function") return;

  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
    ...customParameters,
  });
};

// DreamLend-specific event tracking
export const trackLendingEvent = {
  // Loan creation events
  loanOfferCreated: (amount: string, token: string, duration: string) => {
    trackEvent(
      "loan_offer_created",
      "lending",
      `${amount} ${token}`,
      undefined,
      {
        loan_amount: amount,
        loan_token: token,
        loan_duration: duration,
      }
    );
  },

  loanOfferAccepted: (loanId: string, amount: string, token: string) => {
    trackEvent(
      "loan_offer_accepted",
      "borrowing",
      `${amount} ${token}`,
      undefined,
      {
        loan_id: loanId,
        loan_amount: amount,
        loan_token: token,
      }
    );
  },

  loanRepaid: (loanId: string, amount: string, token: string) => {
    trackEvent("loan_repaid", "borrowing", `${amount} ${token}`, undefined, {
      loan_id: loanId,
      repaid_amount: amount,
      loan_token: token,
    });
  },

  // User engagement events
  walletConnected: (walletType: string) => {
    trackEvent("wallet_connected", "user_engagement", walletType);
  },

  pageVisit: (pageName: string) => {
    trackEvent("page_visit", "navigation", pageName);
  },

  // Conversion events
  signUp: (method: string) => {
    trackEvent("sign_up", "conversion", method);
  },

  // Error tracking
  error: (errorType: string, errorMessage: string, page: string) => {
    trackEvent("error", "system", errorType, undefined, {
      error_message: errorMessage,
      page: page,
    });
  },
};

// Performance monitoring
export const trackPerformance = (metricName: string, value: number) => {
  if (!GA_TRACKING_ID || typeof window.gtag !== "function") return;

  window.gtag("event", "timing_complete", {
    name: metricName,
    value: Math.round(value),
  });
};

// Track Core Web Vitals
export const trackWebVitals = () => {
  if (typeof window === "undefined") return;

  // Track LCP (Largest Contentful Paint)
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === "largest-contentful-paint") {
        trackPerformance("LCP", entry.startTime);
      }
    }
  });

  try {
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {
    // LCP not supported
  }

  // Track FID (First Input Delay)
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === "first-input") {
        const fid =
          (entry as PerformanceEventTiming).processingStart - entry.startTime;
        trackPerformance("FID", fid);
      }
    }
  });

  try {
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch (e) {
    // FID not supported
  }

  // Track CLS (Cumulative Layout Shift)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as LayoutShift).hadRecentInput) {
        clsValue += (entry as LayoutShift).value;
      }
    }
  });

  try {
    clsObserver.observe({ type: "layout-shift", buffered: true });

    // Report CLS when the page is about to be unloaded
    window.addEventListener("beforeunload", () => {
      trackPerformance("CLS", clsValue);
    });
  } catch (e) {
    // CLS not supported
  }
};

// Initialize analytics on client side
export const initializeAnalytics = () => {
  if (typeof window !== "undefined") {
    initGA();
    trackWebVitals();
  }
};
