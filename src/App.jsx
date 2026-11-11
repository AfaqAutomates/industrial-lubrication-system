
import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import Dashboard from "./Dashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const idleSignOutRef = useRef(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) setNotice(error.message);
      setSession(data?.session ?? null);
      setChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const idleEnded = idleSignOutRef.current;
      setNotice(idleEnded ? "You were signed out after 15 minutes without activity." : "");
      idleSignOutRef.current = false;
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !profile?.is_active || !profile?.role) return undefined;
    const idleLimitMs = 15 * 60 * 1000;
    let lastActivityAt = Date.now();
    let timer;
    let signingOut = false;
    const signOutWhenIdle = async () => {
      if (signingOut) return;
      if (Date.now() - lastActivityAt < idleLimitMs) {
        schedule();
        return;
      }
      signingOut = true;
      idleSignOutRef.current = true;
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: "local" });
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(signOutWhenIdle, Math.max(0, idleLimitMs - (Date.now() - lastActivityAt)));
    };
    const recordActivity = () => {
      if (Date.now() - lastActivityAt >= idleLimitMs) {
        void signOutWhenIdle();
        return;
      }
      lastActivityAt = Date.now();
      schedule();
    };
    const checkOnReturn = () => {
      if (document.visibilityState === "visible") void signOutWhenIdle();
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll", "wheel", "mousemove"];
    events.forEach((name) => window.addEventListener(name, recordActivity, { passive: true }));
    document.addEventListener("visibilitychange", checkOnReturn);
    schedule();
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, recordActivity));
      document.removeEventListener("visibilitychange", checkOnReturn);
    };
  }, [session, profile]);

  useEffect(() => {
    let active = true;

    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      return () => {
        active = false;
      };
    }

    async function loadProfile() {
      setProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role, is_active, module_permissions")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      if (error) {
        setProfile(null);
        setNotice(
          "Unable to load your access profile. Please contact the administrator."
        );
      } else {
        setProfile(data);
        if (!data.is_active || !data.role) {
          setNotice(
            "Your account does not have application access enabled yet."
          );
        } else {
          setNotice("");
        }
      }

      setProfileLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session]);

  async function handleLogin(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) setNotice(error.message);

    setSubmitting(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) setNotice("Unable to sign out. Please try again.");
    else {
      setPassword("");
      setNotice("");
    }
  }

  if (checking || (session && profileLoading)) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h2>Industrial Lubrication</h2>
          <p>Checking secure access…</p>
        </div>
      </main>
    );
  }

  if (session && profile?.is_active && profile?.role) {
    return (
      <div className="authenticated-app">
        <header className="auth-topbar">
          <div>
            <strong>{profile.full_name || "Administrator"}</strong>
            <span>{profile.role === "master_admin" ? "Master Administrator" : "Authorized User"}</span>
          </div>
          <button
            className="auth-logout"
            onClick={handleLogout}
            type="button"
          >
            Sign out
          </button>
        </header>
        <Dashboard profile={profile} />
      </div>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">L</div>
          <p className="auth-eyebrow">PLANT RELIABILITY PLATFORM</p>
          <h1>Industrial Lubrication</h1>
          <p className="auth-subtitle">
            Sign in to manage lubrication and equipment reliability.
          </p>
        </div>

        {notice && (
          <div className="auth-notice" role="alert">
            {notice}
          </div>
        )}

        {!session && (
          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in securely"}
            </button>
          </form>
        )}

        {session && !profileLoading && (
          <button
            className="auth-submit"
            type="button"
            onClick={handleLogout}
          >
            Sign out and try again
          </button>
        )}

        <p className="auth-footer">
          Access is restricted to authorized users. Public registration
          is disabled.
        </p>
      </section>
    </main>
  );
}
