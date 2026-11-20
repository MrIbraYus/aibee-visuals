import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Montserrat } from "next/font/google";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { ProjectDrawer } from "@/components/project/ProjectDrawer";
import { Cursor } from "@/components/ui/Cursor";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { SiteOnly } from "@/components/layout/SiteOnly";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { site } from "@/content/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "800"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Aibee Visuals — We Build Brands That Make an Impact",
    template: "%s · Aibee Visuals",
  },
  description: site.description,
  keywords: ["design studio", "branding", "brand identity", "logo design", "UI/UX", "web design", "social media design", "campaigns"],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "Aibee Visuals — We Build Brands That Make an Impact",
    description: site.description,
  },
  twitter: { card: "summary_large_image", title: "Aibee Visuals", description: site.description },
  applicationName: "Aibee Visuals",
  appleWebApp: { capable: true, title: "Aibee Visuals", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // App-like: no pinch / double-tap / input-focus zooming on phones.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/** Skip the intro animation on repeat visits within a session (runs before paint). */
const introScript = `try{if(sessionStorage.getItem("aibee-intro"))document.documentElement.classList.add("intro-seen")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${instrument.variable} ${montserrat.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body>
        <noscript>
          <style>{"[data-preloader]{display:none!important}"}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only z-[200] rounded-full bg-lime px-5 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SmoothScroll>
          <SiteOnly>
            <Nav />
          </SiteOnly>
          <main id="main">{children}</main>
          <SiteOnly>
            <Footer />
            <ProjectDrawer />
            <WhatsAppButton />
            <MobileTabBar />
            <Cursor />
          </SiteOnly>
        </SmoothScroll>
      </body>
    </html>
  );
}
