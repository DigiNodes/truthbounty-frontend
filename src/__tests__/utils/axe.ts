import { configureAxe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

export const axe = configureAxe({
  rules: {
    // Skip region rule - the app uses semantic HTML but may not always
    // have ARIA landmarks on every level
    region: { enabled: false },
  },
});

export async function assertAccessible(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}
