"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import { formatZar } from "@/lib/data/pricing";
import {
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { AdminPlatformRevenueData } from "@/types/admin";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="mb-0.5 text-xs font-bold text-white">{label}</p>
      <p className="text-xs font-semibold text-violet-300">{formatZar(payload[0]!.value)}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accent: string;
}) {
  return (
    <div className={riseStatCardClassName}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <Sparkles className="h-3.5 w-3.5 text-gray-200" />
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-gray-500">{label}</p>
      <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${accent} opacity-50`} />
    </div>
  );
}

const STATUS_STYLES = {
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  failed: "border-red-100 bg-red-50 text-red-700",
  pending: "border-amber-100 bg-amber-50 text-amber-700",
};

export function FaraiAdminRevenue({ data }: { data: AdminPlatformRevenueData }) {
  return (
    <AdminPageShell
      title="Revenue"
      description="Platform subscriptions and hosting payments"
      actions={<AdminActivityBellLink />}
    >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="space-y-5"
        >
          <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="MRR"
              value={formatZar(data.mrr)}
              icon={CircleDollarSign}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              accent="from-emerald-400 to-teal-400"
            />
            <StatCard
              label="ARR"
              value={formatZar(data.arr)}
              icon={TrendingUp}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              accent="from-violet-400 to-purple-400"
            />
            <StatCard
              label="Active Subscriptions"
              value={String(data.activeSubscriptions)}
              icon={CheckCircle2}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              accent="from-indigo-400 to-blue-400"
            />
            <StatCard
              label="ARPA"
              value={formatZar(data.arpa)}
              icon={CreditCard}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              accent="from-sky-400 to-blue-400"
            />
          </motion.div>

          <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Successful Payments"
              value={String(data.successfulPayments)}
              icon={CheckCircle2}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              accent="from-emerald-400 to-green-400"
            />
            <StatCard
              label="Failed Payments"
              value={String(data.failedPayments)}
              icon={XCircle}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              accent="from-red-400 to-rose-400"
            />
            <StatCard
              label="Churn Rate"
              value={`${data.churnRatePercent}%`}
              icon={TrendingUp}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              accent="from-amber-400 to-orange-400"
            />
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-2">
            <motion.div
              variants={fadeUp}
              className={riseStatCardClassName}
            >
              <h2 className="text-sm font-bold text-gray-900">Monthly revenue</h2>
              <p className="mt-0.5 text-xs text-gray-400">Successful hosting payments</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className={riseStatCardClassName}
            >
              <h2 className="text-sm font-bold text-gray-900">Weekly revenue</h2>
              <p className="mt-0.5 text-xs text-gray-400">Last 8 weeks</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className={riseTableClassName}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Recent transactions</h2>
                <p className="mt-0.5 text-xs text-gray-400">Hosting payments across all businesses</p>
              </div>
            </div>
            {data.transactions.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">No payments recorded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className={riseTableHeadRowClassName}>
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Business
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-50 last:border-b-0">
                        <td className="px-6 py-3.5 text-xs font-semibold text-gray-900">
                          {tx.businessName}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600">{tx.plan}</td>
                        <td className="px-4 py-3.5 text-xs font-bold text-gray-900">
                          {formatZar(tx.amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold capitalize ${STATUS_STYLES[tx.status]}`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">{tx.date}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`${ADMIN_BUSINESSES_PATH}/${tx.companyId}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            View
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
    </AdminPageShell>
  );
}
