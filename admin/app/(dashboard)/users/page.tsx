"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import { useAuth, roleLabel } from "@/lib/auth";
import { adminApi, downloadAdminFile } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { AdminUser, Paged } from "@/lib/types";
import { Avatar, Badge, Btn, Card, DataState, Notice, Pagination, SearchInput, fmtDate, fullName, statusTone } from "@/components/ui";
import { Icon } from "@/components/Icon";

function UsersInner() {
  const { token, can } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const q = sp.get("q") ?? "";
  const role = sp.get("role") ?? "";
  const status = sp.get("status") ?? "";
  const page = Number(sp.get("page") ?? 1);
  const { notice, ok, fail, clear } = useNotice();
  const [exporting, setExporting] = useState(false);

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    if (k !== "page") n.delete("page");
    router.replace(`/users?${n.toString()}`);
  };

  const { data, loading, error, reload } = useLoad(
    () => adminApi<Paged<AdminUser>>("/users", token, { params: { page, pageSize: 25, q, role, status } }),
    [token, page, q, role, status],
  );

  return (
    <>
      <Topbar
        title="Users"
        subtitle="Every account: customers and staff."
        pill={data ? `${data.meta.totalItems.toLocaleString("en-US")} accounts` : undefined}
        actions={can("ADMIN") && (
          <Btn tone="neutral" size="sm" disabled={exporting} onClick={async () => { setExporting(true); try { await downloadAdminFile("/exports/users.csv", token!, "users.csv"); ok("Export downloaded"); } catch (e) { fail(e); } finally { setExporting(false); } }}>
            <Icon name="download" className="w-3.5 h-3.5" /> Export CSV
          </Btn>
        )}
      />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <Card pad={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-4">
          <SearchInput value={q} onChange={(v) => setParam("q", v)} placeholder="Name, email or id" />
          <select value={role} onChange={(e) => setParam("role", e.target.value)} className="input w-auto bg-card">
            <option value="">All roles</option>
            <option value="USER">Customers</option>
            <option value="SUPPORT">Support</option>
            <option value="CONTENT_MANAGER">Content manager</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
          <select value={status} onChange={(e) => setParam("status", e.target.value)} className="input w-auto bg-card">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </select>
          {(q || role || status) && <Btn tone="neutral" size="sm" onClick={() => router.replace("/users")}>Reset</Btn>}
        </div>
        <DataState loading={loading && !data} error={error} onRetry={reload} empty={data?.data.length === 0} emptyLabel="No users match these filters.">
          <div className="overflow-x-auto">
            <table className="data w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-5 py-2 font-semibold">User</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Time zone</th>
                  <th className="px-3 py-2 font-semibold">Joined</th>
                  <th className="px-5 py-2 font-semibold text-right">Last update</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((u) => (
                  <tr key={u.id} onClick={() => router.push(`/users/${u.id}`)} className="border-t border-line hover:bg-sunken/60 cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(u)} size={34} />
                        <div className="leading-tight">
                          <Link href={`/users/${u.id}`} className="font-semibold text-fg hover:text-primary-text">{fullName(u)}</Link>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Badge tone={u.role === "USER" ? "neutral" : "primary"}>{roleLabel(u.role)}</Badge></td>
                    <td className="px-3 py-3"><Badge tone={statusTone(u.accountStatus)} dot>{u.accountStatus.replace("_", " ").toLowerCase()}</Badge></td>
                    <td className="px-3 py-3 text-muted">{u.timeZone}</td>
                    <td className="px-3 py-3 text-muted">{fmtDate(u.createdAt, false)}</td>
                    <td className="px-5 py-3 text-muted text-right">{fmtDate(u.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5">{data && <Pagination page={data.meta.page} pageSize={data.meta.pageSize} total={data.meta.totalItems} onPageChange={(p) => setParam("page", String(p))} />}</div>
        </DataState>
      </Card>
    </>
  );
}

export default function UsersPage() {
  return <Suspense fallback={null}><UsersInner /></Suspense>;
}
