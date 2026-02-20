import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

export const metadata = {
  title: 'TruthBounty - Decentralized News Verification',
  description: 'Community-driven fact-checking across Ethereum and Stellar ecosystems',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
