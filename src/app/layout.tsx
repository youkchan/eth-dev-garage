import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Ethereum Dev Garage | ETH Tools for Developers",
  description: "Simple cryptocurrency tools for Ethereum developers. Convert units, view transactions, and analyze blockchain data with ease.",
  keywords: "USDC unit converter, USDC unit calculator, Ethereum unit calculator, eth converter, wei to ether, gwei calculator, crypto unit converter, eth developer tools, ethereum gas calculator, crypto conversion tool, blockchain unit converter",
  openGraph: {
    title: "Ethereum Dev Garage | ETH Tools for Developers",
    description: "Simple cryptocurrency tools for Ethereum developers. Convert units, view transactions, and analyze blockchain data with ease.",
    url: "https://eth-dev-garage.vercel.app",
    siteName: "Ethereum Dev Garage",
    images: [
      {
        url: "https://eth-dev-garage.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ethereum Dev Garage",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://eth-dev-garage.vercel.app",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Ethereum Dev Garage",
              "description": "Simple cryptocurrency tools for Ethereum developers. Convert units, view transactions, and analyze blockchain data with ease.",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Web",
              "keywords": "USDC unit converter, USDC unit calculator, Ethereum unit calculator, eth converter, wei to ether",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": "ETH Unit Converter, USDC Unit Converter, Transaction Viewer"
            })
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}

