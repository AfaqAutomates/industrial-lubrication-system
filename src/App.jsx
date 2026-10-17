
import { useEffect, useState } from "react";
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
      setNotice("");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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
        .select("full_name, role, is_active")
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
        if (!data.is_active || data.role !== "master_admin") {
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

  if (
    session &&
    profile?.is_active &&
    profile?.role === "master_admin"
  ) {
    return (
      <div className="authenticated-app">
        <header className="auth-topbar">
          <div>
            <strong>{profile.full_name || "Administrator"}</strong>
            <span>Master Administrator</span>
          </div>
          <button
            className="auth-logout"
            onClick={handleLogout}
            type="button"
          >
            Sign out
          </button>
        </header>
        <Dashboard />
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
