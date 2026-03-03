import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('fields');
  const [fields, setFields] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [fieldForm, setFieldForm] = useState({
    name: '', area: '', address: '',
    field_rules: '', images: [],
    has_toilet: false, has_parking: false,
    has_shop: false, has_shoe_rent: false
  });

  const [gameForm, setGameForm] = useState({
    title: '', field_id: '', area: '', format: '5v5',
    date: '', time: '', slots: 10, price: '',
    description: '', game_rules: '', shoes_type: ''
  });

  const AREAS = ['Subang', 'Petaling Jaya', 'KL', 'Shah Alam', 'Cheras', 'Ampang'];
  const SHOES = ['Futsal Shoes', 'Running Shoes', 'Both Allowed', 'No Metal Studs'];

  useEffect(() => {
    fetchFields();
    fetchGames();
  }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from('fields').select('*').order('name');
    if (data) setFields(data);
  };

  const fetchGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*, fields(name)')
      .order('date', { ascending: true });
    if (data) setGames(data);
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (msg) => {
    setError(msg);
    setSuccess('');
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImage(true);
    const uploadedUrls = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('field-images')
        .upload(fileName, file);
      if (uploadError) {
        showError('Upload failed for ' + file.name + ': ' + uploadError.message);
        continue;
      }
      const { data } = supabase.storage.from('field-images').getPublicUrl(fileName);
      uploadedUrls.push(data.publicUrl);
    }
    setFieldForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleAddField = async () => {
    if (!fieldForm.name || !fieldForm.area || !fieldForm.address) {
      showError('Please fill in name, area and address.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('fields').insert({
      name: fieldForm.name,
      area: fieldForm.area,
      address: fieldForm.address,
      field_rules: fieldForm.field_rules,
      images: fieldForm.images,
      has_toilet: fieldForm.has_toilet,
      has_parking: fieldForm.has_parking,
      has_shop: fieldForm.has_shop,
      has_shoe_rent: fieldForm.has_shoe_rent,
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Field added successfully!');
      setFieldForm({
        name: '', area: '', address: '',
        field_rules: '', images: [],
        has_toilet: false, has_parking: false,
        has_shop: false, has_shoe_rent: false
      });
      fetchFields();
    }
    setLoading(false);
  };

  const handleAddGame = async () => {
    if (!gameForm.title || !gameForm.field_id || !gameForm.date || !gameForm.time || !gameForm.price) {
      showError('Please fill in all required game details.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('games').insert({
      title: gameForm.title,
      field_id: gameForm.field_id,
      area: gameForm.area,
      format: gameForm.format,
      date: gameForm.date,
      time: gameForm.time,
      slots: parseInt(gameForm.slots),
      price: parseInt(gameForm.price),
      description: gameForm.description,
      game_rules: gameForm.game_rules,
      shoes_type: gameForm.shoes_type,
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Game added successfully!');
      setGameForm({
        title: '', field_id: '', area: '', format: '5v5',
        date: '', time: '', slots: 10, price: '',
        description: '', game_rules: '', shoes_type: ''
      });
      fetchGames();
    }
    setLoading(false);
  };

  const handleDeleteField = async (id) => {
    if (!confirm('Delete this field? All games linked to it will also be permanently deleted!')) return;
    const { error } = await supabase.from('fields').delete().eq('id', id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Field deleted.');
      fetchFields();
    }
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Delete this game?')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Game deleted.');
      fetchGames();
    }
  };

  const labelStyle = {
    fontSize: 12, color: 'var(--muted)',
    letterSpacing: 1, marginBottom: 6, display: 'block'
  };

  const checkboxLabel = {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 14, color: 'var(--text)', cursor: 'pointer'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue'", fontSize: 40,
            letterSpacing: 3, marginBottom: 4, color: 'var(--text)'
          }}>
            ADMIN PANEL
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Manage fields and games for Bolahh</p>
        </div>

        {/* Messages */}
        {success && (
          <div style={{
            background: 'rgba(240,157,81,0.12)', border: '1px solid rgba(240,157,81,0.3)',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
            color: 'var(--accent)', fontSize: 13, fontWeight: 600
          }}>✅ {success}</div>
        )}
        {error && (
          <div style={{
            background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
            color: 'var(--red)', fontSize: 13
          }}>❌ {error}</div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['fields', 'games'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? 'var(--accent)' : 'var(--card)',
              color: activeTab === tab ? '#fff' : 'var(--muted)',
              border: `1px solid ${activeTab === tab ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 24px', fontSize: 13, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 1, transition: 'all 0.15s'
            }}>{tab}</button>
          ))}
        </div>

        {/* FIELDS TAB */}
        {activeTab === 'fields' && (
          <div>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24, marginBottom: 20
            }}>
              <h3 style={{
                fontFamily: "'Bebas Neue'", fontSize: 22,
                letterSpacing: 2, marginBottom: 20, color: 'var(--text)'
              }}>
                ADD NEW FIELD
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>FIELD NAME *</label>
                  <input placeholder="e.g. Subang Futsal Arena" value={fieldForm.name}
                    onChange={e => setFieldForm({ ...fieldForm, name: e.target.value })} />
                </div>

                <div>
                  <label style={labelStyle}>AREA *</label>
                  <select value={fieldForm.area}
                    onChange={e => setFieldForm({ ...fieldForm, area: e.target.value })}>
                    <option value="">Select area...</option>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>ADDRESS *</label>
                  <input placeholder="e.g. Jalan SS15, Subang Jaya" value={fieldForm.address}
                    onChange={e => setFieldForm({ ...fieldForm, address: e.target.value })} />
                </div>

                {/* Image upload */}
                <div>
                  <label style={labelStyle}>FIELD IMAGES</label>
                  <div
                    onClick={() => document.getElementById('field-image-input').click()}
                    style={{
                      border: '2px dashed var(--border)', borderRadius: 10,
                      padding: '24px', textAlign: 'center', cursor: 'pointer',
                      background: 'var(--card2)', transition: 'border-color 0.2s',
                      marginBottom: fieldForm.images.length ? 12 : 0
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {uploadingImage ? 'Uploading...' : 'Click to upload field photos'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      JPG, PNG supported · Multiple files allowed
                    </div>
                  </div>
                  <input id="field-image-input" type="file" accept="image/*" multiple
                    style={{ display: 'none' }} onChange={handleImageUpload} />
                  {fieldForm.images.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 8, marginTop: 4
                    }}>
                      {fieldForm.images.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} alt={`Field ${i + 1}`}
                            style={{
                              width: '100%', height: 100, objectFit: 'cover',
                              borderRadius: 8, border: '1px solid var(--border)'
                            }} />
                          <button
                            onClick={() => setFieldForm(prev => ({
                              ...prev, images: prev.images.filter((_, idx) => idx !== i)
                            }))}
                            style={{
                              position: 'absolute', top: 5, right: 5,
                              background: 'rgba(0,0,0,0.65)', color: '#fff',
                              border: 'none', borderRadius: 6,
                              padding: '2px 8px', fontSize: 11, cursor: 'pointer'
                            }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>FIELD RULES</label>
                  <textarea
                    placeholder="e.g. No smoking, no food inside, max 12 players..."
                    value={fieldForm.field_rules}
                    onChange={e => setFieldForm({ ...fieldForm, field_rules: e.target.value })}
                    rows={3} style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>FACILITIES AVAILABLE</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'has_toilet', label: '🚽 Toilet' },
                      { key: 'has_parking', label: '🅿️ Parking' },
                      { key: 'has_shop', label: '🏪 Shop / Canteen' },
                      { key: 'has_shoe_rent', label: '👟 Shoe Rent' },
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
              </div>

              <button onClick={handleAddField} disabled={loading} style={{
                marginTop: 20, width: '100%', padding: '12px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 10, fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1
              }}>
                {loading ? 'Adding...' : '+ Add Field'}
              </button>
            </div>

            {/* Existing fields */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                fontWeight: 600, fontSize: 14, color: 'var(--text)'
              }}>
                Existing Fields ({fields.length})
              </div>
              {fields.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                  No fields added yet.
                </div>
              ) : (
                fields.map((field, i) => (
                  <div key={field.id} style={{
                    padding: '14px 20px',
                    borderBottom: i < fields.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{field.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>📍 {field.area} · {field.address}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {field.has_toilet && '🚽 '}
                        {field.has_parking && '🅿️ '}
                        {field.has_shop && '🏪 '}
                        {field.has_shoe_rent && '👟'}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteField(field.id)} style={{
                      background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(240,101,67,0.25)',
                      borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600
                    }}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* GAMES TAB */}
        {activeTab === 'games' && (
          <div>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24, marginBottom: 20
            }}>
              <h3 style={{
                fontFamily: "'Bebas Neue'", fontSize: 22,
                letterSpacing: 2, marginBottom: 20, color: 'var(--text)'
              }}>
                ADD NEW GAME
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>GAME TITLE *</label>
                  <input placeholder="e.g. Evening Kickoff" value={gameForm.title}
                    onChange={e => setGameForm({ ...gameForm, title: e.target.value })} />
                </div>

                <div>
                  <label style={labelStyle}>FIELD *</label>
                  <select value={gameForm.field_id} onChange={e => {
                    const selected = fields.find(f => f.id === e.target.value);
                    setGameForm({ ...gameForm, field_id: e.target.value, area: selected?.area || '' });
                  }}>
                    <option value="">Select a field...</option>
                    {fields.map(f => <option key={f.id} value={f.id}>{f.name} — {f.area}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>FORMAT *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['5v5', '6v6'].map(f => (
                      <button key={f} onClick={() => setGameForm({ ...gameForm, format: f })} style={{
                        background: gameForm.format === f ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                        color: gameForm.format === f ? 'var(--accent)' : 'var(--muted)',
                        border: `1px solid ${gameForm.format === f ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 8, padding: '8px 24px', fontSize: 13,
                        fontWeight: 600, transition: 'all 0.15s'
                      }}>{f}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>DATE *</label>
                    <input type="date" value={gameForm.date}
                      onChange={e => setGameForm({ ...gameForm, date: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>TIME *</label>
                    <input type="time" value={gameForm.time}
                      onChange={e => setGameForm({ ...gameForm, time: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>TOTAL SLOTS *</label>
                    <input type="number" value={gameForm.slots}
                      onChange={e => setGameForm({ ...gameForm, slots: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>PRICE (RM) *</label>
                    <input type="number" placeholder="e.g. 15" value={gameForm.price}
                      onChange={e => setGameForm({ ...gameForm, price: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>MATCH DESCRIPTION</label>
                  <textarea placeholder="Tell players what to expect in this game..."
                    value={gameForm.description}
                    onChange={e => setGameForm({ ...gameForm, description: e.target.value })}
                    rows={3} style={{ resize: 'vertical' }} />
                </div>

                <div>
                  <label style={labelStyle}>GAME RULES</label>
                  <textarea placeholder="e.g. No sliding tackles, fair play, respect referee..."
                    value={gameForm.game_rules}
                    onChange={e => setGameForm({ ...gameForm, game_rules: e.target.value })}
                    rows={3} style={{ resize: 'vertical' }} />
                </div>

                <div>
                  <label style={labelStyle}>SHOES TYPE REQUIRED</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {SHOES.map(s => (
                      <button key={s}
                        onClick={() => setGameForm({ ...gameForm, shoes_type: gameForm.shoes_type === s ? '' : s })}
                        style={{
                          background: gameForm.shoes_type === s ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                          color: gameForm.shoes_type === s ? 'var(--accent)' : 'var(--muted)',
                          border: `1px solid ${gameForm.shoes_type === s ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 8, padding: '8px 16px',
                          fontSize: 13, fontWeight: 500, transition: 'all 0.15s'
                        }}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleAddGame} disabled={loading} style={{
                marginTop: 20, width: '100%', padding: '12px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 10, fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1
              }}>
                {loading ? 'Adding...' : '+ Add Game'}
              </button>
            </div>

            {/* Existing games */}
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                fontWeight: 600, fontSize: 14, color: 'var(--text)'
              }}>
                Existing Games ({games.length})
              </div>
              {games.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                  No games added yet.
                </div>
              ) : (
                games.map((game, i) => (
                  <div key={game.id} style={{
                    padding: '14px 20px',
                    borderBottom: i < games.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{game.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        📍 {game.fields?.name} · 📅 {game.date} · {game.format}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2, fontFamily: "'Space Mono'" }}>
                        RM {game.price} · {game.slots} slots
                      </div>
                    </div>
                    <button onClick={() => handleDeleteGame(game.id)} style={{
                      background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(240,101,67,0.25)',
                      borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600
                    }}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
