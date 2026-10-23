import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// Rounded sans, close to the SF Pro Rounded feel.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Quest Chog",
  description:
    "Your Chog has a goal. So do you. You complete yours, it completes its, you all win.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
