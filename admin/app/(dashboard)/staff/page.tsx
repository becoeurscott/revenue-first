"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useAuth, roleLabel } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useLoad, useNotice } from "@/lib/hooks";
import type { AdminUser, Paged, Role } from "@/lib/types";
import { STAFF_ROLES } from "@/lib/types";
import { Avatar, Badge, Btn, Card, DataState, Field, Modal, Notice, fmtDate, fullName, statusTone } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function StaffPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("SUPPORT");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; role: Role; expiresAt: string; token: string } | null>(null);

  const { data, loading, error, reload } = useLoad(async () => {
    const pages = await Promise.all(STAFF_ROLES.map((r) => adminApi<Paged<AdminUser>>("/users", token, { params: { role: r, pageSize: 100 } })));
    return pages.flatMap((p) => p.data);
  }, [token]);

  const send = async () => {
    setBusy(true);
    try {
      const r = await adminApi<{ email: string; role: Role; expiresAt: string; token: string }>("/staff/invitations", token, { method: "POST", body: { email, role } });
      setResult(r);
      setEmail("");
      ok(`Invitation sent to ${r.email}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const ROLE_HELP: Record<Role, string> = {
    USER: "", SUPPORT: "Read everything, help one user at a time (notify, reset password, force logout).",
    CONTENT_MANAGER: "Support + edit paths, lessons, resources, missions, onboarding, templates and content documents.",
    ADMIN: "Content manager + suspend users, settings, feature flags, notifications, maintenance, exports, deletes.",
    SUPER_ADMIN: "Admin + invite staff, change roles, reset MFA.",
  };

  return (
    <>
      <Topbar title="Staff" subtitle="Who can sign in here, and what they can do." pill={data ? `${data.length} staff` : undefined} actions={can("SUPER_ADMIN") && <Btn solid size="sm" onClick={() => { setResult(null); setInvite(true); }}><Icon name="plus" className="w-3.5 h-3.5" /> Invite staff</Btn>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <Card pad={false}>
          <DataState loading={loading && !data} error={error} onRetry={reload} empty={data?.length === 0}>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="px-5 py-3 font-semibold">Member</th><th className="px-3 py-3 font-semibold">Role</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold text-right">Since</th></tr></thead>
              <tbody>
                {data?.map((u) => (
                  <tr key={u.id} className="border-t border-line hover:bg-sunken/60">
                    <td className="px-5 py-3"><Link href={`/users/${u.id}`} className="flex items-center gap-3"><Avatar name={fullName(u)} size={32} hue={265} /><span><span className="font-semibold text-fg block leading-tight">{fullName(u)}</span><span className="text-xs text-muted">{u.email}</span></span></Link></td>
                    <td className="px-3 py-3"><Badge tone="primary">{roleLabel(u.role)}</Badge></td>
                    <td className="px-3 py-3"><Badge tone={statusTone(u.accountStatus)} dot>{u.accountStatus.toLowerCase()}</Badge></td>
                    <td className="px-5 py-3 text-right text-muted">{fmtDate(u.createdAt, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataState>
        </Card>
        <Card title="Roles" subtitle="Each role includes the ones below it.">
          <ul className="space-y-3 text-sm">
            {[...STAFF_ROLES].reverse().map((r) => <li key={r}><p className="font-semibold text-fg">{roleLabel(r)}</p><p className="text-xs text-muted">{ROLE_HELP[r]}</p></li>)}
          </ul>
        </Card>
      </div>
      <Modal open={invite} onClose={() => setInvite(false)} title="Invite a staff member">
        {result ? (
          <div className="space-y-3 text-sm">
            <p>Invitation for <b>{result.email}</b> as <b>{roleLabel(result.role)}</b>, valid until {fmtDate(result.expiresAt)}.</p>
            <p className="text-muted">They receive an email with the acceptance link. If the email does not arrive, the token below can be sent by another channel:</p>
            <code className="block break-all bg-sunken rounded-lg p-2 font-mono text-xs">{result.token}</code>
            <Btn tone="neutral" onClick={() => setInvite(false)}>Close</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
            <Field label="Role" hint={ROLE_HELP[role]}><select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></Field>
            <div className="flex gap-2 pt-2"><Btn solid disabled={!email || busy} onClick={send}>{busy ? "Sending…" : "Send invitation"}</Btn><Btn tone="neutral" onClick={() => setInvite(false)} className="ml-auto">Cancel</Btn></div>
          </div>
        )}
      </Modal>
    </>
  );
}
