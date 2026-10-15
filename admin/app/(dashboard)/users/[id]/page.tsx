"use client";

import { use, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useAuth, roleLabel } from "@/lib/auth";
import { adminApi, downloadAdminFile, errorMessage, localApi } from "@/lib/api";
import { useDraft, useLoad, useNotice, nz } from "@/lib/hooks";
import type { AdminUser, AdminDeal, AdminPayment, AdminProspect, AuditLog, LessonProgressRow, Paged, ProgressSummary, Role } from "@/lib/types";
import { STAFF_ROLES } from "@/lib/types";
import { Avatar, Badge, Btn, Card, ConfirmDialog, DataState, Field, JsonDiff, Modal, Notice, Tabs, fmtDate, fmtMoney, fullName, statusTone } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token, can, user: me } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const [tab, setTab] = useState("profile");
  const [confirm, setConfirm] = useState<null | "suspend" | "delete" | "logout" | "mfa">(null);
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const { data: user, setData: setUser, loading, error, reload } = useLoad(() => adminApi<AdminUser>(`/users/${id}`, token), [token, id]);
  const draft = useDraft<{ firstName: string; lastName: string; email: string; timeZone: string; adminNote: string }>(
    user ? { firstName: user.firstName ?? "", lastName: user.lastName ?? "", email: user.email, timeZone: user.timeZone, adminNote: user.adminNote ?? "" } : null,
  );

  const isSelf = me?.id === id;
  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      const r = await fn();
      if (r && typeof r === "object" && "id" in (r as object)) setUser(r as AdminUser);
      ok(label);
      setConfirm(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const c = draft.changed();
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(c)) body[k] = k === "email" || k === "timeZone" ? v : nz(String(v));
    await act("Profile saved", () => adminApi<AdminUser>(`/users/${id}`, token, { method: "PATCH", body }));
  };

  return (
    <>
      <Topbar title={user ? fullName(user) : "User"} subtitle={user?.email} pill={user && <><Badge tone={statusTone(user.accountStatus)} dot>{user.accountStatus.replace("_", " ").toLowerCase()}</Badge><span>{roleLabel(user.role)}</span></>} actions={<Link href="/users" className="text-sm text-muted hover:text-fg">← All users</Link>} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <DataState loading={loading && !user} error={error} onRetry={reload} minHeight="min-h-[300px]">
        {user && draft.draft && (
          <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">
            <div className="space-y-5">
              <Card pad={false}>
                <div className="flex items-center gap-4 px-5 pt-5">
                  <Avatar name={fullName(user)} size={56} />
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-fg leading-tight">{fullName(user)}</h2>
                    <p className="text-sm text-muted">{user.email} · {user.timeZone} · joined {fmtDate(user.createdAt, false)}</p>
                  </div>
                  <code className="ml-auto text-[11px] text-faint font-mono">{user.id}</code>
                </div>
                <Tabs className="px-5 mt-4" active={tab} onChange={setTab} tabs={[{ id: "profile", label: "Profile" }, { id: "progress", label: "Progress" }, { id: "lessons", label: "Lessons" }, { id: "prospects", label: "Prospects" }, { id: "deals", label: "Deals" }, { id: "payments", label: "Payments" }, { id: "audit", label: "Audit" }]} />
                <div className="p-5">
                  {tab === "profile" && (
                    <div className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="First name"><input className="input" value={draft.draft.firstName} onChange={(e) => draft.set("firstName", e.target.value)} disabled={!can("ADMIN")} /></Field>
                        <Field label="Last name"><input className="input" value={draft.draft.lastName} onChange={(e) => draft.set("lastName", e.target.value)} disabled={!can("ADMIN")} /></Field>
                        <Field label="Email"><input className="input" type="email" value={draft.draft.email} onChange={(e) => draft.set("email", e.target.value)} disabled={!can("ADMIN")} /></Field>
                        <Field label="Time zone" hint="Mission days, streaks and check-in weeks use it."><input className="input" value={draft.draft.timeZone} onChange={(e) => draft.set("timeZone", e.target.value)} disabled={!can("ADMIN")} list="tz" /><datalist id="tz">{["Europe/Paris", "Europe/London", "America/New_York", "America/Chicago", "America/Los_Angeles", "Africa/Douala", "Africa/Abidjan", "Asia/Manila", "Asia/Dubai"].map((z) => <option key={z} value={z} />)}</datalist></Field>
                      </div>
                      <Field label="Internal note" hint="Only staff see this."><textarea className="input min-h-[90px]" value={draft.draft.adminNote} onChange={(e) => draft.set("adminNote", e.target.value)} disabled={!can("ADMIN")} /></Field>
                      {can("ADMIN") && (
                        <div className="flex items-center gap-3">
                          <Btn solid onClick={save} disabled={!draft.dirty || busy}>Save changes</Btn>
                          {draft.dirty && <><span className="text-xs text-muted">{draft.dirtyCount} unsaved change{draft.dirtyCount > 1 ? "s" : ""}</span><Btn tone="neutral" size="sm" onClick={draft.reset}>Discard</Btn></>}
                        </div>
                      )}
                    </div>
                  )}
                  {tab === "progress" && <ProgressTab id={id} />}
                  {tab === "lessons" && <LessonsTab id={id} />}
                  {tab === "prospects" && <ListTab<AdminProspect> path="/prospects" id={id} cols={[["Business", (p) => <span className="font-medium text-fg">{p.businessName}</span>], ["Contact", (p) => p.contactName ?? "—"], ["City", (p) => p.city ?? "—"], ["Status", (p) => <Badge tone={p.status === "CONVERTED" ? "success" : p.status === "NEW" ? "neutral" : "primary"}>{p.status.replace("_", " ").toLowerCase()}</Badge>], ["Last contact", (p) => fmtDate(p.lastContactedAt, false)]]} />}
                  {tab === "deals" && <ListTab<AdminDeal> path="/deals" id={id} cols={[["Client", (d) => <span className="font-medium text-fg">{d.clientName}</span>], ["Deal", (d) => d.title], ["Expected", (d) => fmtMoney(d.expectedValue)], ["Won", (d) => fmtMoney(d.wonValue)], ["Status", (d) => <Badge tone={statusTone(d.status)}>{d.status.toLowerCase()}</Badge>]]} />}
                  {tab === "payments" && <ListTab<AdminPayment> path="/payments" id={id} cols={[["Received", (p) => p.receivedOn], ["Amount", (p) => <span className="font-semibold text-fg">{fmtMoney(p.amount)}</span>], ["Source", (p) => p.source.replace("_", " ").toLowerCase()], ["Status", (p) => <Badge tone={statusTone(p.status)}>{p.status.toLowerCase()}</Badge>], ["Note", (p) => p.note ?? p.voidReason ?? "—"]]} />}
                  {tab === "audit" && <AuditTab id={id} />}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card title="Account">
                <dl className="text-sm space-y-2">
                  <div className="flex justify-between"><dt className="text-muted">Status</dt><dd><Badge tone={statusTone(user.accountStatus)} dot>{user.accountStatus.replace("_", " ").toLowerCase()}</Badge></dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Role</dt><dd className="font-medium">{roleLabel(user.role)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Updated</dt><dd>{fmtDate(user.updatedAt)}</dd></div>
                </dl>
                <div className="mt-4 grid gap-2">
                  {user.accountStatus === "SUSPENDED" ? (
                    <Btn tone="success" disabled={!can("ADMIN") || busy} onClick={() => act("User reactivated", () => adminApi(`/users/${id}/reactivate`, token, { method: "POST" }))}>Reactivate</Btn>
                  ) : (
                    <Btn tone="warning" disabled={!can("ADMIN") || isSelf || busy} onClick={() => setConfirm("suspend")} title={isSelf ? "You cannot suspend yourself" : undefined}>Suspend account</Btn>
                  )}
                  <Btn tone="neutral" disabled={!can("SUPPORT") || busy} onClick={() => setConfirm("logout")}><Icon name="logout" className="w-4 h-4" /> Force logout everywhere</Btn>
                  <Btn tone="neutral" disabled={!can("SUPPORT") || busy} onClick={() => act("Password reset email sent", () => adminApi(`/users/${id}/password-reset`, token, { method: "POST" }))}><Icon name="key" className="w-4 h-4" /> Send password reset</Btn>
                  <Btn tone="neutral" disabled={!can("SUPPORT") || busy} onClick={() => setNotify(true)}><Icon name="bell" className="w-4 h-4" /> Send a push</Btn>
                  {can("SUPER_ADMIN") && !isSelf && <Btn tone="neutral" onClick={() => setRoleOpen(true)}><Icon name="shield" className="w-4 h-4" /> Change role</Btn>}
                  {user.role !== "USER" && can("SUPER_ADMIN") && !isSelf && <Btn tone="neutral" onClick={() => setConfirm("mfa")}>Reset MFA</Btn>}
                </div>
              </Card>
              {can("ADMIN") && (
                <Card title="Data">
                  <div className="grid gap-2">
                    <Btn tone="neutral" onClick={async () => { try { await downloadAdminFile(`/users/${id}/export`, token!, `user-${id}.json`); ok("Export downloaded"); } catch (e) { fail(e); } }}><Icon name="download" className="w-4 h-4" /> Export user data</Btn>
                    <Btn tone="danger" disabled={isSelf || user.accountStatus === "DELETED"} onClick={() => setConfirm("delete")}><Icon name="trash" className="w-4 h-4" /> Anonymize & delete</Btn>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </DataState>

      <ConfirmDialog open={confirm === "suspend"} onClose={() => setConfirm(null)} busy={busy} title="Suspend this account?" body={<p>The user is signed out everywhere and cannot sign in until reactivated. Their data stays.</p>} confirmLabel="Suspend" tone="warning" onConfirm={() => act("User suspended", () => adminApi(`/users/${id}/suspend`, token, { method: "POST" }))} />
      <ConfirmDialog open={confirm === "logout"} onClose={() => setConfirm(null)} busy={busy} title="Force logout everywhere?" body={<p>All of this user's sessions and refresh tokens are revoked. They sign in again normally.</p>} confirmLabel="Log out everywhere" tone="warning" onConfirm={() => act("Sessions revoked", () => adminApi(`/users/${id}/logout-all`, token, { method: "POST" }))} />
      <ConfirmDialog open={confirm === "mfa"} onClose={() => setConfirm(null)} busy={busy} title="Reset MFA?" body={<p>The staff member enrolls a new authenticator on their next sign-in.</p>} confirmLabel="Reset MFA" tone="warning" onConfirm={() => act("MFA reset", () => adminApi(`/staff/${id}/mfa/reset`, token, { method: "POST" }))} />
      <ConfirmDialog open={confirm === "delete"} onClose={() => setConfirm(null)} busy={busy} title="Anonymize and delete this user" phrase={user?.email ?? ""} body={<><p>This is irreversible. Personal data is erased, the email is released and the account is marked deleted. Prospects, deals and payments are kept anonymized for statistics.</p></>} confirmLabel="Delete forever" onConfirm={() => act("User anonymized", () => adminApi(`/users/${id}`, token, { method: "DELETE", confirm: user?.email }))} />
      <NotifyModal open={notify} onClose={() => setNotify(false)} userId={id} onDone={() => { setNotify(false); ok("Notification sent"); }} />
      <RoleModal open={roleOpen} onClose={() => setRoleOpen(false)} current={user?.role ?? "USER"} onSave={async (role) => { await act("Role updated", () => adminApi<AdminUser>(`/users/${id}/role`, token, { method: "PATCH", body: { role } })); setRoleOpen(false); }} />
    </>
  );
}

function ProgressTab({ id }: { id: string }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<ProgressSummary>(`/progress/users/${id}`, token), [token, id]);
  return (
    <DataState loading={loading} error={error} onRetry={reload}>
      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Total XP", data.totalXp, `Level ${data.level} · next at ${data.nextLevelXp ?? "max"}`],
            ["Streak", `${data.currentStreak} d`, `longest ${data.longestStreak} · last active ${data.lastActiveOn ?? "never"}`],
            ["Lessons", data.lessonsCompleted, "completed"],
            ["Revenue", fmtMoney(data.revenue), data.firstRevenueReached ? "first revenue reached" : "no revenue yet"],
            ["Mission", data.mission ? `Day ${data.mission.currentDay}/${data.mission.durationDays}` : "—", data.mission ? `${data.mission.daysCompleted} days · ${data.mission.tasksCompleted} tasks · ${data.mission.status.toLowerCase()}` : "no active plan"],
            ["Prospects", data.prospectsContacted, `${data.prospectsReplied} replied`],
            ["Check-in", data.checkedInThisWeek ? "Done" : "Pending", "this week"],
          ].map(([l, v, h]) => (
            <div key={String(l)} className="rounded-xl border border-line bg-sunken/50 p-4">
              <p className="text-xs font-semibold text-muted">{l}</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{v}</p>
              <p className="text-[11px] text-faint mt-1">{h}</p>
            </div>
          ))}
        </div>
      )}
    </DataState>
  );
}

function LessonsTab({ id }: { id: string }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<LessonProgressRow[]>(`/users/${id}/lesson-progress`, token), [token, id]);
  return (
    <DataState loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyLabel="No lesson started yet.">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint"><th className="py-2 pr-3 font-semibold">Lesson</th><th className="py-2 pr-3 font-semibold w-48">Watched</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 font-semibold">Completed</th></tr></thead>
        <tbody>
          {data?.map((r) => (
            <tr key={r.lessonId} className="border-t border-line">
              <td className="py-2.5 pr-3"><Link href={`/lessons?id=${r.lessonId}`} className="font-medium text-fg hover:text-primary-text">{r.title}</Link></td>
              <td className="py-2.5 pr-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-sunken overflow-hidden"><div className={`h-full ${r.watchedPercent >= 50 ? "bg-success" : "bg-warning"}`} style={{ width: `${r.watchedPercent}%` }} /></div><span className="text-xs tabular-nums w-9 text-right">{r.watchedPercent}%</span></div></td>
              <td className="py-2.5 pr-3"><Badge tone={statusTone(r.status)}>{r.status.replace("_", " ").toLowerCase()}</Badge></td>
              <td className="py-2.5 text-muted">{fmtDate(r.completedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataState>
  );
}

function ListTab<T extends { id: string }>({ path, id, cols }: { path: string; id: string; cols: [string, (row: T) => React.ReactNode][] }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<Paged<T>>(path, token, { params: { userId: id, pageSize: 50 } }), [token, id, path]);
  return (
    <DataState loading={loading} error={error} onRetry={reload} empty={data?.data.length === 0} emptyLabel="Nothing recorded yet.">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint">{cols.map(([h]) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{data?.data.map((row) => <tr key={row.id} className="border-t border-line">{cols.map(([h, render]) => <td key={h} className="py-2.5 pr-3 text-muted">{render(row)}</td>)}</tr>)}</tbody>
      </table>
    </DataState>
  );
}

function AuditTab({ id }: { id: string }) {
  const { token } = useAuth();
  const [open, setOpen] = useState<AuditLog | null>(null);
  const { data, loading, error, reload } = useLoad(() => adminApi<Paged<AuditLog>>("/audit-logs", token, { params: { targetId: id, pageSize: 50 } }), [token, id]);
  return (
    <DataState loading={loading} error={error} onRetry={reload} empty={data?.data.length === 0} emptyLabel="No staff action on this user yet.">
      <ul className="divide-y divide-line">
        {data?.data.map((a) => (
          <li key={a.id} className="py-2.5 flex items-center gap-3 text-sm">
            <Badge tone="primary">{a.action}</Badge>
            <span className="text-muted">{fmtDate(a.occurredAt)}</span>
            <span className="text-faint text-xs">by {a.actorRole ? roleLabel(a.actorRole) : "system"}</span>
            {a.metadata && Object.keys(a.metadata).length > 0 && <button onClick={() => setOpen(a)} className="ml-auto text-xs text-primary-text cursor-pointer">details</button>}
          </li>
        ))}
      </ul>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.action ?? ""} wide>
        {open && <JsonDiff before={(open.metadata as { before?: unknown }).before ?? null} after={(open.metadata as { after?: unknown }).after ?? open.metadata} />}
      </Modal>
    </DataState>
  );
}

function NotifyModal({ open, onClose, userId, onDone }: { open: boolean; onClose: () => void; userId: string; onDone: () => void }) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Send a push notification">
      <div className="space-y-3">
        <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Message"><textarea className="input min-h-[80px]" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Field label="Deep link" hint="Optional in-app route, e.g. /plan/day/7"><input className="input" value={link} onChange={(e) => setLink(e.target.value)} /></Field>
        {err && <Notice kind="danger">{err}</Notice>}
        <div className="flex gap-2 pt-2"><Btn solid disabled={!title || !body || busy} onClick={async () => { setBusy(true); setErr(""); try { const r = await localApi<{ status: string; detail?: string }>("/push", token, undefined, { method: "POST", body: { audience: "user", userId, title, body, link: nz(link) ?? "/home" } }); if (r.status === "no_recipients") throw new Error(r.detail ?? "This user has no device with notifications turned on."); setTitle(""); setBody(""); setLink(""); onDone(); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); } }}>Send</Btn><Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn></div>
      </div>
    </Modal>
  );
}

function RoleModal({ open, onClose, current, onSave }: { open: boolean; onClose: () => void; current: Role; onSave: (r: Role) => Promise<void> }) {
  const [role, setRole] = useState<Role>(current);
  return (
    <Modal open={open} onClose={onClose} title="Change role">
      <p className="text-sm text-muted mb-3">Staff roles require MFA at sign-in. Picking <b>User</b> removes staff access.</p>
      <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        <option value="USER">User (customer)</option>
        {STAFF_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
      </select>
      <div className="flex gap-2 mt-5"><Btn solid disabled={role === current} onClick={() => onSave(role)}>Save role</Btn><Btn tone="neutral" onClick={onClose} className="ml-auto">Cancel</Btn></div>
    </Modal>
  );
}
