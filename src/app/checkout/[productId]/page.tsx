import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct } from "@/lib/products";
import { CheckoutPanel } from "@/components/checkout/checkout-panel";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = getProduct(productId);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to store
      </Link>
      <CheckoutPanel product={product} />
    </div>
  );
}
