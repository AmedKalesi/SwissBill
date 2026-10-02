/**
 * Fatura servisi testleri.
 *
 * - generateInvoiceNumber: yıl bazlı sıralı numara üretimi
 * - createInvoiceWithNumber: P2002 unique constraint çakışmasında retry
 *
 * Çalıştırma: ./node_modules/.bin/vitest run
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/prisma.js", () => ({
  prisma: {
    invoice: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../db/prisma.js";
import {
  createInvoiceWithNumber,
  generateInvoiceNumber,
} from "./invoice.service.js";

const mockedPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateInvoiceNumber", () => {
  it("kayıt yoksa 0001 ile başlar", async () => {
    mockedPrisma.invoice.findFirst.mockResolvedValue(null);

    const num = await generateInvoiceNumber("c1");
    const year = new Date().getFullYear();

    expect(num).toBe(`${year}-0001`);
  });

  it("son numaradan bir artırır", async () => {
    const year = new Date().getFullYear();
    mockedPrisma.invoice.findFirst.mockResolvedValue({
      invoiceNumber: `${year}-0042`,
    } as never);

    const num = await generateInvoiceNumber("c1");

    expect(num).toBe(`${year}-0043`);
  });

  it("bozuk numarayı 0001'e düşürür", async () => {
    const year = new Date().getFullYear();
    mockedPrisma.invoice.findFirst.mockResolvedValue({
      invoiceNumber: `${year}-ABCD`,
    } as never);

    const num = await generateInvoiceNumber("c1");

    expect(num).toBe(`${year}-0001`);
  });
});

describe("createInvoiceWithNumber", () => {
  it("ilk denemede başarılı olursa sonucu döner", async () => {
    mockedPrisma.invoice.findFirst.mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "inv1" });

    const result = await createInvoiceWithNumber("c1", create);

    expect(result).toEqual({ id: "inv1" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("P2002 hatasında yeni numarayla tekrar dener", async () => {
    const year = new Date().getFullYear();
    mockedPrisma.invoice.findFirst
      .mockResolvedValueOnce({ invoiceNumber: `${year}-0001` } as never)
      .mockResolvedValueOnce({ invoiceNumber: `${year}-0002` } as never);

    const p2002 = Object.assign(new Error("unique"), { code: "P2002" });
    const create = vi
      .fn()
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce({ id: "inv2" });

    const result = await createInvoiceWithNumber("c1", create);

    expect(result).toEqual({ id: "inv2" });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, `${year}-0002`);
    expect(create).toHaveBeenNthCalledWith(2, `${year}-0003`);
  });

  it("P2002 dışı hatayı hemen fırlatır", async () => {
    mockedPrisma.invoice.findFirst.mockResolvedValue(null);
    const create = vi.fn().mockRejectedValue(new Error("başka hata"));

    await expect(createInvoiceWithNumber("c1", create)).rejects.toThrow(
      "başka hata",
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("maxRetries aşılırsa son hatayı fırlatır", async () => {
    mockedPrisma.invoice.findFirst.mockResolvedValue(null);
    const p2002 = Object.assign(new Error("unique"), { code: "P2002" });
    const create = vi.fn().mockRejectedValue(p2002);

    await expect(
      createInvoiceWithNumber("c1", create, 3),
    ).rejects.toThrow("unique");
    expect(create).toHaveBeenCalledTimes(3);
  });
});
