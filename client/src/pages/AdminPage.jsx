import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { GiRunningShoe } from 'react-icons/gi';
import { FaSquareParking } from 'react-icons/fa6';
import { LuToilet } from 'react-icons/lu';
import { CiShop } from 'react-icons/ci';
import { IoCheckmarkDoneCircleSharp } from 'react-icons/io5';
import { MdError, MdOutlineStadium } from 'react-icons/md';
import FifaCard from '../components/FifaCard';
import { drawCardImage } from '../lib/cardCanvas';
import { RANKS } from '../lib/rankUtils';

const AREAS = ['Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang', 'Ansan'];

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fields');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cardBgs, setCardBgs] = useState([]);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const cardAvatarRef = useRef(null);
  const [cardForm, setCardForm] = useState({
    name: 'PLAYER ONE', position: 'Attacker', rank: 'Novis',
    pac: 72, sho: 68, pas: 75, dri: 70, def: 60, phy: 65,
    games_played: 0,
  });
  const [cardAvatarPreview, setCardAvatarPreview] = useState(null);
  const [cardDownloading, setCardDownloading] = useState(false);

  const cardOverall = Math.round(
    [cardForm.pac, cardForm.sho, cardForm.pas, cardForm.dri, cardForm.def, cardForm.phy]
      .reduce((a, b) => a + b, 0) / 6
  );

  const CARD_STAT_FIELDS = [
    { key: 'pac', label: 'PAC' }, { key: 'sho', label: 'SHO' },
    { key: 'pas', label: 'PAS' }, { key: 'dri', label: 'DRI' },
    { key: 'def', label: 'DEF' }, { key: 'phy', label: 'PHY' },
  ];

  const handleCardAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (cardAvatarPreview) URL.revokeObjectURL(cardAvatarPreview);
    setCardAvatarPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleDownloadCard = async (fmt = 'png') => {
    setCardDownloading(true);
    try {
      const profile = {
        name: cardForm.name || 'PLAYER',
        position: cardForm.position,
        avatar_url: cardAvatarPreview,
        games_played: cardForm.games_played,
        total_points: cardOverall,
      };
      const stats = { pac: cardForm.pac, sho: cardForm.sho, pas: cardForm.pas, dri: cardForm.dri, def: cardForm.def, phy: cardForm.phy };
      const canvas = await drawCardImage({ profile, cardStats: stats, rank: cardForm.rank });
      const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      const a = document.createElement('a');
      a.href = canvas.toDataURL(mime, 0.92);
      a.download = `bolahh-promo-${(cardForm.name || 'card').toLowerCase().replace(/\s+/g, '-')}.${fmt}`;
      a.click();
    } finally {
      setCardDownloading(false);
    }
  };

  const [fieldForm, setFieldForm] = useState({
    name: '', area: '', address: '', field_rules: '', images: [],
    has_toilet: false, has_parking: false, has_shop: false, has_shoe_rent: false
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFields(), fetchCardBgs()]);
    setLoading(false);
  };

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*').order('name');
    if (data) setFields(data);
  };

  const fetchCardBgs = async () => {
    const { data } = await supabase.storage.from('card-backgrounds').list('', { sortBy: { column: 'created_at', order: 'asc' } });
    if (!data) return;
    const bgs = data
      .filter(f => f.name && !f.name.startsWith('.'))
      .map(f => ({
        name: f.name,
        url: supabase.storage.from('card-backgrounds').getPublicUrl(f.name).data.publicUrl,
      }));
    setCardBgs(bgs);
  };

  const showSuccess = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
  const showError = (msg) => { setError(msg); setSuccess(''); };

  const resetFieldForm = () => setFieldForm({
    name: '', area: '', address: '', field_rules: '', images: [],
    has_toilet: false, has_parking: false, has_shop: false, has_shoe_rent: false
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImage(true);
    const uploadedUrls = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('field-images').upload(fileName, file);
      if (uploadError) { showError('Upload failed: ' + uploadError.message); continue; }
      const { data } = supabase.storage.from('field-images').getPublicUrl(fileName);
      uploadedUrls.push(data.publicUrl);
    }
    setFieldForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleAddField = async () => {
    if (!fieldForm.name || !fieldForm.area || !fieldForm.address) { showError('Fill in name, area and address.'); return; }
    const { error } = await supabase.from('fields').insert({
      name: fieldForm.name, area: fieldForm.area, address: fieldForm.address,
      field_rules: fieldForm.field_rules, images: fieldForm.images,
      has_toilet: fieldForm.has_toilet, has_parking: fieldForm.has_parking,
      has_shop: fieldForm.has_shop, has_shoe_rent: fieldForm.has_shoe_rent,
    });
    if (error) { showError(error.message); return; }
    showSuccess('Field added!'); resetFieldForm(); fetchFields();
  };

  const handleEditField = (field) => {
    setEditingField(field.id);
    setFieldForm({
      name: field.name, area: field.area, address: field.address,
      field_rules: field.field_rules || '', images: field.images || [],
      has_toilet: field.has_toilet, has_parking: field.has_parking,
      has_shop: field.has_shop, has_shoe_rent: field.has_shoe_rent,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateField = async () => {
    if (!fieldForm.name || !fieldForm.area || !fieldForm.address) { showError('Fill in name, area and address.'); return; }
    const { error } = await supabase.from('fields').update({
      name: fieldForm.name, area: fieldForm.area, address: fieldForm.address,
      field_rules: fieldForm.field_rules, images: fieldForm.images,
      has_toilet: fieldForm.has_toilet, has_parking: fieldForm.has_parking,
      has_shop: fieldForm.has_shop, has_shoe_rent: fieldForm.has_shoe_rent,
    }).eq('id', editingField);
    if (error) { showError(error.message); return; }
    showSuccess('Field updated!'); setEditingField(null); resetFieldForm(); fetchFields();
  };

  const handleDeleteField = async (id) => {
    if (!confirm('Delete this field? All linked games will also be deleted!')) return;
    const { error } = await supabase.from('fields').delete().eq('id', id);
    if (error) { showError(error.message); return; }
    showSuccess('Field deleted.'); fetchFields();
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBg(true); setError(''); setSuccess('');
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('card-backgrounds').upload(filename, file);
    if (uploadErr) { setError('Upload failed: ' + uploadErr.message); }
    else { setSuccess('Background uploaded.'); await fetchCardBgs(); }
    setUploadingBg(false);
    e.target.value = '';
  };

  const handleBgDelete = async (name) => {
    const { error: delErr } = await supabase.storage.from('card-backgrounds').remove([name]);
    if (delErr) { setError('Delete failed: ' + delErr.message); }
    else { setSuccess('Background deleted.'); await fetchCardBgs(); }
  };

  const labelStyle = { fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block' };
  const checkboxLabel = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text)', cursor: 'pointer' };
  const sectionCard = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 };

  const TABS = [
    { key: 'fields',      label: 'Fields'      },
    { key: 'backgrounds', label: 'Card BG'     },
    { key: 'cardmaker',   label: 'Card Maker'  },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        <div className="fade-up" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
              ADMIN PANEL
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>System management — fields & card backgrounds</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/manager')} style={{
              background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
              border: '1px solid rgba(240,157,81,0.3)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 600
            }}>Manager Dashboard →</button>
            <button onClick={() => navigate('/home')} style={{
              background: 'transparent', color: 'var(--text)',
              border: '1px solid var(--muted)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13
            }}>← Back to Home</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Fields', val: fields.length, icon: <MdOutlineStadium /> },
            { label: 'Card Backgrounds', val: cardBgs.length, icon: '🎴' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--accent)', letterSpacing: 1 }}>{s.val}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: 'rgba(240,157,81,0.12)', border: '1px solid rgba(240,157,81,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            <IoCheckmarkDoneCircleSharp /> {success}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
            <MdError /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--card)',
              color: activeTab === tab.key ? '#fff' : 'var(--muted)',
              border: `1px solid ${activeTab === tab.key ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── FIELDS TAB ── */}
        {activeTab === 'fields' && (
          <div>
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 20 }}>
                {editingField ? 'EDIT FIELD' : 'ADD NEW FIELD'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>FIELD NAME *</label>
                  <input placeholder="e.g. Subang Futsal Arena" value={fieldForm.name}
                    onChange={e => setFieldForm({ ...fieldForm, name: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>AREA *</label>
                  <select value={fieldForm.area} onChange={e => setFieldForm({ ...fieldForm, area: e.target.value })}>
                    <option value="">Select area...</option>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ADDRESS *</label>
                  <input placeholder="e.g. Jalan SS15, Subang Jaya" value={fieldForm.address}
                    onChange={e => setFieldForm({ ...fieldForm, address: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>FIELD IMAGES</label>
                  <div onClick={() => document.getElementById('admin-field-img-input').click()} style={{
                    border: '2px dashed var(--border)', borderRadius: 10, padding: '20px',
                    textAlign: 'center', cursor: 'pointer', background: 'var(--card2)',
                    marginBottom: fieldForm.images.length ? 12 : 0
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📸</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{uploadingImage ? 'Uploading...' : 'Click to upload photos'}</div>
                  </div>
                  <input id="admin-field-img-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
                  {fieldForm.images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 4 }}>
                      {fieldForm.images.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                          <button onClick={() => setFieldForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 7px', fontSize: 11 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>FIELD RULES</label>
                  <textarea placeholder="e.g. No smoking..." value={fieldForm.field_rules}
                    onChange={e => setFieldForm({ ...fieldForm, field_rules: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={labelStyle}>FACILITIES</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[{ key: 'has_toilet', label: 'Toilet' }, { key: 'has_parking', label: 'Parking' },
                      { key: 'has_shop', label: 'Shop / Canteen' }, { key: 'has_shoe_rent', label: 'Shoe Rent' }
                    ].map(({ key, label }) => (
                      <label key={key} style={checkboxLabel}>
                        <input type="checkbox" checked={fieldForm[key] || false}
                          onChange={e => setFieldForm({ ...fieldForm, [key]: e.target.checked })}
                          style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={editingField ? handleUpdateField : handleAddField} style={{
                    flex: 1, padding: '12px', background: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14
                  }}>{editingField ? 'Save Changes' : '+ Add Field'}</button>
                  {editingField && (
                    <button onClick={() => { setEditingField(null); resetFieldForm(); }} style={{
                      flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
                      border: '1px solid var(--border)', borderRadius: 10, fontSize: 14
                    }}>Cancel</button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                All Fields ({fields.length})
              </div>
              {fields.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No fields yet.</div>
              ) : fields.map((field, i) => (
                <div key={field.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < fields.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{field.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>📍 {field.area} · {field.address}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {field.has_toilet && <LuToilet />}{field.has_parking && <FaSquareParking />}{field.has_shop && <CiShop />}{field.has_shoe_rent && <GiRunningShoe />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleEditField(field)} style={{
                      background: 'var(--card2)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12
                    }}>Edit</button>
                    <button onClick={() => handleDeleteField(field.id)} style={{
                      background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BACKGROUNDS TAB ── */}
        {activeTab === 'backgrounds' && (
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>CARD BACKGROUNDS</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                Upload backgrounds players can pick when sharing their card. Recommended: 9:16 portrait, min 1080×1920px.
              </p>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: uploadingBg ? 'var(--card2)' : 'var(--accent)',
                color: uploadingBg ? 'var(--muted)' : '#fff',
                fontWeight: 700, fontSize: 13, cursor: uploadingBg ? 'default' : 'pointer',
                opacity: uploadingBg ? 0.6 : 1,
              }}>
                {uploadingBg ? 'Uploading...' : '+ Upload Background'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} disabled={uploadingBg} />
              </label>
            </div>

            {cardBgs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
                No backgrounds uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {cardBgs.map(bg => (
                  <div key={bg.name} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '9/16', background: 'var(--card)' }}>
                    <img src={bg.url} alt={bg.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)',
                    }} />
                    <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                      <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bg.name.replace(/\.[^.]+$/, '').replace(/-|_/g, ' ')}
                      </div>
                      <button onClick={() => handleBgDelete(bg.name)} style={{
                        background: 'rgba(240,101,67,0.85)', color: '#fff',
                        border: 'none', borderRadius: 6, padding: '4px 10px',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%',
                      }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CARD MAKER TAB ── */}
        {activeTab === 'cardmaker' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 24, alignItems: 'start' }}>

              {/* Controls */}
              <div style={sectionCard}>
                <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 20 }}>CARD SETTINGS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>PLAYER NAME</label>
                      <input
                        placeholder="e.g. AMIR HAZIF"
                        value={cardForm.name}
                        onChange={e => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div style={{ flex: '0 0 130px' }}>
                      <label style={labelStyle}>POSITION</label>
                      <select value={cardForm.position} onChange={e => setCardForm({ ...cardForm, position: e.target.value })}>
                        {['Attacker', 'Midfielder', 'Defender', 'Goalkeeper'].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>RANK (controls card colour)</label>
                    <select value={cardForm.rank} onChange={e => setCardForm({ ...cardForm, rank: e.target.value })}>
                      {RANKS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>AVATAR</label>
                    <input type="file" ref={cardAvatarRef} accept="image/*" onChange={handleCardAvatarChange} style={{ display: 'none' }} />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {cardAvatarPreview && (
                        <img src={cardAvatarPreview} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
                      )}
                      <button
                        onClick={() => cardAvatarRef.current?.click()}
                        style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}
                      >
                        {cardAvatarPreview ? 'Change Avatar' : '+ Upload Avatar'}
                      </button>
                      {cardAvatarPreview && (
                        <button
                          onClick={() => { URL.revokeObjectURL(cardAvatarPreview); setCardAvatarPreview(null); }}
                          style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                        >Remove</button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>STATS</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {CARD_STAT_FIELDS.map(({ key, label }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 32, fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1 }}>{label}</span>
                          <input
                            type="range" min={30} max={99}
                            value={cardForm[key]}
                            onChange={e => setCardForm({ ...cardForm, [key]: parseInt(e.target.value) })}
                            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                          <span style={{ width: 28, fontFamily: "'Space Mono'", fontSize: 14, fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>
                            {cardForm[key]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>GAMES PLAYED</label>
                    <input
                      type="number" min={0}
                      value={cardForm.games_played}
                      onChange={e => setCardForm({ ...cardForm, games_played: Math.max(0, parseInt(e.target.value) || 0) })}
                      style={{ maxWidth: 120 }}
                    />
                  </div>

                </div>
              </div>

              {/* Preview + Download */}
              <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <div style={{ ...sectionCard, padding: 20, textAlign: 'center', marginBottom: 0 }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>LIVE PREVIEW</div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <FifaCard
                      profile={{
                        name: cardForm.name || 'PLAYER',
                        position: cardForm.position,
                        avatar_url: cardAvatarPreview,
                        games_played: cardForm.games_played,
                        total_points: cardOverall,
                      }}
                      cardStats={{ pac: cardForm.pac, sho: cardForm.sho, pas: cardForm.pas, dri: cardForm.dri, def: cardForm.def, phy: cardForm.phy }}
                      rank={cardForm.rank}
                    />
                  </div>
                  <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                    OVR {cardOverall} · {cardForm.rank}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button
                    onClick={() => handleDownloadCard('png')}
                    disabled={cardDownloading}
                    style={{
                      flex: 1, padding: '11px 0', background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
                      opacity: cardDownloading ? 0.6 : 1, cursor: cardDownloading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {cardDownloading ? 'Generating…' : 'Download PNG'}
                  </button>
                  <button
                    onClick={() => handleDownloadCard('jpg')}
                    disabled={cardDownloading}
                    style={{
                      padding: '11px 16px', background: 'var(--card2)', color: 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 10, fontWeight: 700, fontSize: 13,
                      opacity: cardDownloading ? 0.6 : 1, cursor: cardDownloading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    JPG
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
