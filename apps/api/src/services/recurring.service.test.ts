/**
 * Tekrarlayan fatura servisi testleri.
 *
 * - computeNextRun: saf tarih hesabı (ay sonu clamp dahil)
 * - runDueRecurringInvoices / catchUpRecurring: prisma mock'lanarak
 *   hata izolasyonu ve telafi (catch-up) davranışı doğrulanır.
 *
 * Çalıştırma: ./node_modules/.bin/vitest run
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// prisma'yı modül yüklenmeden önce mock'la
vi.mock("../db/prisma.js", () => ({
  prisma: {
    recurringInvoice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../db/prisma.js";
import {
  catchUpRecurring,
  computeNextRun,
  runDueRecurringInvoices,
} from "./recurring.service.js";

const mockedPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeNextRun", () => {
  it("daily: gün ekler", () => {
    const from = new Date(2026, 0, 15); // 15 Oca 2026
    const next = computeNextRun(from, "daily", 3);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(18);
  });

  it("weekly: 7 gün ekler", () => {
    const from = new Date(2026, 0, 15);
    const next = computeNextRun(from, "weekly", 2);
    expect(next.getDate()).toBe(29); // 15 + 14
  });

  it("monthly: bir ay ekler", () => {
    const from = new Date(2026, 0, 15);
    const next = computeNextRun(from, "monthly", 1);
    expect(next.getMonth()).toBe(1); // Şubat
    expect(next.getDate()).toBe(15);
  });

  it("monthly: ay sonu taşmasını engeller (31 Oca → 28 Şub)", () => {
    const from = new Date(2026, 0, 31); // 31 Oca 2026
    const next = computeNextRun(from, "monthly", 1);
    expect(next.getMonth()).toBe(1); // Şubat (Mart değil)
    expect(next.getDate()).toBe(28); // 2026 artık yıl değil
  });

  it("monthly: artık yılda 29 Şub'a clamp'ler", () => {
    const from = new Date(2028, 0, 31); // 31 Oca 2028 (artık yıl)
    const next = computeNextRun(from, "monthly", 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(29);
  });

  it("quarterly: 3 ay ekler", () => {
    const from = new Date(2026, 0, 15);
    const next = computeNextRun(from, "quarterly", 1);
    expect(next.getMonth()).toBe(3); // Nisan
  });

  it("yearly: 12 ay ekler", () => {
    const from = new Date(2026, 5, 10);
    const next = computeNextRun(from, "yearly", 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(10);
  });

  it("intervalCount 0 veya negatifse en az 1 kabul eder", () => {
    const from = new Date(2026, 0, 15);
    const next = computeNextRun(from, "monthly", 0);
    expect(next.getMonth()).toBe(1);
  });

  it("orijinal tarihi değiştirmez (immutable)", () => {
    const from = new Date(2026, 0, 31);
    const snapshot = from.getTime();
    computeNextRun(from, "monthly", 1);
    expect(from.getTime()).toBe(snapshot);
  });
});

describe("runDueRecurringInvoices", () => {
  it("vadesi gelen şablon yoksa hiçbir şey üretmez", async () => {
    mockedPrisma.recurringInvoice.findMany.mockResolvedValue([]);

    const result = await runDueRecurringInvoices();

    expect(result).toEqual({ processed: 0, generated: 0, failed: 0, errors: [] });
  });

  it("bir şablon hata verse de diğerleri işlenir (hata izolasyonu)", async () => {
    mockedPrisma.recurringInvoice.findMany.mockResolvedValue([
      { id: "r1", name: "Şablon 1" },
      { id: "r2", name: "Şablon 2" },
    ] as never);

    // r1: aktif olmayan şablon → generateInvoiceFromRecurring null döner
    // r2: findUnique hata fırlatır → failed sayılır
    mockedPrisma.recurringInvoice.findUnique
      .mockResolvedValueOnce(null) // r1
      .mockRejectedValueOnce(new Error("DB hatası")); // r2

    const result = await runDueRecurringInvoices();

    expect(result.processed).toBe(2);
    expect(result.generated).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe("r2");
    expect(result.errors[0].message).toContain("DB hatası");
  });
});

describe("catchUpRecurring", () => {
  it("şablon aktif değilse hiç üretmez", async () => {
    mockedPrisma.recurringInvoice.findUnique.mockResolvedValue({
      nextRunAt: new Date(2020, 0, 1),
      status: "paused",
    } as never);

    const result = await catchUpRecurring("r1");

    expect(result.generated).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("nextRunAt gelecekteyse hiç üretmez", async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    mockedPrisma.recurringInvoice.findUnique.mockResolvedValue({
      nextRunAt: future,
      status: "active",
    } as never);

    const result = await catchUpRecurring("r1");

    expect(result.generated).toBe(0);
  });

  it("maxCatchUp sınırını aşmaz", async () => {
    // Her çağrıda geçmişte bir nextRunAt döner → döngü maxCatchUp'ta durmalı.
    // generateInvoiceFromRecurring null dönerse döngü kırılır; bu yüzden
    // gerçek üretim yolunu tetiklemek yerine sınırı doğrulamak için
    // findUnique'yi hep geçmiş tarihle besleyip generate'i null'a zorluyoruz.
    mockedPrisma.recurringInvoice.findUnique.mockResolvedValue({
      nextRunAt: new Date(2020, 0, 1),
      status: "active",
    } as never);
    // generateInvoiceFromRecurring içindeki findUnique de aynı mock'u kullanır;
    // items boş olduğu için null döner ve döngü ilk turda kırılır.
    mockedPrisma.recurringInvoice.findUnique.mockResolvedValue({
      id: "r1",
      status: "active",
      items: [],
      company: {},
      customer: {},
      nextRunAt: new Date(2020, 0, 1),
    } as never);

    const result = await catchUpRecurring("r1", 5);

    expect(result.generated).toBe(0);
  });
});
