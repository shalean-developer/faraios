import { NextResponse } from "next/server";
import { markHostingInvoicePaid } from "@/lib/services/hosting-automation";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      paid_at?: string;
      metadata?: {
        invoiceId?: string;
        hostingInvoiceId?: string;
      };
    };
  };

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const invoiceId =
    event.data?.metadata?.invoiceId ?? event.data?.metadata?.hostingInvoiceId;
  const reference = event.data?.reference;
  const amount = event.data?.amount;
  const paidAt = event.data?.paid_at;

  if (!invoiceId || !reference || amount == null || !paidAt) {
    return NextResponse.json({ ok: false, error: "Missing payment data." }, { status: 400 });
  }

  const result = await markHostingInvoicePaid({
    invoiceId,
    paystackReference: reference,
    paidAt: new Date(paidAt),
    paidAmount: amount,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, orderId: result.orderId });
}
