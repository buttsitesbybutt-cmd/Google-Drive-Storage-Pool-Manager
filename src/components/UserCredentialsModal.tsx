import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Server,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserCredentialsStatus } from '../types';

interface UserCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  authToken: string | null;
}

export const UserCredentialsModal: React.FC<UserCredentialsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  authToken,
}) => {
  const [credentials, setCredentials] = useState<UserCredentialsStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form Inputs
  const [clientId, setClientId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [customRedirectUri, setCustomRedirectUri] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);

  // Notifications / Validation Messages
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // UI States
  const [copiedRedirect, setCopiedRedirect] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Fetch current user credentials status
  const fetchCredentials = async () => {
    if (!authToken) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/user/credentials', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data: UserCredentialsStatus = await res.json();
        setCredentials(data);
        if (data.hasCustomCredentials) {
          setClientId(data.clientId || '');
          setClientSecret(data.maskedClientSecret || '');
          setCustomRedirectUri(data.customRedirectUri || '');
        } else {
          setClientId('');
          setClientSecret('');
          setCustomRedirectUri('');
        }
      }
    } catch (err) {
      console.error('Failed to load user credentials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    }
  }, [isOpen, authToken]);

  if (!isOpen) return null;

  const defaultRedirectUri =
    credentials?.redirectUri || `${window.location.origin}/api/oauth/google/callback`;

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(defaultRedirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  // Handle Form Submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;

    if (!clientId.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your Google OAuth Client ID.' });
      return;
    }

    if (!clientSecret.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your Google OAuth Client Secret.' });
      return;
    }

    // If client secret is unchanged masked value and user already has custom credentials, alert user
    if (clientSecret.includes('••••') && !credentials?.hasCustomCredentials) {
      setFeedback({
        type: 'error',
        message: 'Please enter the real Client Secret from Google Cloud Console.',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/user/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          customRedirectUri: customRedirectUri.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: 'Personal Google Cloud Console credentials successfully saved and encrypted!',
        });
        await fetchCredentials();
        onSaved();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to save credentials.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error while saving credentials.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test credentials format
  const handleTest = async () => {
    if (!authToken) return;
    setIsTesting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/user/credentials/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });

      const data = await res.json();
      if (data.valid) {
        setFeedback({
          type: 'success',
          message: data.message,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.issues?.join(' ') || data.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Failed to run format validation check.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Reset/Clear user custom credentials
  const handleClear = async () => {
    if (!authToken) return;
    if (
      !window.confirm(
        'Are you sure you want to remove your personal Google Cloud credentials? This user account will revert to default system settings.'
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/user/credentials', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'info',
          message: data.message || 'Credentials cleared.',
        });
        setClientId('');
        setClientSecret('');
        setCustomRedirectUri('');
        await fetchCredentials();
        onSaved();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to clear credentials.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Failed to reset credentials.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="user-credentials-modal-box"
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Google Cloud Console Credentials
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  User Isolated
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure private Google OAuth 2.0 credentials for your user account only
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Status Banner */}
        <div className="mb-5">
          {credentials?.hasCustomCredentials ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-2">
                  <span>Custom User Credentials Active</span>
                  <span className="px-1.5 py-0.2 text-[10px] bg-emerald-200/60 text-emerald-800 rounded">
                    Private to your account
                  </span>
                </div>
                <p className="text-emerald-800 mt-0.5">
                  All Google Drive accounts linked by your user profile will authenticate through your dedicated Google Cloud project.
                </p>
              </div>
            </div>
          ) : credentials?.systemFallbackAvailable ? (
            <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3">
              <Server className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-blue-900">
                  Using Server Fallback Credentials
                </div>
                <p className="text-blue-800 mt-0.5">
                  No personal GCP credentials entered yet. You can either use default system configuration or input your own private Client ID and Secret below.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-amber-900">
                  Credentials Required to Link Google Drives
                </div>
                <p className="text-amber-800 mt-0.5">
                  Enter your personal Google Cloud Console OAuth Client ID and Secret below to enable connecting and streaming with Google Drive.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs mb-5 flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />}
            {feedback.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
            {feedback.type === 'info' && <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />}
            <span className="leading-relaxed font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Mandatory Redirect URI Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5 text-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>Authorized Redirect URI</span>
              <span className="text-[11px] text-slate-500 font-normal">
                (Paste into Google Cloud Console)
              </span>
            </span>
            <button
              type="button"
              onClick={handleCopyRedirect}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
            >
              {copiedRedirect ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Callback URI</span>
                </>
              )}
            </button>
          </div>
          <div className="font-mono text-[11px] bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-700 break-all select-all">
            {defaultRedirectUri}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs mb-6">
          {/* Client ID */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Google OAuth Client ID <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-user-client-id"
              type="text"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="1234567890-abcdefghijklmnop1234567890.apps.googleusercontent.com"
              className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              From GCP &gt; APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client IDs.
            </p>
          </div>

          {/* Client Secret */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-800">
                Google OAuth Client Secret <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-[11px] font-medium"
              >
                {showSecret ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide Secret</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Plaintext</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                id="input-user-client-secret"
                type={showSecret ? 'text' : 'password'}
                required
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Encrypted with AES-256-GCM before saving to your user database record.</span>
            </p>
          </div>

          {/* Custom Redirect URI (Optional Override) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Custom Redirect URI <span className="text-slate-400 font-normal">(Optional Override)</span>
            </label>
            <input
              id="input-user-custom-redirect"
              type="text"
              value={customRedirectUri}
              onChange={(e) => setCustomRedirectUri(e.target.value)}
              placeholder={defaultRedirectUri}
              className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank to automatically use the standard application redirect URI.
            </p>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !clientId}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Checking...' : 'Validate Format'}
              </button>

              {credentials?.hasCustomCredentials && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              )}
            </div>

            <button
              id="btn-save-credentials"
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-50 ml-auto"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving & Encrypting...' : 'Save My Credentials'}</span>
            </button>
          </div>
        </form>

        {/* Collapsible GCP Setup Instructions */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Step-by-step Google Cloud Console Setup Guide</span>
            </span>
            {showGuide ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showGuide && (
            <div className="p-4 space-y-3 bg-white text-xs text-slate-700 border-t border-slate-200">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Open Google Cloud Console</p>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>console.cloud.google.com/apis/credentials</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Enable Google Drive API</p>
                  <p className="text-slate-600">
                    Go to <strong>APIs &amp; Services &gt; Library</strong>, search for <code>Google Drive API</code> and click <strong>Enable</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Configure OAuth Consent Screen</p>
                  <p className="text-slate-600">
                    Select <strong>External</strong>, enter your App Name &amp; Support Email, and add scopes: <code>.../auth/drive</code>, <code>.../auth/userinfo.email</code>, <code>.../auth/userinfo.profile</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Create OAuth Client ID</p>
                  <p className="text-slate-600">
                    Go to <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>. Select application type <strong>Web application</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  5
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Add Authorized Redirect URI</p>
                  <p className="text-slate-600">
                    Under <strong>Authorized redirect URIs</strong>, click <strong>+ Add URI</strong> and paste: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] select-all">{defaultRedirectUri}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  6
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Paste Credentials &amp; Save</p>
                  <p className="text-slate-600">
                    Copy the generated <strong>Client ID</strong> and <strong>Client Secret</strong> into the fields above and click <strong>Save My Credentials</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Isolation & Privacy Note */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>User Account Isolation:</strong> Your GCP credentials are stored encrypted and are only accessible by your user account. Other users on this site will never see or share your credentials.
          </span>
        </div>
      </div>
    </div>
  );
};
