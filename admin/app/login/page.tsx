"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api";
import { Btn, Field } from "@/components/ui";

export default function LoginPage() {
  const { login, verifyMfa, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/");
  }, [authLoading, user, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mfaToken) {
        await verifyMfa(mfaToken, code.trim());
      } else {
        const r = await login(email.trim(), password);
        if (r.kind === "mfa") {
          setMfaToken(r.mfaToken);
          setBusy(false);
          return;
        }
      }
      router.push("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="card p-8">
          <div className="text-center mb-7">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet text-white mb-4 shadow-[0_10px_24px_-8px_rgba(124,58,237,.6)]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4l4 11 4-11h4l-6 16h-4L4 4z" /></svg>
            </span>
            <h1 className="text-2xl font-bold text-fg tracking-tight">Vaulten Admin</h1>
            <p className="text-sm text-muted mt-1">{mfaToken ? "Enter the 6-digit code from your authenticator" : "Staff access only"}</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mfaToken ? (
              <Field label="Authenticator code" hint="A recovery code works too.">
                <input value={code} onChange={(e) => setCode(e.target.value)} className="input text-center text-lg tracking-[0.3em] font-mono" placeholder="000000" autoFocus inputMode="numeric" required />
              </Field>
            ) : (
              <>
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@vaulten.app" required autoFocus />
                </Field>
                <Field label="Password">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required />
                </Field>
              </>
            )}
            {error && <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-2.5">{error}</p>}
            <Btn type="submit" solid disabled={busy} className="w-full justify-center py-2.5">{busy ? "Signing in…" : mfaToken ? "Verify" : "Sign in"}</Btn>
            {mfaToken && (
              <button type="button" onClick={() => { setMfaToken(null); setCode(""); setError(""); }} className="w-full text-xs text-muted hover:text-fg cursor-pointer">Back</button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
