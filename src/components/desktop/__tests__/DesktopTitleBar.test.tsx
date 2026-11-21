import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { DesktopTitleBar, UpdateStatus } from "../DesktopTitleBar";
import * as pwaUtils from "@/lib/pwa/pwa-utils";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

describe("<DesktopTitleBar />", () => {
  let isElectronSpy: ReturnType<typeof vi.spyOn>;
  let mockMinimize: ReturnType<typeof vi.fn>;
  let mockMaximize: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;
  let mockIsMaximized: ReturnType<typeof vi.fn>;
  let mockOnMaximizedChange: ReturnType<typeof vi.fn>;
  let mockApplyUpdate: ReturnType<typeof vi.fn>;
  let mockGetUpdateStatus: ReturnType<typeof vi.fn>;
  let mockOnUpdateStatusChange: ReturnType<typeof vi.fn>;
  let maximizedChangeCallback: ((maximized: boolean) => void) | null = null;
  let updateStatusCallback: ((status: UpdateStatus) => void) | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    isElectronSpy = vi.spyOn(pwaUtils, "isElectron");
    maximizedChangeCallback = null;
    updateStatusCallback = null;

    mockMinimize = vi.fn().mockResolvedValue(undefined);
    mockMaximize = vi.fn().mockResolvedValue(undefined);
    mockClose = vi.fn().mockResolvedValue(undefined);
    mockIsMaximized = vi.fn().mockResolvedValue(false);
    mockApplyUpdate = vi.fn().mockResolvedValue(true);
    mockGetUpdateStatus = vi.fn().mockResolvedValue({
      state: "idle",
      version: null,
      percent: 0,
    });

    mockOnMaximizedChange = vi.fn((cb: (maximized: boolean) => void) => {
      maximizedChangeCallback = cb;
      return () => {
        maximizedChangeCallback = null;
      };
    });

    mockOnUpdateStatusChange = vi.fn((cb: (status: UpdateStatus) => void) => {
      updateStatusCallback = cb;
      return () => {
        updateStatusCallback = null;
      };
    });

    // Setup window.electron bridge mock
    Object.defineProperty(window, "electron", {
      value: {
        isElectron: true,
        minimize: mockMinimize,
        maximize: mockMaximize,
        close: mockClose,
        isMaximized: mockIsMaximized,
        onMaximizedChange: mockOnMaximizedChange,
        applyUpdate: mockApplyUpdate,
        getUpdateStatus: mockGetUpdateStatus,
        onUpdateStatusChange: mockOnUpdateStatusChange,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    delete (window as unknown as { electron?: unknown }).electron;
  });

  it("does not render (returns null) when running in standard web browser", () => {
    isElectronSpy.mockReturnValue(false);

    const { container } = render(<DesktopTitleBar />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("desktop-titlebar")).not.toBeInTheDocument();
  });

  it("renders custom titlebar with branding and window controls when running in Electron", async () => {
    isElectronSpy.mockReturnValue(true);

    await act(async () => {
      render(<DesktopTitleBar />);
    });

    expect(screen.getByTestId("desktop-titlebar")).toBeInTheDocument();
    expect(screen.getByText("Plexi ERP")).toBeInTheDocument();
    expect(screen.getByText("| Central Factory System")).toBeInTheDocument();
    expect(screen.getByTestId("window-minimize-btn")).toBeInTheDocument();
    expect(screen.getByTestId("window-maximize-btn")).toBeInTheDocument();
    expect(screen.getByTestId("window-close-btn")).toBeInTheDocument();
  });

  it("sets document --titlebar-height to 36px in Electron and cleans up on unmount", async () => {
    isElectronSpy.mockReturnValue(true);

    let unmountFn: () => void = () => {};
    await act(async () => {
      const res = render(<DesktopTitleBar />);
      unmountFn = res.unmount;
    });

    expect(document.documentElement.style.getPropertyValue("--titlebar-height")).toBe("36px");

    act(() => {
      unmountFn();
    });

    expect(document.documentElement.style.getPropertyValue("--titlebar-height")).toBe("0px");
  });

  it("invokes window.electron.minimize() on minimize button click", async () => {
    isElectronSpy.mockReturnValue(true);

    await act(async () => {
      render(<DesktopTitleBar />);
    });

    const minimizeBtn = screen.getByTestId("window-minimize-btn");
    await act(async () => {
      fireEvent.click(minimizeBtn);
    });

    expect(mockMinimize).toHaveBeenCalledTimes(1);
  });

  it("invokes window.electron.maximize() on maximize button click and double-clicking the titlebar", async () => {
    isElectronSpy.mockReturnValue(true);

    await act(async () => {
      render(<DesktopTitleBar />);
    });

    const maximizeBtn = screen.getByTestId("window-maximize-btn");
    await act(async () => {
      fireEvent.click(maximizeBtn);
    });
    expect(mockMaximize).toHaveBeenCalledTimes(1);

    const titlebar = screen.getByTestId("desktop-titlebar");
    await act(async () => {
      fireEvent.doubleClick(titlebar);
    });
    expect(mockMaximize).toHaveBeenCalledTimes(2);
  });

  it("invokes window.electron.close() on close button click", async () => {
    isElectronSpy.mockReturnValue(true);

    await act(async () => {
      render(<DesktopTitleBar />);
    });

    const closeBtn = screen.getByTestId("window-close-btn");
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("displays downloading progress pill when an update is downloading", async () => {
    isElectronSpy.mockReturnValue(true);

    await act(async () => {
      render(<DesktopTitleBar />);
    });

    expect(screen.queryByTestId("updater-downloading-pill")).not.toBeInTheDocument();

    act(() => {
      updateStatusCallback?.({
        state: "downloading",
        version: "0.2.0",
        percent: 45,
      });
    });

    expect(screen.getByTestId("updater-downloading-pill")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText(/Updating v0.2.0/)).toBeInTheDocument();
  });

  it("displays restart & update button when update is downloaded and triggers applyUpdate on click", async () => {
    isElectronSpy.mockReturnValue(true);

    await act(async () => {
      render(<DesktopTitleBar />);
    });

    act(() => {
      updateStatusCallback?.({
        state: "downloaded",
        version: "0.2.0",
        percent: 100,
        installerPath: "C:\\Temp\\installer.exe",
      });
    });

    const restartBtn = screen.getByTestId("updater-restart-btn");
    expect(restartBtn).toBeInTheDocument();
    expect(screen.getByText(/Restart & Update v0.2.0/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(restartBtn);
    });

    expect(mockApplyUpdate).toHaveBeenCalledTimes(1);
  });
});
