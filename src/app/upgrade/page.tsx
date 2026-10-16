"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Crown, Download, Gift, Headphones, Infinity as InfinityIcon, ShieldCheck, Smartphone, Sparkles, Trophy } from 'lucide-react';
import { PayPalPreload, PayPalSubscribeButton } from '@/components/subscription/PayPalCheckout';
import { useAuth } from '@/context/AuthContext';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { sessionFetch } from '@/utils/userSession';

const BENEFITS = [
  { icon: <Headphones size={22} />, title: 'No ads', text: 'Music plays without interruptions, in the player and in the lists.' },
  { icon: <Download size={22} />, title: 'Offline downloads', text: 'Save tracks to your device and practise anywhere, even without internet.' },
  { icon: <Smartphone size={22} />, title: 'Plays with the screen off', text: 'Keep the music going while the phone is locked or you use other apps.' },
  { icon: <Trophy size={22} />, title: 'Final Mode, uninterrupted', text: 'Run a whole competition program with no ad breaks between dances.' },
];

const FAQ = [
  { q: 'Can I cancel any time?', a: 'Yes. Cancel here whenever you like. You keep Premium until the end of the period you already paid for.' },
  { q: 'How do I pay?', a: 'Securely with PayPal, $1.99 per month. We never see your card details.' },
  { q: 'Can I get Premium for free?', a: 'Yes. Invite a friend (both of you get a month) or use a promo code on the Earn Premium page.' },
];

/** What kind of Premium the account has, from its subscription id */
function planOf(subscriptionId?: string | null): { kind: 'paypal' | 'gift' | 'promo' | 'invite' | 'owner' | 'other'; label: string } {
  const id = subscriptionId || '';
  if (id.startsWith('I-')) return { kind: 'paypal', label: 'PayPal · $1.99 / month' };
  if (id.startsWith('PROMO_')) return { kind: 'promo', label: 'Promo code' };
  if (id.startsWith('REFERRAL_')) return { kind: 'invite', label: 'Invite reward' };
  if (id.startsWith('LIFETIME_')) return { kind: 'owner', label: 'Lifetime' };
  if (id.startsWith('MANUAL_')) return { kind: 'gift', label: 'Gift from 4and.one' };
  return { kind: 'other', label: 'Premium' };
}

export default function UpgradePage() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium, activatePremium, cancelSubscription } = useAuth();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);

  const hasPremium = isPremium || success;
  const plan = planOf(user?.subscription_id);

  // When the paid period ends (shown on the status card)
  useEffect(() => {
    if (!hasPremium || !user?.id) return;
    let alive = true;
    sessionFetch(`/api/user/premium?tid=${encodeURIComponent(String(user.id))}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d?.premiumUntil) setPremiumUntil(d.premiumUntil); })
      .catch(() => {});
    return () => { alive = false; };
  }, [hasPremium, user?.id]);

  const untilText = premiumUntil
    ? new Date(premiumUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const doCancel = async () => {
    setCancelling(true);
    setErrorMsg(null);
    try {
      await cancelSubscription();
      setShowCancelConfirm(false);
      setSuccess(false);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Cancellation failed.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="up">
      <div className="up-glow g1" /><div className="up-glow g2" />

      <header className="up-top">
        <button type="button" className="up-back" onClick={() => router.back()}>
          <ArrowLeft size={18} /><span>Back</span>
        </button>
      </header>

      <main className="up-main">
        {/* Hero */}
        <section className="up-hero">
          <span className="up-pill"><Crown size={14} /> 4and.one Premium</span>
          <h1>Dance music without limits</h1>
          <p>No ads, offline downloads and uninterrupted Final Mode. From $1.99 a month, cancel any time.</p>
        </section>

        <div className="up-grid">
          {/* Plan / status card */}
          <section className="up-card">
            <PayPalPreload enabled={isAuthenticated && !isPremium}>
              {!isAuthenticated ? (
                <div className="up-state">
                  <h2>Sign in to continue</h2>
                  <p>Use Telegram to sign in. Your Premium is linked to your account.</p>
                  <div className="up-login"><TelegramLogin /></div>
                </div>
              ) : hasPremium ? (
                <div className="up-state">
                  <div className="up-badge-ok"><ShieldCheck size={22} /> Premium is active</div>
                  <h2>Thank you for supporting 4and.one</h2>
                  <dl className="up-facts">
                    <div><dt>Plan</dt><dd>{plan.label}</dd></div>
                    {plan.kind !== 'owner' && (
                      <div><dt>{plan.kind === 'paypal' ? 'Renews / paid until' : 'Valid until'}</dt><dd>{untilText || (plan.kind === 'gift' ? 'No end date' : '—')}</dd></div>
                    )}
                  </dl>
                  {errorMsg && <div className="up-error" role="alert">{errorMsg}</div>}
                  <Link href="/library" className="up-btn primary">Listen now</Link>

                  {plan.kind === 'paypal' && (
                    !showCancelConfirm ? (
                      <button type="button" className="up-btn ghost" onClick={() => setShowCancelConfirm(true)}>Cancel subscription</button>
                    ) : (
                      <div className="up-cancel">
                        <p>Cancel recurring billing? You keep Premium until the end of the period you have already paid for.</p>
                        <div className="up-cancel-row">
                          <button type="button" className="up-btn danger" disabled={cancelling} onClick={doCancel}>{cancelling ? 'Cancelling…' : 'Yes, cancel'}</button>
                          <button type="button" className="up-btn ghost" disabled={cancelling} onClick={() => setShowCancelConfirm(false)}>Keep Premium</button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="up-state">
                  <div className="up-price"><span className="amt">$1.99</span><span className="per">/ month</span></div>
                  <ul className="up-includes">
                    {BENEFITS.map(b => <li key={b.title}><Check size={16} /> {b.title}</li>)}
                  </ul>
                  {!showPayment ? (
                    <button type="button" className="up-btn primary" onClick={() => setShowPayment(true)}>Get Premium</button>
                  ) : (
                    <div className="up-pay">
                      <p className="up-as">Signed in as <strong>@{user?.username || user?.first_name}</strong></p>
                      {errorMsg && <div className="up-error" role="alert">{errorMsg}</div>}
                      <PayPalSubscribeButton
                        color="gold"
                        height={52}
                        onApproved={async (id) => { await activatePremium(id); setSuccess(true); }}
                        onError={setErrorMsg}
                      />
                    </div>
                  )}
                  <p className="up-fine">Recurring billing through PayPal. Cancel any time.</p>
                </div>
              )}
            </PayPalPreload>
          </section>

          {/* Benefits */}
          <section className="up-benefits" aria-label="What Premium includes">
            {BENEFITS.map(b => (
              <article key={b.title} className="up-benefit">
                <span className="ic">{b.icon}</span>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </article>
            ))}
          </section>
        </div>

        {/* Free route */}
        {!hasPremium && (
          <Link href="/earn" className="up-free">
            <span className="ic"><Gift size={22} /></span>
            <span className="tx"><b>Want it for free?</b><small>Invite a friend and you both get a month of Premium, or use a promo code.</small></span>
            <Sparkles size={18} className="go" />
          </Link>
        )}

        {/* Questions */}
        <section className="up-faq" aria-label="Questions">
          <h2><InfinityIcon size={18} /> Good to know</h2>
          {FAQ.map(f => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </main>

      <style jsx>{`
        .up { position: relative; min-height: 100vh; background: #050506; color: #fff; overflow-x: hidden; padding-bottom: 140px; }
        .up-glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; opacity: 0.8; }
        .up-glow.g1 { top: -120px; left: -8%; width: 560px; height: 560px; background: radial-gradient(circle, rgba(16,185,129,0.38), rgba(5,5,6,0) 70%); }
        .up-glow.g2 { top: -60px; right: -8%; width: 560px; height: 560px; background: radial-gradient(circle, rgba(168,85,247,0.30), rgba(5,5,6,0) 70%); }
        .up-top { position: relative; z-index: 20; padding: 14px 24px; }
        .up-back { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
        .up-back:hover { background: rgba(255,255,255,0.16); }
        .up-main { position: relative; z-index: 5; width: 100%; max-width: 1080px; margin: 0 auto; padding: 24px 24px 0; }

        .up-hero { text-align: center; padding: 28px 0 34px; }
        .up-pill { display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 999px; background: rgba(16,185,129,0.14); border: 1px solid rgba(16,185,129,0.35); color: #34d399; font-size: 12.5px; font-weight: 800; letter-spacing: 0.4px; }
        .up-hero h1 { margin: 18px auto 12px; max-width: 760px; font-size: clamp(32px, 5.4vw, 56px); line-height: 1.06; font-weight: 900; letter-spacing: -1.4px; }
        .up-hero p { margin: 0 auto; max-width: 560px; font-size: clamp(15px, 2vw, 18px); line-height: 1.55; color: #a1a1aa; }

        .up-grid { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 22px; align-items: start; }
        .up-card { border-radius: 24px; padding: 28px; background: linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 60px -24px rgba(0,0,0,0.7); }
        .up-state { display: flex; flex-direction: column; gap: 16px; text-align: left; }
        .up-state h2 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.4px; }
        .up-state p { margin: 0; color: #a1a1aa; font-size: 14.5px; line-height: 1.55; }
        .up-login { display: flex; justify-content: flex-start; padding-top: 4px; }

        .up-price { display: flex; align-items: baseline; gap: 8px; }
        .up-price .amt { font-size: 54px; font-weight: 900; letter-spacing: -2px; line-height: 1; }
        .up-price .per { font-size: 17px; color: #a1a1aa; font-weight: 600; }
        .up-includes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .up-includes li { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: #e4e4e7; }
        .up-includes li :global(svg) { color: #10b981; flex-shrink: 0; }
        .up-fine { text-align: center; font-size: 12.5px !important; color: #71717a !important; }

        .up :global(.up-btn) { display: flex; align-items: center; justify-content: center; width: 100%; height: 54px; border-radius: 999px; border: none; font-size: 16px; font-weight: 800; cursor: pointer; text-decoration: none; transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease; }
        .up :global(.up-btn:active) { transform: scale(0.98); }
        .up :global(.up-btn:disabled) { opacity: 0.6; cursor: default; }
        .up :global(.up-btn.primary) { background: #fff; color: #000; box-shadow: 0 10px 30px -10px rgba(255,255,255,0.45); }
        .up :global(.up-btn.primary:hover) { background: #f1f1f1; transform: translateY(-1px); }
        .up :global(.up-btn.ghost) { background: rgba(255,255,255,0.07); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.14); height: 48px; font-size: 14.5px; }
        .up :global(.up-btn.ghost:hover) { background: rgba(255,255,255,0.13); }
        .up :global(.up-btn.danger) { background: rgba(239,68,68,0.16); color: #fca5a5; border: 1px solid rgba(239,68,68,0.4); height: 48px; font-size: 14.5px; }
        .up :global(.up-btn.danger:hover) { background: rgba(239,68,68,0.26); }

        .up-pay { display: flex; flex-direction: column; gap: 12px; }
        .up-as { font-size: 13.5px !important; }
        .up-error { padding: 10px 14px; border-radius: 12px; background: rgba(239,68,68,0.12); color: #fca5a5; font-size: 14px; }

        .up-badge-ok { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; background: rgba(16,185,129,0.16); color: #34d399; font-size: 13.5px; font-weight: 800; }
        .up-facts { margin: 0; display: grid; gap: 1px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.09); }
        .up-facts > div { display: flex; justify-content: space-between; gap: 16px; padding: 13px 16px; background: #0b0b0d; font-size: 14.5px; }
        .up-facts dt { color: #8b8b94; }
        .up-facts dd { margin: 0; font-weight: 700; text-align: right; }
        .up-cancel { padding: 16px; border-radius: 16px; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.25); display: flex; flex-direction: column; gap: 12px; }
        .up-cancel p { font-size: 14px !important; color: #e4e4e7 !important; }
        .up-cancel-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .up-benefits { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .up-benefit { padding: 22px; border-radius: 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
        .up-benefit .ic { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.14); color: #34d399; margin-bottom: 14px; }
        .up-benefit h3 { margin: 0 0 6px; font-size: 17px; font-weight: 800; }
        .up-benefit p { margin: 0; font-size: 14px; line-height: 1.55; color: #a1a1aa; }

        .up :global(.up-free) { display: flex; align-items: center; gap: 16px; margin-top: 22px; padding: 18px 22px; border-radius: 20px; text-decoration: none; color: #fff; background: linear-gradient(90deg, rgba(168,85,247,0.18), rgba(236,72,153,0.12)); border: 1px solid rgba(168,85,247,0.35); }
        .up :global(.up-free:hover) { border-color: rgba(168,85,247,0.6); }
        .up :global(.up-free .ic) { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: rgba(168,85,247,0.22); color: #d8b4fe; flex-shrink: 0; }
        .up :global(.up-free .tx) { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .up :global(.up-free .tx b) { font-size: 16px; font-weight: 800; }
        .up :global(.up-free .tx small) { font-size: 13.5px; color: #c4b5fd; line-height: 1.45; }
        .up :global(.up-free .go) { color: #d8b4fe; flex-shrink: 0; }

        .up-faq { margin-top: 36px; max-width: 760px; margin-left: auto; margin-right: auto; }
        .up-faq h2 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 18px; font-weight: 800; }
        .up-faq details { border-bottom: 1px solid rgba(255,255,255,0.09); }
        .up-faq summary { list-style: none; cursor: pointer; padding: 16px 4px; font-size: 15.5px; font-weight: 700; display: flex; justify-content: space-between; gap: 12px; }
        .up-faq summary::-webkit-details-marker { display: none; }
        .up-faq summary::after { content: '+'; color: #71717a; font-size: 22px; line-height: 1; }
        .up-faq details[open] summary::after { content: '–'; }
        .up-faq details p { margin: 0 0 16px; padding: 0 4px; font-size: 14.5px; line-height: 1.6; color: #a1a1aa; }

        @media (max-width: 900px) {
          .up-grid { grid-template-columns: 1fr; }
          .up-card { order: 1; }
          .up-benefits { order: 2; }
        }
        @media (max-width: 560px) {
          .up-main { padding: 12px 16px 0; }
          .up-top { padding: 12px 16px; }
          .up-hero { padding: 14px 0 24px; }
          .up-card { padding: 22px 18px; border-radius: 22px; }
          .up-benefits { grid-template-columns: 1fr; gap: 10px; }
          .up-benefit { padding: 18px; display: grid; grid-template-columns: 44px 1fr; column-gap: 14px; }
          .up-benefit .ic { grid-row: 1 / span 2; margin-bottom: 0; }
          .up-benefit h3 { margin-bottom: 2px; }
          .up-price .amt { font-size: 46px; }
        }
      `}</style>
    </div>
  );
}
