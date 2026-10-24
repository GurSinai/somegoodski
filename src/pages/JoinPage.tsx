import { Loader2, Snowflake, Users2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { openShared } from '../collab/engine';
import { joinWithInvite, loadFirebase, readInvite, signIn, type InvitePreview } from '../collab/firebase';
import { isFirebaseConfigured } from '../collab/firebaseConfig';
import { useCollab } from '../collab/useCollab';
import { Button } from '../components/ui';

/** Opened from an invite link: sign in, see who invited you, join the vacation. */
export default function JoinPage() {
  const { vacationId = '', code = '' } = useParams();
  const user = useCollab((s) => s.user);
  const authReady = useCollab((s) => s.authReady);
  const alreadyHere = useCollab((s) => Boolean(s.shared[vacationId]));
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitePreview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseConfigured) void loadFirebase().catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => {
    if (!user) return;
    readInvite(vacationId, code).then(setInvite, (e) => setError((e as Error).message));
  }, [user, vacationId, code]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!alreadyHere) await joinWithInvite(vacationId, code);
      const r = await openShared(vacationId);
      navigate(`/w/${r.winterId}/v/${r.vacationId}`, { replace: true });
    } catch (e) {
      const msg = (e as Error).message;
      setError(/permission|not-found|No document/i.test(msg) ? 'This invite no longer works. Ask for a new link.' : msg);
    } finally {
      setBusy(false);
    }
  };

  const body = (() => {
    if (!isFirebaseConfigured) return <p className="text-sm text-slate-500">Live sharing isn’t set up in this copy of SomeGoodSki.</p>;
    if (!authReady) return <p className="text-sm text-slate-400"><Loader2 size={14} className="mr-1 inline animate-spin" /> Loading…</p>;
    if (!user)
      return (
        <>
          <p className="mb-4 text-sm text-slate-500">You’ve been invited to plan a ski vacation together. Sign in with Google to see the invite.</p>
          <Button variant="primary" disabled={busy} onClick={() => { setBusy(true); signIn().catch((e) => setError((e as Error).message)).finally(() => setBusy(false)); }}>
            {busy && <Loader2 size={15} className="animate-spin" />} Sign in with Google
          </Button>
        </>
      );
    if (invite === undefined) return <p className="text-sm text-slate-400"><Loader2 size={14} className="mr-1 inline animate-spin" /> Checking the invite…</p>;
    if (invite === null || invite.expired)
      return <p className="text-sm text-slate-500">{invite?.expired ? 'This invite link has expired.' : 'This invite link was revoked or doesn’t exist.'} Ask for a new one.</p>;
    return (
      <>
        <p className="mb-1 text-sm text-slate-500"><b className="text-slate-800">{invite.fromName}</b> invited you to plan</p>
        <div className="mb-1 text-2xl font-extrabold">{invite.vacationName}</div>
        <div className="mb-5 text-sm text-slate-400">Winter {invite.winterYear}</div>
        <p className="mb-5 text-xs text-slate-500">
          You’ll both edit its trips and prices. Add your own friends from your roster; theirs show up as “added by {invite.fromName}” and never mix with your roster.
        </p>
        <Button variant="primary" disabled={busy} onClick={join}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Users2 size={15} />} {alreadyHere ? 'Open vacation' : 'Join vacation'}
        </Button>
      </>
    );
  })();

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="card p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-glow">
          <Snowflake size={22} />
        </span>
        {body}
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400"><Link to="/" className="hover:text-slate-600">Back to SomeGoodSki</Link></p>
    </div>
  );
}
