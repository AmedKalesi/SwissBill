/**
 * Fatura rotası regresyon testleri.
 *
 * Amaç: Fatura oluşturma rotasının, fatura numarası çakışmasında
 * (Prisma P2002) `createInvoiceWithNumber` retry sarmalayıcısını
 * gerçekten kullandığını doğrulamak. Bu davranış daha önce yalnızca
 * servis seviyesinde test ediliyordu; rota doğrudan `generateInvoiceNumber`
 * çağırdığında eşzamanlı istekler ham 500 ile sonuçlanıyordu.
 *
 * Çalıştırma: ./node_modules/.bin/vitest run
 */
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Prisma mock'u ---------------------------------------------------------
const invoiceCreate = vi.fn();
const invoiceFindFirst = vi.fn();
const invoiceCount = vi.fn();
const companyFindFirst = vi.fn();
const customerFindFirst = vi.fn();
const subscriptionFindUnique = vi.fn();

vi.mock("../db/prisma.js", () => ({
  prisma: {
    invoice: {
      create: (...args: unknown[]) => invoiceCreate(...args),
      findFirst: (...args: unknown[]) => invoiceFindFirst(...args),
      count: (...args: unknown[]) => invoiceCount(...args),
    },
    company: { findFirst: (...args: unknown[]) => companyFindFirst(...args) },
    customer: { findFirst: (...args: unknown[]) => customerFindFirst(...args) },
    subscription: {
      findUnique: (...args: unknown[]) => subscriptionFindUnique(...args),
    },
  },
}));

// QR doğrulamasını izole et: bu test numaralandırma retry'ına odaklanır.
vi.mock("../services/qrbill.service.js", () => ({
  validateQrBillData: () => [],
  buildQrBillPayload: () => ({}),
  formatQrBillSummary: () => "",
}));

import errorHandlerPlugin, { AppError } from "../plugins/error-handler.js";
import { invoiceRoutes } from "./invoice.routes.js";

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";

const COMPANY = {
  id: COMPANY_ID,
  userId: "user1",
  name: "Flinkli GmbH",
  addressLine1: "Bahnhofstrasse 1",
  addressLine2: null,
  postalCode: "8001",
  city: "Zürich",
  country: "CH",
  iban: "CH9300762011623852957",
};

const CUSTOMER = {
  id: CUSTOMER_ID,
  companyId: COMPANY_ID,
  name: "Muster AG",
  addressLine1: "Seestrasse 2",
  addressLine2: null,
  postalCode: "8002",
  city: "Zürich",
  country: "CH",
};

const VALID_BODY = {
  companyId: COMPANY_ID,
  customerId: CUSTOMER_ID,
  issueDate: "2026-01-01",
  dueDate: "2026-01-31",
  currency: "CHF",
  status: "draft",
  qrReferenceType: "NON",
  items: [
    { description: "Beratung", quantity: 1, unitPrice: 100, vatRate: 8.1 },
  ],
};

/** Test için minimal Fastify uygulaması kurar. */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  // Merkezi hata işleyiciyi kaydet: rota testleri 409/404/422 gibi
  // eşlenmiş durum kodlarını doğrular.
  await app.register(errorHandlerPlugin);
  // Kimlik doğrulamayı taklit et: her isteği user1 olarak işaretle.
  // `decorate` rota kaydından ÖNCE çağrılmalıdır.
  app.decorate("authenticate", async (request: { user?: unknown }) => {
    request.user = { sub: "user1" };
  });
  await app.register(invoiceRoutes, { prefix: "/invoices" });
  return app;
}

let app: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  companyFindFirst.mockResolvedValue(COMPANY);
  customerFindFirst.mockResolvedValue(CUSTOMER);
  subscriptionFindUnique.mockResolvedValue({ plan: "pro" });
  invoiceCount.mockResolvedValue(0);
  app = await buildApp();
});

afterEach(async () => {
  await app.close();
});

describe("POST /invoices — fatura numarası çakışması", () => {
  it("P2002 çakışmasında yeni numarayla tekrar dener ve 201 döner", async () => {
    const year = new Date().getFullYear();
    // İlk denemede 0001, ikinci denemede 0002 üretilir.
    invoiceFindFirst
      .mockResolvedValueOnce({ invoiceNumber: `${year}-0001` })
      .mockResolvedValueOnce({ invoiceNumber: `${year}-0002` });

    const p2002 = Object.assign(new Error("unique"), { code: "P2002" });
    invoiceCreate
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce({ id: "inv2", invoiceNumber: `${year}-0003` });

    const res = await app.inject({
      method: "POST",
      url: "/invoices",
      payload: VALID_BODY,
    });

    expect(res.statusCode).toBe(201);
    expect(invoiceCreate).toHaveBeenCalledTimes(2);
    // İkinci denemede bir sonraki numara kullanılmalı.
    const secondCallNumber = invoiceCreate.mock.calls[1][0].data.invoiceNumber;
    expect(secondCallNumber).toBe(`${year}-0003`);
  });

  it("P2002 dışı hatayı 500 olarak döner (retry yapmaz)", async () => {
    invoiceFindFirst.mockResolvedValue(null);
    invoiceCreate.mockRejectedValue(new Error("db down"));

    const res = await app.inject({
      method: "POST",
      url: "/invoices",
      payload: VALID_BODY,
    });

    expect(res.statusCode).toBe(500);
    expect(invoiceCreate).toHaveBeenCalledTimes(1);
  });

  it("şirket bulunamazsa 404 döner", async () => {
    companyFindFirst.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/invoices",
      payload: VALID_BODY,
    });

    expect(res.statusCode).toBe(404);
    expect(invoiceCreate).not.toHaveBeenCalled();
  });
});

describe("error-handler — Prisma hata eşlemesi", () => {
  it("P2002 doğrudan fırlatılırsa 409 CONFLICT döner", async () => {
    invoiceFindFirst.mockResolvedValue(null);
    const p2002 = Object.assign(new Error("unique"), { code: "P2002" });
    // Retry tükendikten sonra rota P2002'yi yukarı taşır.
    invoiceCreate.mockRejectedValue(p2002);

    const res = await app.inject({
      method: "POST",
      url: "/invoices",
      payload: VALID_BODY,
    });

    // Retry 5 kez dener, sonra hata işleyici 409'a çevirir.
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("AppError doğru durum kodu ve kod ile döner", async () => {
    const app2 = Fastify();
    await app2.register(errorHandlerPlugin);
    app2.get("/boom", async () => {
      throw new AppError("TEAPOT", "Ben bir çaydanlığım", 418);
    });

    const res = await app2.inject({ method: "GET", url: "/boom" });

    expect(res.statusCode).toBe(418);
    expect(res.json().error).toMatchObject({
      code: "TEAPOT",
      message: "Ben bir çaydanlığım",
    });
    await app2.close();
  });
});
