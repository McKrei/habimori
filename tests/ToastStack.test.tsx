import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ToastStack from "../src/components/ToastStack";

describe("ToastStack", () => {
  it("renders toasts and auto-dismisses", () => {
    const onDismiss = vi.fn();
    vi.useFakeTimers();

    render(
      <ToastStack
        toasts={[{ id: "toast-1", message: "Hello" }]}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();

    vi.advanceTimersByTime(4000);

    expect(onDismiss).toHaveBeenCalledWith("toast-1");

    vi.useRealTimers();
  });
});
