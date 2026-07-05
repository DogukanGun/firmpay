import { ReceiptPanel } from "@/components/receipt/receipt-panel";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-center text-xl font-semibold tracking-tight">Receipt</h1>
      <ReceiptPanel orderId={orderId} />
    </div>
  );
}
