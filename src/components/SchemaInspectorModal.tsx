import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  Table,
  Lock,
  Layers,
  FileCode,
} from 'lucide-react';

interface SchemaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaInspectorModal: React.FC<SchemaInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [schemaData, setSchemaData] = useState<{ ddl: string; tables: any[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/schema')
        .then((res) => res.json())
        .then((data) => setSchemaData(data))
        .catch((err) => console.error('Failed to load schema:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (schemaData?.ddl) {
      navigator.clipboard.writeText(schemaData.ddl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="schema-modal-box"
        className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                SQL Database Schema & Relational Tables
              </h3>
              <p className="text-xs text-slate-500">
                PostgreSQL / Supabase / SQLite compatible production DDL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied DDL!' : 'Copy SQL Schema'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Table Summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                <Table className="w-4 h-4 text-blue-600" />
                <span>1. users</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                User registration & login identity with bcrypt password hashing.
              </p>
              <div className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
                id (PK), email (UNIQUE), password_hash, name, created_at
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 mb-1">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>2. connected_google_accounts</span>
              </div>
              <p className="text-[11px] text-indigo-800 mb-2">
                OAuth 2.0 refresh tokens stored with AES-256-GCM authentication.
              </p>
              <div className="text-[11px] font-mono text-indigo-900 bg-white p-2 rounded border border-indigo-200">
                id, user_id (FK), email, encrypted_refresh_token, token_iv, token_auth_tag, drive_quota_total, drive_quota_used
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>3. files</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Unified index across all connected user Google Drive accounts.
              </p>
              <div className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
                id, user_id (FK), drive_account_id (FK), google_file_id, name, mime_type, size_bytes, web_view_link
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 mb-1">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>4. cleanup_logs</span>
              </div>
              <p className="text-[11px] text-emerald-800 mb-2">
                Audit trail verifying 0 bytes local server storage retention.
              </p>
              <div className="text-[11px] font-mono text-emerald-900 bg-white p-2 rounded border border-emerald-200">
                id, trigger_reason, status, details, created_at
              </div>
            </div>
          </div>

          {/* Raw SQL DDL Code View */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Complete SQL DDL Schema Script</span>
              <span className="text-[11px] text-slate-400 font-mono">schema.sql</span>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[300px]">
              {schemaData?.ddl || '-- Loading SQL Schema...'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
