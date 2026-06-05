import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Trash2, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchTherapists, createTherapist, deleteTherapist, resendTherapistCredentials, updateTherapist, uploadImage } from '../api/admin';

// ── Types ──────────────────────────────────────────────────────────────────

interface Therapist {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  city: string;
  state: string;
  licenseType: string;
  registrationNumber: string;
  registrationCouncil: string;
  yearsOfExperience: number;
  specializations: string[];
  languagesSpoken: string[];
  highestDegree: string;
  university: string;
  graduationYear: number;
  bio: string;
  consultationFee: number;
  sessionDurationMinutes: number;
  offersOnline: boolean;
  offersInPerson: boolean;
  status: string;
  verifiedByAdmin: boolean;
  profilePictureUrl?: string;
  createdAt: string;
}

const LICENSE_TYPES = [
  'Clinical Psychologist',
  'Counselling Psychologist',
  'Psychiatrist',
  'Psychotherapist',
  'LMFT',
  'Social Worker (MSW)',
  'Other',
];

const SPECIALIZATIONS = [
  'Anxiety', 'Depression', 'Trauma & PTSD', 'Couples Therapy',
  'Child & Adolescent', 'Grief & Loss', 'OCD', 'Addiction',
  'Eating Disorders', 'Stress Management', 'Relationship Issues',
  'Career Counselling', 'Sleep Disorders', 'Anger Management',
];

const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu',
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry',
];

// ── Empty form ──────────────────────────────────────────────────────────────

const emptyForm = () => ({
  firstName: '', lastName: '', email: '', phoneNumber: '',
  gender: 'male', dateOfBirth: '',
  city: '', state: '',
  licenseType: 'Clinical Psychologist',
  registrationNumber: '', registrationCouncil: 'Rehabilitation Council of India',
  registrationExpiryDate: '',
  yearsOfExperience: '', specializations: [] as string[], languagesSpoken: [] as string[],
  highestDegree: '', university: '', graduationYear: '',
  bio: '', consultationFee: '', sessionDurationMinutes: '60',
  offersOnline: true, offersInPerson: false,
  profilePictureUrl: '',
});

type FormData = ReturnType<typeof emptyForm>;

// ── Multi-select chip component ─────────────────────────────────────────────

function ChipSelect({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt]);

  return (
    <div className="modal-field">
      <label>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {options.map(opt => (
          <div
            key={opt}
            onClick={() => toggle(opt)}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: value.includes(opt) ? 'var(--primary)' : '#f3f4f6',
              color: value.includes(opt) ? 'white' : '#374151',
              fontWeight: 500, transition: 'all 0.15s',
            }}
          >
            {opt}
          </div>
        ))}
      </div>
      {value.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
          Selected: {value.join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 0', borderBottom: '1px solid var(--border)',
        cursor: 'pointer', marginBottom: open ? 12 : 0,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </div>
  );
}

// ── Add Therapist Modal ─────────────────────────────────────────────────────

function AddTherapistModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<FormData>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sections, setSections] = useState({
    personal: true, professional: true, education: true, practice: true,
  });

  const set = (key: keyof FormData, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const toggleSection = (s: keyof typeof sections) =>
    setSections(p => ({ ...p, [s]: !p[s] }));

  const handleSubmit = async () => {
    setError('');
    // Basic validation
    if (!form.firstName || !form.lastName || !form.email || !form.phoneNumber ||
      !form.dateOfBirth || !form.city || !form.state ||
      !form.registrationNumber || !form.yearsOfExperience ||
      !form.highestDegree || !form.university || !form.graduationYear ||
      !form.bio || !form.consultationFee) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.specializations.length === 0) {
      setError('Select at least one specialization.');
      return;
    }
    if (form.languagesSpoken.length === 0) {
      setError('Select at least one language.');
      return;
    }

    setLoading(true);
    try {
      await createTherapist({
        ...form,
        yearsOfExperience: Number(form.yearsOfExperience),
        graduationYear: Number(form.graduationYear),
        consultationFee: Number(form.consultationFee),
        sessionDurationMinutes: Number(form.sessionDurationMinutes),
        registrationExpiryDate: form.registrationExpiryDate || undefined,
        profilePictureUrl: form.profilePictureUrl || undefined,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || 'Failed to create therapist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 620, maxWidth: '96vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">Add New Therapist</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

          {/* ── Personal Info ── */}
          <SectionHeader title="Personal Information" open={sections.personal} onToggle={() => toggleSection('personal')} />
          {sections.personal && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label>First Name *</label>
                  <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Priya" />
                </div>
                <div className="modal-field">
                  <label>Last Name *</label>
                  <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Sharma" />
                </div>
              </div>
              <div className="modal-field">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="priya.sharma@example.com" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label>Phone Number *</label>
                  <input value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} placeholder="+919876543210" />
                </div>
                <div className="modal-field">
                  <label>Date of Birth *</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                </div>
              </div>
              <div className="modal-field">
                <label>Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label>City *</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
                </div>
                <div className="modal-field">
                  <label>State *</label>
                  <select value={form.state} onChange={e => set('state', e.target.value)}>
                    <option value="">— select —</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-field">
                <label>Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="therapist-photo"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        set('profilePictureUrl', '');
                        const result = await uploadImage(file, 'therapist_pictures');
                        set('profilePictureUrl', result.url);
                      } catch {
                        alert('Failed to upload image');
                      }
                    }}
                  />
                  <label htmlFor="therapist-photo" style={{
                    padding: '8px 16px',
                    background: '#D19371',
                    color: '#fff',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}>
                    {form.profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {form.profilePictureUrl && (
                    <img
                      src={form.profilePictureUrl}
                      alt="preview"
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Professional Credentials ── */}
          <SectionHeader title="Professional Credentials" open={sections.professional} onToggle={() => toggleSection('professional')} />
          {sections.professional && (
            <>
              <div className="modal-field">
                <label>License Type *</label>
                <select value={form.licenseType} onChange={e => set('licenseType', e.target.value)}>
                  {LICENSE_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label>Registration Number * <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(RCI/MCI/State)</span></label>
                  <input value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} placeholder="RCI/12345/2020" />
                </div>
                <div className="modal-field">
                  <label>Registration Expiry</label>
                  <input type="date" value={form.registrationExpiryDate} onChange={e => set('registrationExpiryDate', e.target.value)} />
                </div>
              </div>
              <div className="modal-field">
                <label>Registration Council *</label>
                <input value={form.registrationCouncil} onChange={e => set('registrationCouncil', e.target.value)} placeholder="Rehabilitation Council of India" />
              </div>
              <div className="modal-field">
                <label>Years of Experience *</label>
                <input type="number" min={0} value={form.yearsOfExperience} onChange={e => set('yearsOfExperience', e.target.value)} placeholder="5" />
              </div>
              <ChipSelect
                label="Specializations * (select all that apply)"
                options={SPECIALIZATIONS}
                value={form.specializations}
                onChange={v => set('specializations', v)}
              />
              <ChipSelect
                label="Languages Spoken *"
                options={LANGUAGES}
                value={form.languagesSpoken}
                onChange={v => set('languagesSpoken', v)}
              />
            </>
          )}

          {/* ── Education ── */}
          <SectionHeader title="Education" open={sections.education} onToggle={() => toggleSection('education')} />
          {sections.education && (
            <>
              <div className="modal-field">
                <label>Highest Degree *</label>
                <input value={form.highestDegree} onChange={e => set('highestDegree', e.target.value)} placeholder="M.Phil Clinical Psychology" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label>University / Institute *</label>
                  <input value={form.university} onChange={e => set('university', e.target.value)} placeholder="NIMHANS, Bangalore" />
                </div>
                <div className="modal-field">
                  <label>Graduation Year *</label>
                  <input type="number" value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)} placeholder="2015" />
                </div>
              </div>
            </>
          )}

          {/* ── Practice Details ── */}
          <SectionHeader title="Practice Details" open={sections.practice} onToggle={() => toggleSection('practice')} />
          {sections.practice && (
            <>
              <div className="modal-field">
                <label>Bio * <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(max 1000 chars)</span></label>
                <textarea
                  value={form.bio}
                  onChange={e => set('bio', e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Brief professional bio..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{form.bio.length}/1000</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="modal-field">
                  <label>Consultation Fee (₹) *</label>
                  <input type="number" min={0} value={form.consultationFee} onChange={e => set('consultationFee', e.target.value)} placeholder="1500" />
                </div>
                <div className="modal-field">
                  <label>Session Duration</label>
                  <select value={form.sessionDurationMinutes} onChange={e => set('sessionDurationMinutes', e.target.value)}>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.offersOnline} onChange={e => set('offersOnline', e.target.checked)} />
                  Offers Online Sessions
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.offersInPerson} onChange={e => set('offersInPerson', e.target.checked)} />
                  Offers In-Person Sessions
                </label>
              </div>
            </>
          )}

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 16 }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Creating...</> : 'Create Therapist & Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Therapists Page ────────────────────────────────────────────────────

export default function Therapists() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number; page: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTherapists({
        page, limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setTherapists(data.therapists);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete therapist "${name}"? Their Firebase account will also be removed.`)) return;
    try {
      await deleteTherapist(id);
      showToast('Therapist deleted.');
      load();
    } catch {
      showToast('Delete failed.');
    }
  };

  const handleResend = async (id: string) => {
    setResending(id);
    try {
      await resendTherapistCredentials(id);
      showToast('New credentials sent via email.');
    } catch {
      showToast('Failed to resend credentials.');
    } finally {
      setResending(null);
    }
  };

  const handleStatusToggle = async (t: Therapist) => {
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    try {
      await updateTherapist(t._id, { status: newStatus });
      load();
    } catch {
      showToast('Status update failed.');
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'badge-green',
      inactive: 'badge-gray',
      suspended: 'badge-red',
      pending_verification: 'badge-yellow',
    };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s.replace('_', ' ')}</span>;
  };

  const initials = (t: Therapist) =>
    `${t.firstName[0] || ''}${t.lastName[0] || ''}`.toUpperCase();

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, background: '#1a1a2e', color: 'white',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Therapists</h1>
            <p>Add and manage verified therapists on the platform.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Therapist
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Search by name, email, city or reg. number..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending Verification</option>
          </select>
          {pagination && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {pagination.total} total
            </span>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Therapist</th>
                <th>Credentials</th>
                <th>Specializations</th>
                <th>Location</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="loading-center"><div className="spinner" /></div></td></tr>
              ) : therapists.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div style={{ fontSize: 32, marginBottom: 8 }}>👩‍⚕️</div>
                      <div style={{ fontWeight: 600 }}>No therapists yet</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Click "Add Therapist" to get started.</div>
                    </div>
                  </td>
                </tr>
              ) : therapists.map(t => (
                <tr key={t._id}>
                  <td>
                    <div className="avatar-group">
                      <div className="avatar">
                        {t.profilePictureUrl
                          ? <img src={t.profilePictureUrl} alt="" />
                          : initials(t)}
                      </div>
                      <div>
                        <div className="avatar-name">{t.firstName} {t.lastName}</div>
                        <div className="avatar-sub">{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.licenseType}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.registrationNumber}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.yearsOfExperience} yrs exp</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {t.specializations.slice(0, 2).map(s => (
                        <span key={s} className="badge badge-blue" style={{ fontSize: 10 }}>{s}</span>
                      ))}
                      {t.specializations.length > 2 && (
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>+{t.specializations.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{t.city}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.state}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>₹{t.consultationFee}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.sessionDurationMinutes} min</div>
                  </td>
                  <td>
                    <div
                      onClick={() => handleStatusToggle(t)}
                      style={{ cursor: 'pointer' }}
                      title="Click to toggle active/inactive"
                    >
                      {statusBadge(t.status)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleResend(t._id)}
                        disabled={resending === t._id}
                        title="Resend login credentials"
                      >
                        <RefreshCw size={13} className={resending === t._id ? 'spinning' : ''} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(t._id, `${t.firstName} ${t.lastName}`)}
                        title="Delete therapist"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <span key={p} style={{ display: 'contents' }}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                  )}
                  <button className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                </span>
              ))}
            <button className="page-btn" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {showAdd && (
        <AddTherapistModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { load(); showToast('Therapist created! Credentials sent via email.'); }}
        />
      )}
    </div>
  );
}
