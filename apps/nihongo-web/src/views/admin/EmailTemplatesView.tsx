'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api-client';
import { errorMessage } from '@/lib/error-message';

type TemplateItem = {
  name: string;
  description?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  isDbOverride: boolean;
  active: boolean;
};

type PreviewResult = { subject: string; html: string; text: string };

const TEMPLATE_NAMES: Record<string, string> = {
  verify_email:      'Xác thực email',
  welcome:           'Chào mừng',
  reset_password:    'Đặt lại mật khẩu',
  weekly_progress:   'Tiến độ tuần',
  streak_milestone:  'Streak milestone',
  broadcast_generic: 'Broadcast chung',
};

export default function EmailTemplatesView() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TemplateItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ subject: '', htmlBody: '', textBody: '' });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<TemplateItem[]>('/admin/email-templates', { token });
      setTemplates(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  function selectTemplate(t: TemplateItem) {
    setSelected(t);
    setForm({ subject: t.subject, htmlBody: t.htmlBody, textBody: t.textBody });
    setEditing(false);
    setPreview(null);
    setStatus('');
    setError('');
  }

  async function handleSave() {
    if (!token || !selected) return;
    try {
      await apiRequest(`/admin/email-templates/${selected.name}`, {
        method: 'POST', token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: form.subject, htmlBody: form.htmlBody, textBody: form.textBody }),
      });
      setStatus('Đã lưu');
      setEditing(false);
      void load();
      setTimeout(() => setStatus(''), 2500);
    } catch (e) { setError(errorMessage(e)); }
  }

  async function handleReset() {
    if (!token || !selected || !confirm(`Xoá override "${selected.name}" và về default?`)) return;
    try {
      await apiRequest(`/admin/email-templates/${selected.name}`, { method: 'DELETE', token });
      setStatus('Đã reset về default');
      setEditing(false);
      void load();
      setTimeout(() => setStatus(''), 2500);
    } catch (e) { setError(errorMessage(e)); }
  }

  async function handlePreview() {
    if (!token || !selected) return;
    setPreviewLoading(true);
    try {
      const res = await apiRequest<PreviewResult>(`/admin/email-templates/${selected.name}/preview`, {
        method: 'POST', token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: {} }),
      });
      setPreview(res);
    } catch (e) { setError(errorMessage(e)); }
    finally { setPreviewLoading(false); }
  }

  async function handleTestSend() {
    if (!token || !selected) return;
    try {
      await apiRequest(`/admin/email-templates/${selected.name}/test`, {
        method: 'POST', token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmail || undefined }),
      });
      setStatus(`Đã gửi test tới ${testEmail || 'email admin'}`);
      setTimeout(() => setStatus(''), 3000);
    } catch (e) { setError(errorMessage(e)); }
  }

  async function handleSeed() {
    if (!token || !confirm('Seed tất cả templates vào DB?')) return;
    try {
      await apiRequest('/admin/email-templates/seed', { method: 'POST', token });
      setStatus('Đã seed templates');
      void load();
      setTimeout(() => setStatus(''), 2500);
    } catch (e) { setError(errorMessage(e)); }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Template list */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border-color)',
        overflowY: 'auto', background: 'var(--surface-color)',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Email Templates</span>
          <button onClick={handleSeed} title="Seed defaults" style={iconBtnStyle}>🌱</button>
        </div>
        {loading ? (
          <p style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>Đang tải...</p>
        ) : templates.map((t) => (
          <button key={t.name} onClick={() => selectTemplate(t)} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
            border: 'none', borderBottom: '1px solid var(--border-color)',
            background: selected?.name === t.name ? 'rgba(var(--primary-rgb,99,102,241),0.1)' : 'transparent',
            cursor: 'pointer', color: 'var(--text-primary)',
          }}>
            <div style={{ fontSize: 13, fontWeight: selected?.name === t.name ? 700 : 500 }}>
              {TEMPLATE_NAMES[t.name] ?? t.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t.isDbOverride
                ? <span style={{ color: '#f59e0b' }}>● DB override</span>
                : <span style={{ color: '#6b7280' }}>● Default</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            Chọn template để chỉnh sửa
          </div>
        ) : (
          <div style={{ padding: '24px 28px', maxWidth: 900 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {TEMPLATE_NAMES[selected.name] ?? selected.name}
                </h2>
                <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selected.name}</code>
                {selected.variables.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selected.variables.map((v) => (
                      <code key={v} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: 'var(--primary-color)' }}>
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {editing ? (
                  <>
                    <button onClick={handleSave} style={btnStyle('#16a34a')}>💾 Lưu</button>
                    <button onClick={() => setEditing(false)} style={btnStyle('#6b7280')}>Huỷ</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} style={btnStyle('var(--primary-color)')}>✏️ Sửa</button>
                    {selected.isDbOverride && (
                      <button onClick={handleReset} style={btnStyle('#ef4444')}>↺ Reset default</button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Status / Error */}
            {status && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: 13 }}>{status}</div>}
            {error && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 13 }}>{error}</div>}

            {/* Subject */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Subject</label>
              {editing ? (
                <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} style={inputStyle} />
              ) : (
                <div style={valueStyle}>{selected.subject}</div>
              )}
            </div>

            {/* HTML Body */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>HTML Body <span style={{ color: '#9ca3af', fontWeight: 400 }}>(hỗ trợ {`{{varName}}`})</span></label>
              {editing ? (
                <textarea
                  value={form.htmlBody}
                  onChange={(e) => setForm((p) => ({ ...p, htmlBody: e.target.value }))}
                  rows={12}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                />
              ) : (
                <pre style={{ ...valueStyle, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                  {selected.htmlBody}
                </pre>
              )}
            </div>

            {/* Text Body */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Text Body</label>
              {editing ? (
                <textarea
                  value={form.textBody}
                  onChange={(e) => setForm((p) => ({ ...p, textBody: e.target.value }))}
                  rows={5}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                />
              ) : (
                <pre style={{ ...valueStyle, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto' }}>
                  {selected.textBody}
                </pre>
              )}
            </div>

            {/* Actions row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '16px 0', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={handlePreview} disabled={previewLoading} style={btnStyle('#0369a1')}>
                {previewLoading ? 'Đang xem trước...' : '👁 Xem trước'}
              </button>
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email@test.com (để trống = email admin)"
                style={{ ...inputStyle, width: 260, marginBottom: 0 }}
              />
              <button onClick={handleTestSend} style={btnStyle('#f59e0b')}>📨 Gửi test</button>
            </div>

            {/* Preview iframe */}
            {preview && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Preview — Subject: <strong style={{ color: 'var(--text-primary)' }}>{preview.subject}</strong>
                </div>
                <iframe
                  srcDoc={preview.html}
                  style={{ width: '100%', height: 480, border: '1px solid var(--border-color)', borderRadius: 8, background: '#fff' }}
                  title="email-preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid var(--border-color)', background: 'var(--bg-color)',
  color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const valueStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, background: 'var(--surface-color)',
  border: '1px solid var(--border-color)', fontSize: 13, color: 'var(--text-primary)', margin: 0,
};
function btnStyle(bg: string): React.CSSProperties {
  return { padding: '7px 14px', borderRadius: 6, border: 'none', background: bg, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 };
}
const iconBtnStyle: React.CSSProperties = {
  padding: '3px 7px', borderRadius: 5, border: '1px solid var(--border-color)',
  background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)',
};
