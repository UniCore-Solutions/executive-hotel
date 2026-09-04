'use client';

/** Guest account — port of account.html + account.js (ACC-1/3 · ANA-1). */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useModal } from '@/context/ModalContext';
import { reservations, type BackendReservation } from '@/services/reservations';
import { image, IMG_FALLBACK } from '@/services/availability';
import { fromISODate, fmtShort, nightsBetween } from '@/lib/dates';
import { useCurrency } from '@/hooks/useCurrency';
import ConsentDialog from '@/components/layout/ConsentDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PhoneField } from '@/components/ui/PhoneField';
import { validPhone } from '@/lib/validation';
import GoogleButton from '@/components/account/GoogleButton';
import OrDivider from '@/components/account/OrDivider';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  state_invalid: 'That Google sign-in link expired or was already used — please try again.',
  provider_error: 'We could not reach Google right now — please try again in a moment.',
  account_conflict:
    'That Google account cannot be used to sign in here — try signing in with your password instead.',
  session_failed: 'Something went wrong finishing your Google sign-in — please try again.',
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NAME_RE = /^[A-Za-zÀ-ÿ' -]+$/;

export default function AccountFlow() {
  const { session, login, register, verifyRegistration, resendRegistrationOtp, logout, updateProfile } =
    useSession();
  const { toast } = useToast();
  const { open } = useModal();
  const { fmt } = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginLabel, setLoginLabel] = useState('Sign in');
  const [authMsg, setAuthMsg] = useState<{ text: string; cls: string }>({ text: '', cls: '' });

  // Surfaces a failed Google sign-in redirected back from
  // /account/oauth-callback (?error=<code>) — see AuthRestController's
  // closed OAuthErrorCode set. Derived directly from the URL each render
  // (no state needed); the effect below only strips the param afterward so
  // a refresh doesn't re-show it.
  const oauthErrorParam = searchParams.get('error');
  const oauthMsg = oauthErrorParam
    ? {
        text: OAUTH_ERROR_MESSAGES[oauthErrorParam] ?? 'Something went wrong signing you in with Google.',
        cls: 'text-clay',
      }
    : null;

  useEffect(() => {
    if (oauthErrorParam) {
      router.replace('/account');
    }
  }, [oauthErrorParam, router]);

  const [loginFields, setLoginFields] = useState({ email: '', password: '' });
  const [loginErrs, setLoginErrs] = useState({ email: '', password: '' });

  const [regFields, setRegFields] = useState({
    first: '',
    last: '',
    email: '',
    pass: '',
    pass2: '',
  });
  const [regErrs, setRegErrs] = useState({ first: '', last: '', email: '', pass: '', pass2: '' });
  const [regBusy, setRegBusy] = useState(false);
  const [regLabel, setRegLabel] = useState('Create account');
  const [regMsg, setRegMsg] = useState<{ text: string; cls: string }>({ text: '', cls: '' });

  // Registration is OTP-gated: register() only sends a code, the account
  // stays unusable until regOtp confirms it — pendingRegister holds the
  // email the code was sent to, reused when the guest submits it.
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [pendingRegister, setPendingRegister] = useState<{ email: string } | null>(null);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regOtpBusy, setRegOtpBusy] = useState(false);
  const [regOtpMsg, setRegOtpMsg] = useState<{ text: string; cls: string }>({ text: '', cls: '' });

  const [bookings, setBookings] = useState<BackendReservation[]>([]);

  useEffect(() => {
    if (session) {
      let alive = true;
      reservations
        .list()
        .then((list) => alive && setBookings(list))
        .catch(() => alive && setBookings([]));
      return () => {
        alive = false;
      };
    }
  }, [session]);

  const [profileFields, setProfileFields] = useState({ first: '', last: '', phone: '' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; cls: string }>({ text: '', cls: '' });

  // Keep the profile form in sync with the session — it starts null while
  // fetchSession() resolves on mount, then populates. Adjusted during render
  // (not an effect) per https://react.dev/learn/you-might-not-need-an-effect
  // to avoid a redundant extra render pass.
  const [syncedSession, setSyncedSession] = useState<typeof session>(null);
  if (session !== syncedSession) {
    setSyncedSession(session);
    if (session) {
      setProfileFields({
        first: session.firstName ?? '',
        last: session.lastName ?? '',
        phone: session.phone ?? '',
      });
    }
  }

  const doSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg({ text: '', cls: '' });
    if (profileFields.phone.trim() && !validPhone(profileFields.phone.trim())) {
      setProfileMsg({ text: 'Enter a valid phone number.', cls: 'text-clay' });
      return;
    }
    setProfileBusy(true);
    const out = await updateProfile({
      firstName: profileFields.first.trim() || undefined,
      lastName: profileFields.last.trim() || undefined,
      phone: profileFields.phone.trim(),
    });
    setProfileBusy(false);
    if (!out.ok) {
      setProfileMsg({ text: out.message ?? 'Could not save your profile.', cls: 'text-clay' });
      return;
    }
    setProfileMsg({ text: 'Saved.', cls: 'text-emerald-700' });
    toast({ message: 'Your profile has been updated.', type: 'ok', title: 'Saved' });
  };

  const switchTab = (next: 'login' | 'register') => {
    setTab(next);
    setAuthMsg({ text: '', cls: '' });
    setRegMsg({ text: '', cls: '' });
    setRegStep('form');
    setPendingRegister(null);
    setRegOtpMsg({ text: '', cls: '' });
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg({ text: '', cls: '' });
    const email = loginFields.email.trim();
    const password = loginFields.password;
    let bad = false;
    const errs = { email: '', password: '' };
    if (!EMAIL_RE.test(email)) {
      errs.email = 'Enter a valid email address.';
      bad = true;
    }
    if (!password.length) {
      errs.password = 'Enter your password.';
      bad = true;
    }
    if (bad) {
      setLoginErrs(errs);
      return;
    }
    setLoginErrs(errs);
    setAuthMsg({ text: 'Checking your details…', cls: 'text-navy/55' });
    setLoginBusy(true);
    setLoginLabel('Signing in…');
    const out = await login(email, password);
    setLoginBusy(false);
    if (!out.ok) {
      setAuthMsg({ text: out.message ?? '', cls: 'text-clay' });
      setLoginLabel('Sign in');
      return;
    }
    setAuthMsg({ text: '', cls: '' });
    toast({ message: `Welcome back, ${out.user?.name}.`, type: 'ok', title: 'Signed in' });
    setLoginLabel('Signed in ✓');
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegMsg({ text: '', cls: '' });
    const { first, last, email, pass, pass2 } = regFields;
    let bad = false;
    const errs = { first: '', last: '', email: '', pass: '', pass2: '' };
    if (!first || !NAME_RE.test(first)) {
      errs.first = 'Enter your first name.';
      bad = true;
    }
    if (!last || !NAME_RE.test(last)) {
      errs.last = 'Enter your last name.';
      bad = true;
    }
    if (!EMAIL_RE.test(email)) {
      errs.email = 'Enter a valid email address.';
      bad = true;
    }
    if (pass.length < 6) {
      errs.pass = 'Password must be at least 6 characters.';
      bad = true;
    }
    if (!pass2.length) {
      errs.pass2 = 'Please confirm your password.';
      bad = true;
    } else if (pass !== pass2) {
      errs.pass2 = 'Passwords do not match.';
      bad = true;
    }
    if (bad) {
      setRegErrs(errs);
      return;
    }
    setRegErrs(errs);
    setRegMsg({ text: 'Creating your account…', cls: 'text-navy/55' });
    setRegBusy(true);
    setRegLabel('Creating account…');
    const out = await register({ name: `${first} ${last}`.trim(), email, password: pass });
    setRegBusy(false);
    setRegLabel('Create account');
    if (!out.ok) {
      setRegMsg({ text: out.message ?? '', cls: 'text-clay' });
      return;
    }
    setRegMsg({ text: '', cls: '' });
    setPendingRegister({ email });
    setRegOtpCode('');
    setRegOtpMsg({
      text: `We've sent a 6-digit code to ${email}. Enter it below to finish creating your account.`,
      cls: 'text-navy/55',
    });
    setRegStep('otp');
  };

  const doVerifyRegOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRegister) return;
    const code = regOtpCode.trim();
    if (!code) {
      setRegOtpMsg({ text: 'Enter the 6-digit code from your email.', cls: 'text-clay' });
      return;
    }
    setRegOtpBusy(true);
    const out = await verifyRegistration(pendingRegister.email, code);
    setRegOtpBusy(false);
    if (!out.ok) {
      setRegOtpMsg({ text: out.message ?? '', cls: 'text-clay' });
      return;
    }
    setRegOtpMsg({ text: '', cls: '' });
    toast({
      message: 'Your account is ready — welcome to the Executive Boutique collection.',
      type: 'ok',
      title: 'Welcome',
    });
  };

  const resendRegOtp = async () => {
    if (!pendingRegister) return;
    setRegOtpBusy(true);
    const out = await resendRegistrationOtp(pendingRegister.email);
    setRegOtpBusy(false);
    setRegOtpMsg(
      out.ok
        ? { text: 'A new code is on its way.', cls: 'text-emerald-700' }
        : { text: out.message ?? 'Could not resend the code. Please try again.', cls: 'text-clay' }
    );
  };

  const doForgot = async (e: React.MouseEvent) => {
    e.preventDefault();
    const email = loginFields.email.trim() || 'demo@hotelcollection.com';
    setAuthMsg({ text: 'Sending a reset link…', cls: 'text-navy/55' });
    const out = await import('@/services/auth').then((m) => m.reset(email));
    setAuthMsg({ text: out.message ?? '', cls: 'text-emerald-700' });
  };

  if (session) {
    return (
      <div>
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Guests
        </p>

        <section
          aria-label="Account profile"
          className="bg-navy-dark relative mt-3 overflow-hidden rounded-3xl p-6 text-white sm:p-8"
        >
          <div
            className="bg-gold/10 absolute -top-10 -right-10 h-44 w-44 rounded-full"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="bg-gold/15 border-gold/40 text-gold-light font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-xl font-semibold">
              {initials(session.name)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                Welcome, {session.name}
              </h1>
              <p className="mt-1 truncate text-sm text-white/60">{session.email}</p>
              <p className="text-gold-light/80 mt-1 text-[11px] tracking-widest uppercase">
                Signed in · guest account
              </p>
            </div>
            <Button
              type="button"
              onClick={logout}
              variant="onDark"
              size="sm"
              className="self-start font-bold tracking-widest uppercase sm:self-center"
            >
              Sign out
            </Button>
          </div>
        </section>

        <div className="mt-6 grid gap-6">
          <section
            aria-labelledby="profile-title"
            className="border-navy/10 rounded-3xl border bg-white p-5 sm:p-7"
          >
            <h2 id="profile-title" className="font-display text-navy text-xl font-semibold">
              Profile
            </h2>
            <p className="text-navy/55 mt-1 text-sm">
              Your name and phone prefill the guest details on every booking.
            </p>
            <form onSubmit={doSaveProfile} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
              <div>
                <Label htmlFor="p-first">First name</Label>
                <Input
                  id="p-first"
                  value={profileFields.first}
                  onChange={(e) => setProfileFields({ ...profileFields, first: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-last">Last name</Label>
                <Input
                  id="p-last"
                  value={profileFields.last}
                  onChange={(e) => setProfileFields({ ...profileFields, last: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-phone">Phone</Label>
                <PhoneField
                  id="p-phone"
                  value={profileFields.phone}
                  onChange={(phone) => setProfileFields({ ...profileFields, phone })}
                />
              </div>
              <p
                role="status"
                className={`min-h-5 text-sm font-medium sm:col-span-2 ${profileMsg.cls || ''}`}
              >
                {profileMsg.text}
              </p>
              <Button type="submit" disabled={profileBusy} size="sm" className="sm:w-fit">
                {profileBusy ? 'Saving…' : 'Save profile'}
              </Button>
            </form>
          </section>

          <section
            aria-labelledby="bk-title"
            className="border-navy/10 rounded-3xl border bg-white p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="bk-title" className="font-display text-navy text-xl font-semibold">
                Your bookings
              </h2>
              <Link
                href="/search"
                className="text-navy hover:text-gold-dark hidden items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors sm:inline-flex"
              >
                New booking <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="text-navy/55 mt-1 text-sm">Every stay booked with this email address.</p>
            <div className="mt-5 space-y-3">
              {bookings.length === 0 ? (
                <div className="border-navy/10 bg-paper rounded-2xl border px-5 py-8 text-center">
                  <p className="font-display text-navy text-lg font-semibold">
                    No bookings yet on this email
                  </p>
                  <p className="text-navy/55 mt-1 text-sm">
                    When you book, your stays will appear here. Or look up an existing reservation
                    with your reference.
                  </p>
                  <Link
                    href="/search"
                    className="bg-navy shadow-navy/15 hover:bg-navy-light mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg transition-colors"
                  >
                    Start a booking
                  </Link>
                </div>
              ) : (
                bookings.map((b) => {
                  const roomLine = b.roomLines[0];
                  const roomName = roomLine?.roomTypeName ?? 'Room';
                  const status =
                    b.status === 'checked_in'
                      ? 'Checked in'
                      : b.status === 'cancelled'
                        ? 'Cancelled'
                        : 'Confirmed';
                  const nights = Math.max(
                    1,
                    nightsBetween(fromISODate(b.checkInDate), fromISODate(b.checkOutDate))
                  );
                  return (
                    <Link
                      key={b.reference}
                      href={`/confirmation?ref=${encodeURIComponent(b.reference)}`}
                      className="group border-navy/10 bg-paper hover:border-navy/25 hover:shadow-navy/5 flex items-center gap-4 rounded-2xl border p-4 transition-all hover:shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          roomLine?.roomTypeImageUrl
                            ? image(roomLine.roomTypeImageUrl, 300)
                            : IMG_FALLBACK
                        }
                        alt={roomName}
                        className="border-navy/10 h-16 w-16 shrink-0 rounded-xl border object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-navy group-hover:text-gold-dark block text-sm font-semibold transition-colors">
                            {roomName}
                          </span>
                          <span className="text-navy/45 font-mono text-[11px] font-semibold">
                            {b.reference}
                          </span>
                        </span>
                        <span className="text-navy/55 mt-0.5 block text-xs">
                          {fmtShort(fromISODate(b.checkInDate))} → {fmtShort(fromISODate(b.checkOutDate))} ·{' '}
                          {nights} {nights === 1 ? 'night' : 'nights'}
                          {b.totalAmount ? ` · ${fmt(b.totalAmount)}` : ''}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase ${
                          status === 'Cancelled'
                            ? 'bg-clay/10 text-clay'
                            : status === 'Checked in'
                              ? 'bg-emerald-700/10 text-emerald-700'
                              : 'bg-navy/8 text-navy'
                        }`}
                      >
                        {status}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
            <Link
              href="/search"
              className="bg-navy hover:bg-navy-light mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase transition-colors sm:hidden"
            >
              New booking
            </Link>
          </section>

          <section className="border-navy/10 rounded-3xl border bg-white p-5 sm:p-7">
            <h2 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
              Preferences & help
            </h2>
            <p className="text-navy/60 mt-2 max-w-md text-sm">
              Currency, language and cookie choices are saved on this device.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => open(<ConsentDialog />)}
                variant="outline"
                size="sm"
                className="bg-paper px-4"
              >
                Cookie settings
              </Button>
              <Link
                href="/reservation"
                className="border-navy/15 bg-paper text-navy hover:border-navy/30 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors"
              >
                Look up a booking
              </Link>
              <Link
                href="/checkin"
                className="border-navy/15 bg-paper text-navy hover:border-navy/30 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors"
              >
                Online check-in
              </Link>
              <Link
                href="/faq"
                className="border-navy/15 bg-paper text-navy hover:border-navy/30 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors"
              >
                FAQ
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
        Guests
      </p>
      <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
        Sign in or create an account
      </h1>
      <p className="text-navy/60 mt-2 max-w-lg text-sm">
        Manage your bookings, check in online and keep your preferences — no obligation, guest
        checkout works without an account too.
      </p>
      {oauthMsg ? (
        <p role="alert" className={`mt-4 text-sm font-medium ${oauthMsg.cls}`}>
          {oauthMsg.text}
        </p>
      ) : null}

      <div className="border-navy/10 mt-8 rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
        <Tabs value={tab} onValueChange={(v) => switchTab(v as 'login' | 'register')}>
          <TabsList
            aria-label="Account actions"
            className="bg-paper flex w-fit gap-1 rounded-2xl p-1"
          >
            <TabsTrigger value="login" className="rounded-xl px-5 py-2.5 text-sm">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-xl px-5 py-2.5 text-sm">
              Create account
            </TabsTrigger>
          </TabsList>

          {tab === 'login' ? (
            <TabsContent value="login">
              <form className="mt-7 grid gap-5" onSubmit={doLogin} noValidate>
                <div>
                  <Label htmlFor="a-email">Email</Label>
                  <Input
                    id="a-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={loginFields.email}
                    onChange={(e) => {
                      setLoginFields({ ...loginFields, email: e.target.value });
                      setLoginErrs({ ...loginErrs, email: '' });
                    }}
                    aria-invalid={!!loginErrs.email}
                  />
                  {loginErrs.email ? (
                    <p role="alert" className="text-clay mt-1.5 text-[11px] font-medium">
                      {loginErrs.email}
                    </p>
                  ) : null}
                </div>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <Label htmlFor="a-pass" className="mb-0">
                      Password
                    </Label>
                    <Button
                      type="button"
                      onClick={doForgot}
                      variant="ghost"
                      className="text-navy/55 text-[11px] underline underline-offset-2"
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="a-pass"
                    type="password"
                    autoComplete="current-password"
                    value={loginFields.password}
                    onChange={(e) => {
                      setLoginFields({ ...loginFields, password: e.target.value });
                      setLoginErrs({ ...loginErrs, password: '' });
                    }}
                    aria-invalid={!!loginErrs.password}
                  />
                  {loginErrs.password ? (
                    <p role="alert" className="text-clay mt-1.5 text-[11px] font-medium">
                      {loginErrs.password}
                    </p>
                  ) : null}
                </div>
                <p role="status" className={`min-h-5 text-sm font-medium ${authMsg.cls || ''}`}>
                  {authMsg.text}
                </p>
                <Button
                  type="submit"
                  disabled={loginBusy}
                  size="lg"
                  className="shadow-navy/15 w-full sm:w-auto"
                >
                  {loginLabel}
                </Button>
                <OrDivider />
                <GoogleButton redirect="/account" />
                <p className="text-navy/50 -mt-2 text-xs">
                  New here?{' '}
                  <Button
                    type="button"
                    onClick={() => switchTab('register')}
                    variant="ghost"
                    className="text-navy hover:text-gold-dark underline underline-offset-2"
                  >
                    Create a guest account
                  </Button>{' '}
                  — it takes less than a minute.
                </p>
              </form>
            </TabsContent>
          ) : (
            <TabsContent value="register">
              {regStep === 'otp' && pendingRegister ? (
                <div id="register-otp">
                  <h2 className="font-display text-navy mt-6 text-lg font-semibold">
                    Check your email
                  </h2>
                  <p className="text-navy/55 mt-1 text-sm">
                    Enter the 6-digit code we sent to{' '}
                    <span className="text-navy font-medium">{pendingRegister.email}</span> to finish
                    creating your account.
                  </p>
                  <form
                    className="mt-5 flex flex-wrap items-end gap-3"
                    onSubmit={doVerifyRegOtp}
                    noValidate
                  >
                    <div>
                      <Label htmlFor="r-otp-code">Verification code</Label>
                      <Input
                        id="r-otp-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={regOtpCode}
                        onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-40 tracking-[0.3em]"
                      />
                    </div>
                    <Button type="submit" disabled={regOtpBusy} className="py-3.5">
                      {regOtpBusy ? 'Verifying…' : 'Verify'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={regOtpBusy}
                      onClick={resendRegOtp}
                      className="py-3.5"
                    >
                      Resend code
                    </Button>
                  </form>
                  <p
                    role="status"
                    className={`mt-3 min-h-5 text-sm font-medium ${regOtpMsg.cls || ''}`}
                  >
                    {regOtpMsg.text}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setRegStep('form');
                      setPendingRegister(null);
                    }}
                    className="text-navy/55 -ml-3 mt-1 text-xs underline underline-offset-2"
                  >
                    Use a different email
                  </Button>
                </div>
              ) : (
              <form
                className="mt-7 grid gap-x-4 gap-y-5 sm:grid-cols-2"
                onSubmit={doRegister}
                noValidate
              >
                <div>
                  <Label htmlFor="r-first">
                    First name{' '}
                    <span className="text-gold-dark" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Input
                    id="r-first"
                    type="text"
                    autoComplete="given-name"
                    value={regFields.first}
                    onChange={(e) => {
                      setRegFields({ ...regFields, first: e.target.value });
                      setRegErrs({ ...regErrs, first: '' });
                    }}
                  />
                  {regErrs.first ? (
                    <p role="alert" className="text-clay mt-1.5 text-[11px] font-medium">
                      {regErrs.first}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="r-last">
                    Last name{' '}
                    <span className="text-gold-dark" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Input
                    id="r-last"
                    type="text"
                    autoComplete="family-name"
                    value={regFields.last}
                    onChange={(e) => {
                      setRegFields({ ...regFields, last: e.target.value });
                      setRegErrs({ ...regErrs, last: '' });
                    }}
                  />
                  {regErrs.last ? (
                    <p role="alert" className="text-clay mt-1.5 text-[11px] font-medium">
                      {regErrs.last}
                    </p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="r-email">
                    Email{' '}
                    <span className="text-gold-dark" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Input
                    id="r-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={regFields.email}
                    onChange={(e) => {
                      setRegFields({ ...regFields, email: e.target.value });
                      setRegErrs({ ...regErrs, email: '' });
                    }}
                  />
                  {regErrs.email ? (
                    <p role="alert" className="text-clay mt-1.5 text-[11px] font-medium">
                      {regErrs.email}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="r-pass">
                    Password{' '}
                    <span className="text-gold-dark" aria-hidden="true">
                      *
                    </span>{' '}
                    <span className="text-navy/40 font-normal">(min 6 characters)</span>
                  </Label>
                  <Input
                    id="r-pass"
                    type="password"
                    autoComplete="new-password"
                    value={regFields.pass}
                    onChange={(e) => {
                      setRegFields({ ...regFields, pass: e.target.value });
                      setRegErrs({ ...regErrs, pass: '' });
                    }}
                  />
                  {regErrs.pass ? (
                    <p role="alert" className="text-clay mt-1.5 text-[11px] font-medium">
                      {regErrs.pass}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="r-pass2">
                    Confirm password{' '}
                    <span className="text-gold-dark" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Input
                    id="r-pass2"
                    type="password"
                    autoComplete="new-password"
                    value={regFields.pass2}
                    onChange={(e) => {
                      setRegFields({ ...regFields, pass2: e.target.value });
                      setRegErrs({ ...regErrs, pass2: '' });
                    }}
                  />
                  {regErrs.pass2 ? (
                    <p role="alert" className="text-clay mt-1.5 text-[11px] font-medium">
                      {regErrs.pass2}
                    </p>
                  ) : null}
                </div>
                <p
                  role="status"
                  className={`min-h-5 text-sm font-medium sm:col-span-2 ${regMsg.cls || ''}`}
                >
                  {regMsg.text}
                </p>
                <Button
                  type="submit"
                  disabled={regBusy}
                  size="lg"
                  className="shadow-navy/15 w-full sm:col-span-2 sm:w-auto"
                >
                  {regLabel}
                </Button>
                <div className="sm:col-span-2">
                  <OrDivider />
                </div>
                <div className="sm:col-span-2">
                  <GoogleButton redirect="/account" />
                </div>
                <p className="text-navy/50 -mt-2 text-xs sm:col-span-2">
                  Your name and email only — used to recognise your stays.{' '}
                  <Link href="/privacy" className="underline">
                    Privacy notice
                  </Link>
                  .
                </p>
              </form>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase() || '?';
}
