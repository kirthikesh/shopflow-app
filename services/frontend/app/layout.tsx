import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./globals.css";

import type { Metadata } from "next";

import { Header, Toast } from "@/components/Header";
import { CartProvider } from "@/lib/cart-context";

export const metadata: Metadata = {
  title: "ShopFlow — desk gear",
  description: "Keyboards, displays, audio and accessories for a better desk.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Header />
          <main id="main" className="wrap">
            {children}
          </main>
          <footer className="site-footer">
            <div className="wrap">
              ShopFlow is a demo store. Payments are simulated and no money is taken.
            </div>
          </footer>
          <Toast />
        </CartProvider>
      </body>
    </html>
  );
}
