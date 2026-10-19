// jest.env.setup.js - Runs BEFORE next/jest loads next.config.js
// Set test environment variables before any module loads

process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_CHAIN_ID = '11155420';
process.env.NEXT_PUBLIC_RPC_URL = 'https://sepolia.optimism.io';
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = '00000000000000000000000000000000';
process.env.NEXT_PUBLIC_EXPLORER_BASE_URL = 'https://sepolia.etherscan.io';