import { DashboardPanel } from "@/components/dashboard/dashboard-panel";

export const metadata = { title: "Solver desk — FirmPay" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Solver desk</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transaction-cost analysis for every locked quote — the same metrics
          the industry leaves unmeasured.
        </p>
      </div>
      <DashboardPanel />
    </div>
  );
}
