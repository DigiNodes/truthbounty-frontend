import React from "react";
import { render, screen, within } from "@testing-library/react";
import ActiveClaimsTable, {
  type ActiveClaim,
} from "@/components/features/ActiveClaimsTable";
import { assertAccessible } from "../utils/axe";

const claim: ActiveClaim = {
  category: "Science",
  impact: "High Impact",
  title: "Canonical claim row",
  source: "Reviewed source",
  status: "Verified",
  confidence: "97%",
  votes: "12",
  stake: "50 ETH",
  time: "2 days",
  actions: "View",
};

describe("ActiveClaimsTable accessibility", () => {
  it("loading state exposes a polite live region without axe violations", async () => {
    const { container } = render(<ActiveClaimsTable isLoading />);

    expect(
      screen.getByRole("status", { name: "Loading claims table" }),
    ).toHaveAttribute("aria-live", "polite");
    await assertAccessible(container);
  });

  it("ready state labels the table and its keyboard-reachable scroll region", async () => {
    const { container } = render(<ActiveClaimsTable claims={[claim]} />);
    const region = screen.getByRole("region", { name: "Active claims table" });

    expect(region).toHaveAttribute("tabindex", "0");
    expect(
      within(region).getByRole("table", { name: "Active claims" }),
    ).toBeInTheDocument();
    expect(within(region).getByText("Canonical claim row")).toBeInTheDocument();
    await assertAccessible(container);
  });

  it("empty state explains that there are no active claims", async () => {
    const { container } = render(<ActiveClaimsTable />);

    expect(
      screen.getByText("No active claims at the moment."),
    ).toBeInTheDocument();
    await assertAccessible(container);
  });

  it("error state announces the failure and exposes a retry action", async () => {
    const onRetry = jest.fn();
    const { container } = render(
      <ActiveClaimsTable isError onRetry={onRetry} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load claims. Please try again.",
    );
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
    await assertAccessible(container);
  });
});
