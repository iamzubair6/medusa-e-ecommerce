import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders its children as an accessible button", () => {
    render(<Button>Add to cart</Button>);
    expect(screen.getByRole("button", { name: /add to cart/i })).toBeInTheDocument();
  });

  it("applies the claret accent variant", () => {
    render(<Button variant="accent">Checkout</Button>);
    expect(screen.getByRole("button", { name: /checkout/i })).toHaveClass("bg-accent");
  });

  it("is disabled and aria-busy while loading", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
