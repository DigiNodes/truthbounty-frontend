# Frontend Contributor Onboarding Guide

Welcome to the TruthBounty Frontend project! This guide will help you get started as a contributor to our decentralized news verification platform.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **pnpm** (package manager) - Install with `npm install -g pnpm`
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

### Optional but Recommended
- **MetaMask** or another Web3 wallet for testing blockchain features
- **Worldcoin app** for identity verification testing

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/truthbounty-frontend.git
cd truthbounty-frontend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with necessary environment variables. Check with the team for required values.

### 4. Start the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### 5. Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm type-check
```

## 🛠️ Development Workflow

### Branching Strategy

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Run tests and linting:
   ```bash
   pnpm lint
   pnpm test
   pnpm type-check
   ```

4. Commit your changes with descriptive messages

5. Push and create a Pull Request

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm test` | Run Jest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm storybook` | Start Storybook for component development |

## 📏 Coding Standards

### TypeScript

- **Strict mode** is enabled - all code must be type-safe
- Use interfaces for object types, types for unions
- Avoid `any` - use proper types or `unknown` when necessary
- Leverage utility types from TypeScript

### React

- Use functional components with hooks
- Prefer custom hooks for reusable logic
- Use TypeScript for component props
- Follow the component organization in `src/components/`

### Styling

- Use **Tailwind CSS** for styling
- Follow utility-first approach
- Use `class-variance-authority` for component variants
- Maintain consistent spacing and colors

### Code Quality

- **ESLint** is configured with Next.js and Storybook rules
- **Prettier** is used for code formatting
- Run `pnpm lint` before committing
- Fix all linting errors and warnings

### Naming Conventions

- **Components**: PascalCase (e.g., `ClaimCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useClaims.ts`)
- **Types**: PascalCase (e.g., `ClaimStatus`)
- **Files**: kebab-case for components, camelCase for utilities

## 🧪 Testing

### Unit Testing

- Use **Jest** with **Testing Library** for React components
- Write tests for custom hooks and utilities
- Mock external dependencies (API calls, WebSocket, etc.)
- Aim for good test coverage

### E2E Testing

- Use **Playwright** for end-to-end tests
- Test critical user flows
- Run tests across different browsers

### Testing Best Practices

- Test user interactions, not implementation details
- Use descriptive test names
- Mock external services appropriately
- Keep tests fast and reliable

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Dashboard route group
│   ├── api/               # API routes
│   ├── lib/               # App utilities
│   ├── queries/           # React Query definitions
│   ├── types/             # TypeScript definitions
│   └── providers.tsx      # App providers
├── components/            # React components
│   ├── common/           # Shared components
│   ├── features/         # Feature-specific components
│   ├── ui/               # Base UI components (shadcn/ui)
│   └── ...
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
└── data/                 # Static/mock data
```

### Key Concepts

- **Feature-based organization**: Components grouped by feature
- **Custom hooks**: Business logic in reusable hooks
- **React Query**: Server state management
- **WebSocket**: Real-time data synchronization
- **TypeScript**: Strict type safety throughout

## 🤝 How to Contribute

### 1. Find an Issue

- Check the [Issues](https://github.com/your-org/truthbounty-frontend/issues) page
- Look for issues labeled `good first issue` or `help wanted`

### 2. Create a Branch

```bash
git checkout -b feature/issue-number-description
```

### 3. Make Changes

- Follow the coding standards above
- Write tests for new features
- Update documentation if needed
- Ensure all tests pass

### 4. Submit a Pull Request

- Provide a clear description of changes
- Reference the issue number
- Request review from maintainers
- Address any feedback

### 5. Code Review Process

- All PRs require review
- Address review comments
- Maintainers will merge approved changes

## 📚 Resources

### Documentation

- [Frontend Architecture](./ARCHITECTURE.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools & Libraries

- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Query](https://tanstack.com/query/)
- [Wagmi](https://wagmi.sh/)
- [Playwright](https://playwright.dev/)

### Community

- [Discord/Slack channel] - For questions and discussions
- [GitHub Discussions] - For longer-form discussions

## 🆘 Getting Help

If you need help:

1. Check this guide and linked documentation
2. Search existing issues and discussions
3. Ask in the community channels
4. Create an issue for bugs or feature requests

## 🎯 Next Steps

Once you're set up:

1. Explore the codebase by running the app
2. Look at existing components and hooks
3. Try creating a small feature or fixing a bug
4. Familiarize yourself with the testing setup

Welcome aboard! We're excited to have you contribute to making decentralized news verification accessible to everyone. 🚀</content>
<parameter name="filePath">c:\Users\hp\Desktop\wave\truthbounty-frontend-1\docs\CONTRIBUTING.md