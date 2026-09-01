import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Lock,
} from 'lucide-react';
import { OAuthConfigStatus } from '../types';

interface OAuthGuideModalProps {
  isOpen: boolean;
  config: OAuthConfigStatus | null;
  onClose: () => void;
  onOpenCredentials: () => void;
}

export const OAuthGuideModal: React.FC<OAuthGuideModalProps> = ({
  isOpen,
  config,
  onClose,
  onOpenCredentials,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const callbackUrl = config?.redirectUri || 'https://gdrives.ai.studio/api/oauth/google/callback';

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="oauth-guide-modal-box"
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Google OAuth 2.0 Configuration Guide
              </h3>
              <p className="text-xs text-slate-500">
                How persistent Google Drive authentication works in this app
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

        {/* Security Summary Box */}
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 mb-5">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1.5">
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>AES-256-GCM Token Encryption Architecture</span>
          </div>
          <p className="text-xs text-indigo-800 leading-relaxed">
            When users authorize Google Drive via OAuth 2.0, the returned <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px]">refresh_token</code> is encrypted using <strong>AES-256-GCM</strong> with unique 12-byte initialization vectors (IVs) and 16-byte authentication tags. The encrypted tokens are persisted in the database mapped to the user ID so drives <strong>never need to be reconnected on future logins</strong>.
          </p>
        </div>

        {/* Step-by-Step Setup Guide */}
        <div className="space-y-4 mb-6 text-xs text-slate-700">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Required GCP OAuth Setup Steps:
          </h4>

          {/* Step 1 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900">1. Google Cloud Console Credentials</span>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Open GCP Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-600 mb-2">
              Create an <strong>OAuth 2.0 Client ID</strong> (Application type: <em>Web application</em>).
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px] mb-1 font-medium">
                Authorized Redirect URI:
              </span>
              <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-slate-800 bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
                <span className="truncate">{callbackUrl}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-sans font-medium text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy URI'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1.5">
              2. Enable Google Drive API v3
            </span>
            <p className="text-slate-600">
              In your GCP project, enable <strong>Google Drive API</strong> from the API Library.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-indigo-950">
                3. Save Credentials in Website UI (User-Specific)
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenCredentials();
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                Open Credentials Settings
              </button>
            </div>
            <p className="text-indigo-900 mb-2">
              Every user can enter their own private <strong>Client ID</strong> and <strong>Client Secret</strong> directly on the website. Credentials are encrypted and stored solely for your account:
            </p>
            <div className="bg-white p-3 rounded-lg border border-indigo-100 font-mono text-[11px] space-y-1 text-slate-800">
              <div><span className="text-slate-400">Client ID:</span> 1234567890-abcdef.apps.googleusercontent.com</div>
              <div><span className="text-slate-400">Client Secret:</span> GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onOpenCredentials();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
          >
            Configure My Credentials
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
