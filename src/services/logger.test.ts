import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, LOG_CONTEXT, LogContext } from "./logger";

const mocks = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue(undefined),
  mockClear: vi.fn().mockResolvedValue(undefined),
  mockOrderBy: vi.fn().mockReturnValue({
    reverse: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) }),
  }),
}));

vi.mock("../db", () => ({
  db: { logs: { add: mocks.mockAdd, clear: mocks.mockClear, orderBy: mocks.mockOrderBy } },
  SystemLog: {}
}));

vi.mock("./telemetryService", () => ({ telemetry: { track: vi.fn() } }));

describe("logger", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("has required methods", () => {
    expect(logger).toHaveProperty("debug");
    expect(logger).toHaveProperty("info");
    expect(logger).toHaveProperty("warn");
    expect(logger).toHaveProperty("error");
    expect(logger).toHaveProperty("success");
    expect(logger).toHaveProperty("getRecent");
    expect(logger).toHaveProperty("clear");
  });

  it("LOG_CONTEXT has required constants", () => {
    expect(LOG_CONTEXT.SYNC).toBe("SyncManager");
    expect(LOG_CONTEXT.HAMMER).toBe("HammerLogic");
    expect(LOG_CONTEXT.RECEPTION).toBe("ReceptionLogic");
    expect(LOG_CONTEXT.EXPORT).toBe("ExportService");
  });

  it("LOG_CONTEXT has all contexts", () => {
    const keys = ["SYNC", "HAMMER", "RECEPTION", "EXPORT", "AUTH", "DATABASE", "SETTINGS", "UI", "SCANNER", "PRINTER", "API"];
    keys.forEach(k => expect(LOG_CONTEXT).toHaveProperty(k));
  });

  it("info logs message", async () => {
    await logger.info("TEST", "Test message");
    expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ level: "info", module: "TEST" }));
  });

  it("warn logs warning", async () => {
    await logger.warn("TEST", "Warning");
    expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ level: "warn" }));
  });

  it("error logs error", async () => {
    await logger.error("TEST", "Error");
    expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ level: "error" }));
  });

  it("success logs success", async () => {
    await logger.success("TEST", "Success");
    expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ level: "success" }));
  });

  it("debug logs with info level", async () => {
    await logger.debug("TEST", "msg");
    // debug internally uses 'info' level but logs with DEBUG prefix
    expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ 
      level: "info",
      module: "TEST" 
    }));
  });

  it("clear clears logs", async () => {
    await logger.clear();
    expect(mocks.mockClear).toHaveBeenCalled();
  });

  it("handles details object", async () => {
    await logger.info("TEST", "details", { key: "value" });
    expect(mocks.mockAdd).toHaveBeenCalledWith(expect.objectContaining({ details: expect.any(String) }));
  });

  it("handles circular references", async () => {
    const c: any = { a: 1 }; c.self = c;
    await logger.info("TEST", "circular", c);
    expect(mocks.mockAdd).toHaveBeenCalled();
  });

  it("handles nested objects", async () => {
    await logger.info("TEST", "nested", { level1: { level2: { level3: "deep" } } });
    expect(mocks.mockAdd).toHaveBeenCalled();
  });
});
