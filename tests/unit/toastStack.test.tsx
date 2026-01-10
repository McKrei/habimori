import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ToastStack from "../../src/components/ToastStack";

const toast = { id: "t1", message: "Hello" };

describe("ToastStack", () => {
  it("renders toast content", () => {
    render(<ToastStack toasts={[toast]} onDismiss={() => undefined} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("auto-dismisses after timeout", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<ToastStack toasts={[toast]} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(4000);
    expect(onDismiss).toHaveBeenCalledWith("t1");
    vi.useRealTimers();
  });
});
