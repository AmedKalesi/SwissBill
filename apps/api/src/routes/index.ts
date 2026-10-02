/**
 * Tüm API rotalarını kaydeder.
 */
import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.routes.js";
import { companyRoutes } from "./company.routes.js";
import { customerRoutes } from "./customer.routes.js";
import { invoiceRoutes } from "./invoice.routes.js";
import { projectRoutes } from "./project.routes.js";
import { billingRoutes } from "./billing.routes.js";
import { reportRoutes } from "./report.routes.js";
import { publicRoutes } from "./public.routes.js";
import { recurringRoutes } from "./recurring.routes.js";
import { quoteRoutes } from "./quote.routes.js";
import { expenseRoutes } from "./expense.routes.js";
import { portalRoutes, publicPortalRoutes } from "./portal.routes.js";
import { cronRoutes } from "./cron.routes.js";
import { accountingRoutes } from "./accounting.routes.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(publicRoutes, { prefix: "/public" });
  await app.register(publicPortalRoutes, { prefix: "/public/portal" });
  await app.register(cronRoutes, { prefix: "/cron" });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(companyRoutes, { prefix: "/companies" });
  // Geriye dönük uyumluluk: web istemcisi tekil `/company` yolunu kullanır.
  await app.register(companyRoutes, { prefix: "/company" });
  await app.register(customerRoutes, { prefix: "/customers" });
  await app.register(invoiceRoutes, { prefix: "/invoices" });
  await app.register(projectRoutes, { prefix: "/projects" });
  await app.register(recurringRoutes, { prefix: "/recurring-invoices" });
  await app.register(quoteRoutes, { prefix: "/quotes" });
  await app.register(expenseRoutes, { prefix: "/expenses" });
  await app.register(portalRoutes, { prefix: "/portals" });
  await app.register(accountingRoutes, { prefix: "/accounting" });
  await app.register(billingRoutes, { prefix: "/billing" });
  await app.register(reportRoutes, { prefix: "/reports" });
}
