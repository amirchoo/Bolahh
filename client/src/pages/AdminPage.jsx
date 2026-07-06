import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { usePersistedState } from '../lib/usePersistedState';
import Navbar from '../components/Navbar';
import { GiRunningShoe } from 'react-icons/gi';
import { FaSquareParking, FaLocationDot } from 'react-icons/fa6';
import { LuToilet, LuTag } from 'react-icons/lu';
import { CiShop } from 'react-icons/ci';
import { IoCheckmarkDoneCircleSharp, IoClose, IoImages, IoCamera } from 'react-icons/io5';
import { MdError, MdOutlineStadium, MdSave, MdSportsSoccer } from 'react-icons/md';
import FifaCard, { buildCustomTheme, getCardTheme, POSITION_ABBR, STATS, STICKER_ICONS } from '../components/FifaCard';
import { drawCardImage } from '../lib/cardCanvas';
import { RANKS, getRankColor } from '../lib/rankUtils';

const AREAS = ['Kuala Lumpur', 'Petaling Jaya', 'Subang', 'Shah Alam', 'Ansan'];

const DEFAULT_DESIGN = {
  gradFrom: '#b8860b', gradMid: '#ffd700', gradTo: '#b8860b',
  borderColor: '#ffd700',
  textDark: true,
  badgeLabel: 'TOTY',
  badgeColor: '#ffd700',
  glowEnabled: true,
  glowColor: '#ffd700',
  foilEnabled: false,
  pattern: 'none',
  patternColor: '#ffffff',
  patternOpacity: 0.15,
  elemCorners: false,
  elemSideBars: false,
  elemCenterDiamond: false,
  elemFrame: false,
  elemColor: '#ffffff',
  elemOpacity: 0.3,
  stickerIcon: 'none',
  stickerPos: 'top-center',
  stickerSize: 36,
  stickerColor: '#ffffff',
  stickerOpacity: 0.9,
};

const CARD_PRESETS = [
  { key: 'emas',   label: 'Emas',   accent: '#ffd700', gradFrom: '#b8860b', gradMid: '#ffd700', gradTo: '#b8860b', borderColor: '#ffd700', textDark: true,  badgeLabel: '',       badgeColor: '#ffd700', glowEnabled: false, glowColor: '#ffd700', foilEnabled: false },
  { key: 'toty',   label: 'TOTY',   accent: '#e0a020', gradFrom: '#5a3a00', gradMid: '#c08020', gradTo: '#5a3a00', borderColor: '#e0a020', textDark: false, badgeLabel: 'TOTY',   badgeColor: '#e0a020', glowEnabled: true,  glowColor: '#e0a020', foilEnabled: true  },
  { key: 'icon',   label: 'Icon',   accent: '#d4af37', gradFrom: '#111111', gradMid: '#252525', gradTo: '#111111', borderColor: '#d4af37', textDark: false, badgeLabel: 'ICON',   badgeColor: '#d4af37', glowEnabled: true,  glowColor: '#d4af37', foilEnabled: false },
  { key: 'hero',   label: 'Hero',   accent: '#5090ff', gradFrom: '#041428', gradMid: '#0e2d6e', gradTo: '#041428', borderColor: '#5090ff', textDark: false, badgeLabel: 'HERO',   badgeColor: '#5090ff', glowEnabled: true,  glowColor: '#3060cc', foilEnabled: false },
  { key: 'tots',   label: 'TOTS',   accent: '#00c454', gradFrom: '#041c10', gradMid: '#085828', gradTo: '#041c10', borderColor: '#00c454', textDark: false, badgeLabel: 'TOTS',   badgeColor: '#00c454', glowEnabled: true,  glowColor: '#00c454', foilEnabled: false },
  { key: 'promo',  label: 'Promo',  accent: '#c040ff', gradFrom: '#1e0838', gradMid: '#4a1278', gradTo: '#1e0838', borderColor: '#c040ff', textDark: false, badgeLabel: 'PROMO',  badgeColor: '#c040ff', glowEnabled: true,  glowColor: '#c040ff', foilEnabled: false },
  { key: 'event',  label: 'Event',  accent: '#00c8e0', gradFrom: '#041c26', gradMid: '#085878', gradTo: '#041c26', borderColor: '#00c8e0', textDark: false, badgeLabel: 'EVENT',  badgeColor: '#00c8e0', glowEnabled: true,  glowColor: '#00c8e0', foilEnabled: false },
  { key: 'legend', label: 'Legend', accent: '#ff6000', gradFrom: '#1a0800', gradMid: '#3c1000', gradTo: '#1a0800', borderColor: '#ff6000', textDark: false, badgeLabel: 'LEGEND', badgeColor: '#ff6000', glowEnabled: true,  glowColor: '#ff6000', foilEnabled: false },
  { key: 'bolahh', label: 'Bolahh', accent: '#F09D51', gradFrom: '#3a1a00', gradMid: '#7a3c00', gradTo: '#3a1a00', borderColor: '#F09D51', textDark: false, badgeLabel: 'BOLAHH', badgeColor: '#F09D51', glowEnabled: true,  glowColor: '#F09D51', foilEnabled: false },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = usePersistedState('admin_tab', 'fields');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cardBgs, setCardBgs] = useState([]);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [editingField, setEditingField] = useState(null);

  // ── Banners state ─────────────────────────────────────
  const [banners, setBanners] = useState([]);
  const [bannerForm, setBannerForm] = useState({ title: '', subtitle: '', link_url: '', sort_order: 0, active: true, image_url: '' });
  const [uploadingBannerImg, setUploadingBannerImg] = useState(false);

  // ── Card Maker state ──────────────────────────────────
  const cardAvatarRef = useRef(null);
  const [cardForm, setCardForm] = useState({
    name: 'PLAYER ONE', position: 'Attacker', rank: 'Emas I',
    pac: 72, sho: 68, pas: 75, dri: 70, def: 60, phy: 65,
    games_played: 0,
    useCustomTheme: true,
    ...DEFAULT_DESIGN,
  });
  const [cardAvatarPreview, setCardAvatarPreview] = useState(null);
  const [cardDownloading, setCardDownloading] = useState(false);

  // Template save/load
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const cardOverall = Math.round(
    [cardForm.pac, cardForm.sho, cardForm.pas, cardForm.dri, cardForm.def, cardForm.phy]
      .reduce((a, b) => a + b, 0) / 6
  );

  const CARD_STAT_FIELDS = [
    { key: 'pac', label: 'PAC' }, { key: 'sho', label: 'SHO' },
    { key: 'pas', label: 'PAS' }, { key: 'dri', label: 'DRI' },
    { key: 'def', label: 'DEF' }, { key: 'phy', label: 'PHY' },
  ];

  const activeCustomTheme = cardForm.useCustomTheme ? buildCustomTheme(cardForm) : null;
  const activeBadge = cardForm.useCustomTheme && cardForm.badgeLabel ? cardForm.badgeLabel : null;

  // ── Game requests state ───────────────────────────────
  const [gameRequests, setGameRequests] = useState([]);

  // ── Coupons state ─────────────────────────────────────
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', discount_percentage: 10, max_uses: '', expires_at: '' });

  // ── Field form state ──────────────────────────────────
  const [fieldForm, setFieldForm] = useState({
    name: '', area: '', address: '', field_rules: '', images: [],
    has_toilet: false, has_parking: false, has_shop: false, has_shoe_rent: false
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFields(), fetchCardBgs(), fetchTemplates(), fetchBanners(), fetchCoupons(), fetchGameRequests()]);
    setLoading(false);
  };

  const fetchGameRequests = async () => {
    const { data } = await supabase.from('game_requests').select('*').order('created_at', { ascending: false });
    if (data) setGameRequests(data);
  };

  const handleDeleteGameRequest = async (id) => {
    const { error } = await supabase.from('game_requests').delete().eq('id', id);
    if (error) { showError(error.message); return; }
    setGameRequests(prev => prev.filter(r => r.id !== id));
  };

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data);
  };

  const handleAddCoupon = async () => {
    const code = couponForm.code.trim().toUpperCase();
    if (!code || !couponForm.discount_percentage) { showError('Code and discount % are required.'); return; }
    const payload = {
      code,
      discount_percentage: parseInt(couponForm.discount_percentage),
      max_uses: couponForm.max_uses !== '' ? parseInt(couponForm.max_uses) : null,
      expires_at: couponForm.expires_at || null,
      is_active: true,
    };
    const { error } = await supabase.from('coupons').insert(payload);
    if (error) { showError(error.message); return; }
    showSuccess(`Coupon "${code}" created!`);
    setCouponForm({ code: '', discount_percentage: 10, max_uses: '', expires_at: '' });
    fetchCoupons();
  };

  const handleToggleCoupon = async (coupon) => {
    const { error } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    if (error) { showError(error.message); return; }
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
  };

  const handleDeleteCoupon = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) { showError(error.message); return; }
    setCoupons(prev => prev.filter(c => c.id !== id));
    showSuccess('Coupon deleted.');
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

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('card_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSavedTemplates(data);
  };

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    if (data) setBanners(data);
  };

  const showSuccess = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
  const showError   = (msg) => { setError(msg); setSuccess(''); };

  // ── Field handlers ────────────────────────────────────
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
    const { error, count } = await supabase.from('fields').update({
      name: fieldForm.name, area: fieldForm.area, address: fieldForm.address,
      field_rules: fieldForm.field_rules, images: fieldForm.images,
      has_toilet: fieldForm.has_toilet, has_parking: fieldForm.has_parking,
      has_shop: fieldForm.has_shop, has_shoe_rent: fieldForm.has_shoe_rent,
    }, { count: 'exact' }).eq('id', editingField);
    if (error) { showError(error.message); return; }
    if (count === 0) {
      showError('Update blocked — your Supabase RLS policy is preventing this. Run the SQL fix below in your Supabase SQL editor.');
      console.error('RLS FIX — run in Supabase SQL editor:\ncreate policy "Admins can update any field" on fields\n  for update using (\n    exists (select 1 from profiles where id = auth.uid() and is_admin = true)\n  );');
      return;
    }
    showSuccess('Field updated!'); setEditingField(null); resetFieldForm(); fetchFields();
  };

  const handleDeleteField = async (id) => {
    if (!confirm('Delete this field? All linked games will also be deleted!')) return;
    const { error } = await supabase.from('fields').delete().eq('id', id);
    if (error) { showError(error.message); return; }
    showSuccess('Field deleted.'); fetchFields();
  };

  // ── Background handlers ───────────────────────────────
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

  // ── Card Maker handlers ───────────────────────────────
  const handleCardAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (cardAvatarPreview) URL.revokeObjectURL(cardAvatarPreview);
    setCardAvatarPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const applyPreset = (preset) => {
    setCardForm(prev => ({
      ...prev,
      useCustomTheme: true,
      gradFrom:    preset.gradFrom,
      gradMid:     preset.gradMid,
      gradTo:      preset.gradTo,
      borderColor: preset.borderColor,
      textDark:    preset.textDark,
      badgeLabel:  preset.badgeLabel,
      badgeColor:  preset.badgeColor,
      glowEnabled: preset.glowEnabled,
      glowColor:   preset.glowColor,
      foilEnabled: preset.foilEnabled,
    }));
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
      const canvas = await drawCardImage({
        profile,
        cardStats: stats,
        rank: cardForm.rank,
        customTheme: cardForm.useCustomTheme ? cardForm : null,
      });
      const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      const a = document.createElement('a');
      a.href = canvas.toDataURL(mime, 0.92);
      a.download = `bolahh-card-${(cardForm.name || 'card').toLowerCase().replace(/\s+/g, '-')}.${fmt}`;
      a.click();
    } finally {
      setCardDownloading(false);
    }
  };

  // ── Template save/load ────────────────────────────────
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { showError('Enter a template name first.'); return; }
    setSavingTemplate(true);
    const { error } = await supabase.from('card_templates').insert({
      name:         templateName.trim(),
      grad_from:    cardForm.gradFrom,
      grad_mid:     cardForm.gradMid,
      grad_to:      cardForm.gradTo,
      border_color: cardForm.borderColor,
      text_dark:    cardForm.textDark,
      badge_label:  cardForm.badgeLabel,
      badge_color:  cardForm.badgeColor,
      glow_enabled: cardForm.glowEnabled,
      glow_color:   cardForm.glowColor,
      foil_enabled: cardForm.foilEnabled,
    });
    if (error) showError('Save failed. Make sure the card_templates table exists in Supabase (see console for details). Error: ' + error.message);
    else { showSuccess(`Template "${templateName.trim()}" saved!`); setTemplateName(''); fetchTemplates(); }
    setSavingTemplate(false);
  };

  const handleLoadTemplate = (t) => {
    setCardForm(prev => ({
      ...prev,
      useCustomTheme: true,
      gradFrom:    t.grad_from,
      gradMid:     t.grad_mid,
      gradTo:      t.grad_to,
      borderColor: t.border_color,
      textDark:    t.text_dark,
      badgeLabel:  t.badge_label || '',
      badgeColor:  t.badge_color,
      glowEnabled: t.glow_enabled,
      glowColor:   t.glow_color,
      foilEnabled: t.foil_enabled,
    }));
    showSuccess(`Loaded "${t.name}"`);
  };

  const handleDeleteTemplate = async (id, name) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    const { error } = await supabase.from('card_templates').delete().eq('id', id);
    if (error) showError(error.message);
    else { showSuccess('Template deleted.'); fetchTemplates(); }
  };

  // ── Banner handlers ───────────────────────────────────
  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBannerImg(true);
    const ext = file.name.split('.').pop();
    const fileName = `banner-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('field-images').upload(fileName, file);
    if (uploadError) { showError('Upload failed: ' + uploadError.message); setUploadingBannerImg(false); return; }
    const { data } = supabase.storage.from('field-images').getPublicUrl(fileName);
    setBannerForm(prev => ({ ...prev, image_url: data.publicUrl }));
    setUploadingBannerImg(false);
    e.target.value = '';
  };

  const handleAddBanner = async () => {
    if (!bannerForm.image_url) { showError('Upload an image first.'); return; }
    const { error } = await supabase.from('banners').insert({
      image_url: bannerForm.image_url,
      title: bannerForm.title || null,
      subtitle: bannerForm.subtitle || null,
      link_url: bannerForm.link_url || null,
      sort_order: Number(bannerForm.sort_order) || 0,
      active: bannerForm.active,
    });
    if (error) { showError(error.message); return; }
    showSuccess('Banner added!');
    setBannerForm({ title: '', subtitle: '', link_url: '', sort_order: 0, active: true, image_url: '' });
    fetchBanners();
  };

  const handleToggleBanner = async (id, currentActive) => {
    const { error } = await supabase.from('banners').update({ active: !currentActive }).eq('id', id);
    if (error) { showError(error.message); return; }
    fetchBanners();
  };

  const handleDeleteBanner = async (id) => {
    if (!confirm('Delete this banner?')) return;
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) { showError(error.message); return; }
    showSuccess('Banner deleted.'); fetchBanners();
  };

  // ── Styles ────────────────────────────────────────────
  const labelStyle  = { fontSize: 12, color: 'var(--muted)', letterSpacing: 1, marginBottom: 6, display: 'block' };
  const checkboxLabel = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text)', cursor: 'pointer' };
  const sectionCard = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 };

  const colorRow = (label, field) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ width: 110, fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5 }}>{label}</span>
      <input
        type="color"
        value={cardForm[field]}
        onChange={e => setCardForm(prev => ({ ...prev, [field]: e.target.value }))}
        style={{ width: 36, height: 28, border: '2px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }}
      />
      <span style={{ fontFamily: "'Space Mono'", fontSize: 10, color: 'var(--muted)' }}>{cardForm[field]}</span>
    </div>
  );

  const toggle = (label, field) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
      <div
        onClick={() => setCardForm(prev => ({ ...prev, [field]: !prev[field] }))}
        style={{
          width: 38, height: 20, borderRadius: 10,
          background: cardForm[field] ? 'var(--accent)' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: cardForm[field] ? 20 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
    </label>
  );

  const TABS = [
    { key: 'banners',     label: 'Banners'     },
    { key: 'fields',      label: 'Fields'      },
    { key: 'backgrounds', label: 'Card BG'     },
    { key: 'cardmaker',   label: 'Card Maker'  },
    { key: 'coupons',     label: 'Coupons'     },
    { key: 'requests',    label: 'Game Requests' },
  ];

  const requestsByArea = gameRequests.reduce((acc, r) => {
    const key = r.area || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const sortedAreaCounts = Object.entries(requestsByArea).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-wrap" style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        <div className="fade-up" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: 3, color: 'var(--text)', marginBottom: 4 }}>
              ADMIN PANEL
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Manage fields, backgrounds and card designs</p>
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
            }}>← Home</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Active Banners',       val: banners.filter(b => b.active).length, icon: <IoImages size={24} color="var(--accent)" /> },
            { label: 'Total Fields',       val: fields.length,    icon: <MdOutlineStadium /> },
            { label: 'Card Backgrounds',   val: cardBgs.length,   icon: <IoImages size={24} color="var(--accent)" /> },
            { label: 'Saved Card Templates', val: savedTemplates.length, icon: <MdSave size={24} color="var(--accent)" /> },
            { label: 'Game Requests',       val: gameRequests.length, icon: <MdSportsSoccer size={24} color="var(--accent)" /> },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: 'var(--accent)', letterSpacing: 1 }}>{s.val}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {success && (
          <div style={{ background: 'rgba(240,157,81,0.12)', border: '1px solid rgba(240,157,81,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--accent)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoCheckmarkDoneCircleSharp /> {success}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(240,101,67,0.1)', border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
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

        {/* ── BANNERS TAB ── */}
        {activeTab === 'banners' && (
          <div>
            {/* SQL setup note */}
            <div style={{ background: 'rgba(240,157,81,0.08)', border: '1px solid rgba(240,157,81,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', letterSpacing: 1, marginBottom: 6 }}>ONE-TIME SETUP</div>
              <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.7, marginBottom: 8 }}>
                If you haven't created the banners table yet, run this SQL in your Supabase SQL editor:
              </p>
              <code style={{ display: 'block', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text)', fontFamily: "'Space Mono'", lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{`create table banners (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  title text,
  subtitle text,
  link_url text,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table banners enable row level security;
create policy "Read banners" on banners for select using (true);
create policy "Manage banners" on banners for all using (true);`}</code>
            </div>

            {/* Add banner form */}
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 20 }}>ADD NEW BANNER</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <label style={labelStyle}>BANNER IMAGE *</label>
                  {bannerForm.image_url ? (
                    <div style={{ position: 'relative', marginBottom: 4 }}>
                      <img src={bannerForm.image_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)', display: 'block' }} />
                      <button onClick={() => setBannerForm(prev => ({ ...prev, image_url: '' }))}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <IoClose size={14} />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => document.getElementById('banner-img-input').click()} style={{
                      border: '2px dashed var(--border)', borderRadius: 10, padding: '28px',
                      textAlign: 'center', cursor: 'pointer', background: 'var(--card2)',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><IoCamera size={24} color="var(--muted)" /></div>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{uploadingBannerImg ? 'Uploading...' : 'Click to upload banner image'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.6 }}>Recommended: 16:5 ratio — e.g. 1600×500px</div>
                    </div>
                  )}
                  <input id="banner-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerImageUpload} />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>TITLE (optional)</label>
                    <input placeholder="e.g. New Season Starting!" value={bannerForm.title}
                      onChange={e => setBannerForm(prev => ({ ...prev, title: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>SUBTITLE (optional)</label>
                    <input placeholder="e.g. Join a game today" value={bannerForm.subtitle}
                      onChange={e => setBannerForm(prev => ({ ...prev, subtitle: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>LINK URL (optional)</label>
                    <input placeholder="e.g. /subscription or https://..." value={bannerForm.link_url}
                      onChange={e => setBannerForm(prev => ({ ...prev, link_url: e.target.value }))} />
                  </div>
                  <div style={{ flex: '0 0 100px' }}>
                    <label style={labelStyle}>ORDER</label>
                    <input type="number" min={0} value={bannerForm.sort_order}
                      onChange={e => setBannerForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div onClick={() => setBannerForm(prev => ({ ...prev, active: !prev.active }))}
                    style={{ width: 38, height: 20, borderRadius: 10, background: bannerForm.active ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 2, left: bannerForm.active ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>Active (show on homepage)</span>
                </label>

                <button onClick={handleAddBanner} style={{
                  padding: '12px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>+ Add Banner</button>
              </div>
            </div>

            {/* Existing banners */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                All Banners ({banners.length})
              </div>
              {banners.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No banners yet.</div>
              ) : banners.map((banner, i) => (
                <div key={banner.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < banners.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <img src={banner.image_url} alt="" style={{ width: 100, height: 36, objectFit: 'cover', borderRadius: 7, border: '1px solid var(--border)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{banner.title || '(no title)'}</div>
                    {banner.subtitle && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{banner.subtitle}</div>}
                    {banner.link_url && <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Space Mono'", marginTop: 2 }}>{banner.link_url}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontFamily: "'Space Mono'", color: 'var(--muted)' }}>#{banner.sort_order}</span>
                    <div onClick={() => handleToggleBanner(banner.id, banner.active)}
                      style={{ width: 38, height: 20, borderRadius: 10, background: banner.active ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: banner.active ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </div>
                    <button onClick={() => handleDeleteBanner(banner.id)} style={{
                      background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><IoCamera size={24} color="var(--muted)" /></div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{uploadingImage ? 'Uploading...' : 'Click to upload photos'}</div>
                  </div>
                  <input id="admin-field-img-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
                  {fieldForm.images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 4 }}>
                      {fieldForm.images.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} alt="" />
                          <button onClick={() => setFieldForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IoClose size={11} /></button>
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
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><FaLocationDot size={11} />{field.area} · {field.address}</div>
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
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)' }} />
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

              {/* ── Left column: controls ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Player info */}
                <div style={sectionCard}>
                  <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>PLAYER INFO</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>RANK (shown on card)</label>
                        <select value={cardForm.rank} onChange={e => setCardForm({ ...cardForm, rank: e.target.value })}>
                          {RANKS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: '0 0 120px' }}>
                        <label style={labelStyle}>GAMES PLAYED</label>
                        <input
                          type="number" min={0}
                          value={cardForm.games_played}
                          onChange={e => setCardForm({ ...cardForm, games_played: Math.max(0, parseInt(e.target.value) || 0) })}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>AVATAR</label>
                      <input type="file" ref={cardAvatarRef} accept="image/*" onChange={handleCardAvatarChange} style={{ display: 'none' }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {cardAvatarPreview && (
                          <img src={cardAvatarPreview} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} alt="" />
                        )}
                        <button onClick={() => cardAvatarRef.current?.click()}
                          style={{ background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
                          {cardAvatarPreview ? 'Change Avatar' : '+ Upload Avatar'}
                        </button>
                        {cardAvatarPreview && (
                          <button onClick={() => { URL.revokeObjectURL(cardAvatarPreview); setCardAvatarPreview(null); }}
                            style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={sectionCard}>
                  <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>PLAYER STATS</h3>
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

                {/* Card Design */}
                <div style={sectionCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>CARD DESIGN</h3>
                    {toggle('Use Custom Design', 'useCustomTheme')}
                  </div>

                  {cardForm.useCustomTheme && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                      {/* Presets */}
                      <div>
                        <label style={labelStyle}>QUICK PRESETS</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {CARD_PRESETS.map(preset => (
                            <button
                              key={preset.key}
                              onClick={() => applyPreset(preset)}
                              style={{
                                padding: '6px 14px',
                                background: `linear-gradient(135deg, ${preset.gradFrom}, ${preset.gradMid})`,
                                color: preset.textDark ? '#2a1400' : '#fff',
                                border: `1.5px solid ${preset.accent}`,
                                borderRadius: 8,
                                fontSize: 12, fontWeight: 700,
                                fontFamily: "'Bebas Neue'",
                                letterSpacing: 1,
                                cursor: 'pointer',
                                transition: 'transform 0.1s',
                                boxShadow: `0 2px 8px ${preset.accent}44`,
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gradient colors */}
                      <div>
                        <label style={labelStyle}>GRADIENT COLORS</label>
                        <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                          {colorRow('Gradient Start', 'gradFrom')}
                          {colorRow('Gradient Mid', 'gradMid')}
                          {colorRow('Gradient End', 'gradTo')}
                          <div style={{
                            height: 10, borderRadius: 5, marginTop: 4,
                            background: `linear-gradient(90deg, ${cardForm.gradFrom}, ${cardForm.gradMid}, ${cardForm.gradTo})`,
                          }} />
                        </div>
                      </div>

                      {/* Border / accent */}
                      <div>
                        <label style={labelStyle}>BORDER & ACCENT</label>
                        <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                          {colorRow('Border Color', 'borderColor')}
                        </div>
                      </div>

                      {/* Text theme */}
                      <div>
                        <label style={labelStyle}>TEXT THEME</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[{ val: true, label: 'Dark Text' }, { val: false, label: 'Light Text' }].map(opt => (
                            <button
                              key={String(opt.val)}
                              onClick={() => setCardForm(prev => ({ ...prev, textDark: opt.val }))}
                              style={{
                                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                background: cardForm.textDark === opt.val ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                                color: cardForm.textDark === opt.val ? 'var(--accent)' : 'var(--muted)',
                                border: `1px solid ${cardForm.textDark === opt.val ? 'var(--accent)' : 'var(--border)'}`,
                                cursor: 'pointer',
                              }}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>

                      {/* Badge */}
                      <div>
                        <label style={labelStyle}>BADGE LABEL</label>
                        <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span style={{ width: 110, fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5 }}>Label Text</span>
                            <input
                              value={cardForm.badgeLabel}
                              onChange={e => setCardForm(prev => ({ ...prev, badgeLabel: e.target.value.toUpperCase() }))}
                              placeholder="e.g. TOTY"
                              style={{ flex: 1, textTransform: 'uppercase', fontSize: 13, fontFamily: "'Bebas Neue'", letterSpacing: 2, padding: '6px 10px' }}
                            />
                          </div>
                          {colorRow('Badge Color', 'badgeColor')}
                        </div>
                      </div>

                      {/* Effects */}
                      <div>
                        <label style={labelStyle}>EFFECTS</label>
                        <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            {toggle('Glow Effect', 'glowEnabled')}
                            {cardForm.glowEnabled && (
                              <div style={{ paddingLeft: 50 }}>
                                {colorRow('Glow Color', 'glowColor')}
                              </div>
                            )}
                          </div>
                          <div>
                            {toggle('Foil / Holographic Shimmer', 'foilEnabled')}
                          </div>
                        </div>
                      </div>

                      {/* Pattern */}
                      <div>
                        <label style={labelStyle}>CARD PATTERN</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {[
                            { key: 'none',       label: 'None'       },
                            { key: 'dots',       label: 'Dots'       },
                            { key: 'diagonal',   label: 'Diagonal'   },
                            { key: 'grid',       label: 'Grid'       },
                            { key: 'crosshatch', label: 'Crosshatch' },
                            { key: 'carbon',     label: 'Carbon'     },
                          ].map(p => (
                            <button
                              key={p.key}
                              onClick={() => setCardForm(prev => ({ ...prev, pattern: p.key }))}
                              style={{
                                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                background: cardForm.pattern === p.key ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                                color: cardForm.pattern === p.key ? 'var(--accent)' : 'var(--muted)',
                                border: `1px solid ${cardForm.pattern === p.key ? 'var(--accent)' : 'var(--border)'}`,
                                cursor: 'pointer', transition: 'all 0.1s',
                              }}
                            >{p.label}</button>
                          ))}
                        </div>
                        {cardForm.pattern !== 'none' && (
                          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                            {colorRow('Pattern Color', 'patternColor')}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                              <span style={{ width: 110, fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, flexShrink: 0 }}>Opacity</span>
                              <input
                                type="range" min={0.03} max={0.5} step={0.01}
                                value={cardForm.patternOpacity}
                                onChange={e => setCardForm(prev => ({ ...prev, patternOpacity: parseFloat(e.target.value) }))}
                                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                              />
                              <span style={{ width: 34, fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', textAlign: 'right', flexShrink: 0 }}>
                                {Math.round(cardForm.patternOpacity * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Decorative elements */}
                      <div>
                        <label style={labelStyle}>DECORATIVE ELEMENTS</label>
                        <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                          {toggle('Corner Ornaments', 'elemCorners')}
                          {toggle('Side Accent Bars', 'elemSideBars')}
                          {toggle('Center Diamond', 'elemCenterDiamond')}
                          {toggle('Inner Frame', 'elemFrame')}
                          {(cardForm.elemCorners || cardForm.elemSideBars || cardForm.elemCenterDiamond || cardForm.elemFrame) && (
                            <div style={{ marginTop: 4 }}>
                              {colorRow('Element Color', 'elemColor')}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                <span style={{ width: 110, fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, flexShrink: 0 }}>Opacity</span>
                                <input
                                  type="range" min={0.05} max={0.9} step={0.01}
                                  value={cardForm.elemOpacity}
                                  onChange={e => setCardForm(prev => ({ ...prev, elemOpacity: parseFloat(e.target.value) }))}
                                  style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                                />
                                <span style={{ width: 34, fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', textAlign: 'right', flexShrink: 0 }}>
                                  {Math.round(cardForm.elemOpacity * 100)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Icon sticker */}
                      <div>
                        <label style={labelStyle}>ICON STICKER</label>

                        {/* Icon grid */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {/* None button */}
                          <button
                            onClick={() => setCardForm(prev => ({ ...prev, stickerIcon: 'none' }))}
                            style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                              background: cardForm.stickerIcon === 'none' ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                              color: cardForm.stickerIcon === 'none' ? 'var(--accent)' : 'var(--muted)',
                              border: `1px solid ${cardForm.stickerIcon === 'none' ? 'var(--accent)' : 'var(--border)'}`,
                              cursor: 'pointer',
                            }}
                          >None</button>

                          {STICKER_ICONS.map(icon => {
                            const active = cardForm.stickerIcon === icon.key;
                            return (
                              <button
                                key={icon.key}
                                onClick={() => setCardForm(prev => ({ ...prev, stickerIcon: icon.key }))}
                                title={icon.label}
                                style={{
                                  width: 44, height: 44, borderRadius: 10,
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                                  background: active ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
                                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                  cursor: 'pointer', transition: 'all 0.1s',
                                }}
                              >
                                <svg viewBox="0 0 24 24" width={20} height={20} fill={active ? 'var(--accent)' : 'var(--muted)'}>
                                  <path d={icon.d} />
                                </svg>
                                <span style={{ fontSize: 7, fontFamily: "'Space Mono'", color: active ? 'var(--accent)' : 'var(--muted)', letterSpacing: 0 }}>{icon.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {cardForm.stickerIcon !== 'none' && (
                          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                            {/* Position picker */}
                            <div>
                              <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Position</span>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 180 }}>
                                {[
                                  { key: 'top-left', label: '↖' }, { key: 'top-center', label: '↑' }, { key: 'top-right', label: '↗' },
                                  { key: 'bottom-left', label: '↙' }, { key: 'bottom-center', label: '↓' }, { key: 'bottom-right', label: '↘' },
                                ].map(p => {
                                  const active = cardForm.stickerPos === p.key;
                                  return (
                                    <button
                                      key={p.key}
                                      onClick={() => setCardForm(prev => ({ ...prev, stickerPos: p.key }))}
                                      style={{
                                        height: 32, borderRadius: 7,
                                        background: active ? 'rgba(240,157,81,0.18)' : 'var(--card)',
                                        color: active ? 'var(--accent)' : 'var(--muted)',
                                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                        fontSize: 16, cursor: 'pointer',
                                      }}
                                    >{p.label}</button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Size */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 110, fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, flexShrink: 0 }}>Size</span>
                              <input
                                type="range" min={16} max={72} step={2}
                                value={cardForm.stickerSize}
                                onChange={e => setCardForm(prev => ({ ...prev, stickerSize: parseInt(e.target.value) }))}
                                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                              />
                              <span style={{ width: 34, fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', textAlign: 'right', flexShrink: 0 }}>
                                {cardForm.stickerSize}px
                              </span>
                            </div>

                            {/* Color */}
                            {colorRow('Color', 'stickerColor')}

                            {/* Opacity */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 110, fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, flexShrink: 0 }}>Opacity</span>
                              <input
                                type="range" min={0.1} max={1} step={0.01}
                                value={cardForm.stickerOpacity}
                                onChange={e => setCardForm(prev => ({ ...prev, stickerOpacity: parseFloat(e.target.value) }))}
                                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                              />
                              <span style={{ width: 34, fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', textAlign: 'right', flexShrink: 0 }}>
                                {Math.round(cardForm.stickerOpacity * 100)}%
                              </span>
                            </div>

                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Save Template */}
                {cardForm.useCustomTheme && (
                  <div style={{ ...sectionCard, background: 'rgba(240,157,81,0.06)', borderColor: 'rgba(240,157,81,0.2)' }}>
                    <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--accent)', marginBottom: 12 }}>SAVE TO WEBSITE</h3>
                    <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14, lineHeight: 1.7 }}>
                      Save this card design as a named template. Templates are stored in Supabase and can be loaded back any time.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        placeholder="Template name, e.g. TOTY Gold 2025"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        style={{
                          padding: '10px 20px', background: 'var(--accent)', color: '#fff',
                          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
                          opacity: savingTemplate ? 0.6 : 1, cursor: savingTemplate ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        }}
                      >
                        <MdSave size={15} />{savingTemplate ? 'Saving...' : 'Save Template'}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* ── Right column: live preview + download ── */}
              <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <div style={{ ...sectionCard, padding: 20, textAlign: 'center', marginBottom: 0, minWidth: 260 }}>
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
                      customTheme={activeCustomTheme}
                      badge={activeBadge}
                    />
                  </div>
                  <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                    OVR {cardOverall} · {cardForm.rank}
                  </div>
                </div>

                {/* Leaderboard strip preview */}
                {(() => {
                  const lbTheme = activeCustomTheme
                    ? { bg: activeCustomTheme.bg, border: activeCustomTheme.border, text: activeCustomTheme.text }
                    : getCardTheme(cardForm.rank);
                  const lbRankColor = getRankColor(cardForm.rank);
                  const posAbbr = POSITION_ABBR[cardForm.position] || cardForm.position;
                  return (
                    <div style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10 }}>LEADERBOARD ROW</div>
                      <div style={{
                        background: 'rgba(240,157,81,0.04)', border: '1px solid rgba(240,157,81,0.2)',
                        borderRadius: 12, padding: '10px 12px',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{ width: 24, textAlign: 'center', flexShrink: 0, fontFamily: "'Bebas Neue'", fontSize: 16, color: 'var(--muted)', letterSpacing: 1 }}>#1</div>
                        {/* Mini card swatch */}
                        <div style={{
                          width: 36, height: 50, borderRadius: 6, flexShrink: 0,
                          background: lbTheme.bg, border: `1.5px solid ${lbTheme.border}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.35)', position: 'relative', overflow: 'hidden',
                        }}>
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
                          {cardAvatarPreview
                            ? <img src={cardAvatarPreview} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: lbTheme.text }}>
                                {(cardForm.name || 'P')[0].toUpperCase()}
                              </div>
                          }
                          <div style={{ fontFamily: "'Space Mono'", fontSize: 6, color: lbTheme.text, fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>{posAbbr}</div>
                        </div>
                        {/* Name + rank + stats */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                            {cardForm.name || 'PLAYER'}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: lbRankColor, fontFamily: "'Space Mono'", marginBottom: 4 }}>{cardForm.rank}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {STATS.map(s => (
                              <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: "'Space Mono'" }}>{s.label}</div>
                                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text)', fontFamily: "'Space Mono'" }}>{cardForm[s.key] || 30}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* OVR */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: lbRankColor, lineHeight: 1, letterSpacing: 1 }}>{cardOverall}</div>
                          <div style={{ fontSize: 8, color: 'var(--muted)', fontFamily: "'Space Mono'", letterSpacing: 1 }}>OVR</div>
                          {cardForm.games_played > 0 && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>{cardForm.games_played}g</div>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Game detail strip preview */}
                {(() => {
                  const gdRankColor = cardForm.useCustomTheme && activeCustomTheme ? activeCustomTheme.border : getRankColor(cardForm.rank);
                  const initials = (cardForm.name || 'P').slice(0, 2).toUpperCase();
                  return (
                    <div style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10 }}>GAME DETAIL ROW</div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        background: 'rgba(240,157,81,0.04)',
                        border: `1px solid ${gdRankColor}33`,
                        borderLeft: `3px solid ${gdRankColor}`,
                        borderRadius: 10,
                      }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${gdRankColor}`,
                          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--card)',
                        }}>
                          {cardAvatarPreview
                            ? <img src={cardAvatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: gdRankColor }}>{initials}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {cardForm.name || 'PLAYER'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: gdRankColor }}>{cardForm.rank}</span>
                            {cardForm.position && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {cardForm.position}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: gdRankColor, lineHeight: 1 }}>{cardOverall}</div>
                          <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginTop: 1 }}>OVR</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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

                {/* Quick reset */}
                <button
                  onClick={() => setCardForm(prev => ({ ...prev, useCustomTheme: false }))}
                  style={{
                    width: '100%', padding: '8px', background: 'transparent', color: 'var(--muted)',
                    border: '1px solid var(--border)', borderRadius: 10, fontSize: 12,
                  }}
                >
                  Reset to Rank Theme
                </button>
              </div>

            </div>

            {/* ── Saved Templates ── */}
            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>
                SAVED TEMPLATES
                <span style={{ fontFamily: "'Space Mono'", fontSize: 12, color: 'var(--muted)', fontWeight: 400, letterSpacing: 1, marginLeft: 12 }}>
                  {savedTemplates.length} saved
                </span>
              </div>

              {savedTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16 }}>
                  No templates saved yet. Customize a card design above and click "Save Template".
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {savedTemplates.map(t => {
                    const grad = `linear-gradient(145deg, ${t.grad_from}, ${t.grad_mid}, ${t.grad_to})`;
                    return (
                      <div key={t.id} style={{
                        background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: 14, overflow: 'hidden',
                      }}>
                        {/* Color swatch */}
                        <div style={{
                          height: 56, background: grad,
                          border: `3px solid ${t.border_color}`,
                          borderRadius: '14px 14px 0 0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          boxShadow: t.glow_enabled ? `inset 0 0 20px ${t.glow_color}55` : 'none',
                        }}>
                          {t.badge_label && (
                            <span style={{
                              fontFamily: "'Bebas Neue'", fontSize: 15, letterSpacing: 2,
                              color: t.badge_color, background: `${t.badge_color}22`,
                              border: `1px solid ${t.badge_color}70`, borderRadius: 4,
                              padding: '2px 10px',
                            }}>{t.badge_label}</span>
                          )}
                          {t.foil_enabled && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: "'Space Mono'" }}>✦ FOIL</span>
                          )}
                        </div>

                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>{t.name}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                            {t.glow_enabled && (
                              <span style={{ fontSize: 10, background: `${t.glow_color}20`, color: t.glow_color, border: `1px solid ${t.glow_color}50`, borderRadius: 4, padding: '1px 7px', fontFamily: "'Space Mono'" }}>Glow</span>
                            )}
                            {t.foil_enabled && (
                              <span style={{ fontSize: 10, background: 'rgba(200,150,255,0.15)', color: '#c096ff', border: '1px solid rgba(200,150,255,0.3)', borderRadius: 4, padding: '1px 7px', fontFamily: "'Space Mono'" }}>Foil</span>
                            )}
                            <span style={{ fontSize: 10, background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px', fontFamily: "'Space Mono'" }}>
                              {t.text_dark ? 'Dark text' : 'Light text'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleLoadTemplate(t)} style={{
                              flex: 1, padding: '7px 10px', background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                              border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                            }}>Load</button>
                            <button onClick={() => handleDeleteTemplate(t.id, t.name)} style={{
                              padding: '7px 10px', background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                              border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                            }}>Del</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── COUPONS TAB ── */}
        {activeTab === 'coupons' && (
          <div>
            {/* Create coupon form */}
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LuTag size={18} /> CREATE COUPON
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>PROMO CODE *</label>
                    <input
                      placeholder="e.g. BOLAHH20"
                      value={couponForm.code}
                      onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      style={{ textTransform: 'uppercase', letterSpacing: 1 }}
                    />
                  </div>
                  <div style={{ flex: '0 0 140px' }}>
                    <label style={labelStyle}>DISCOUNT % *</label>
                    <input
                      type="number" min={1} max={100} placeholder="e.g. 20"
                      value={couponForm.discount_percentage}
                      onChange={e => setCouponForm({ ...couponForm, discount_percentage: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>MAX USES (blank = unlimited)</label>
                    <input
                      type="number" min={1} placeholder="e.g. 100"
                      value={couponForm.max_uses}
                      onChange={e => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>EXPIRES AT (optional)</label>
                    <input
                      type="datetime-local"
                      value={couponForm.expires_at}
                      onChange={e => setCouponForm({ ...couponForm, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <button onClick={handleAddCoupon} style={{
                  padding: '11px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: "'Bebas Neue'", letterSpacing: 1.5
                }}>
                  <LuTag size={15} /> CREATE COUPON
                </button>
              </div>
            </div>

            {/* Coupon list */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)' }}>
                ALL COUPONS ({coupons.length})
              </div>
              {coupons.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No coupons yet.</div>
              ) : coupons.map((coupon, i) => (
                <div key={coupon.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < coupons.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  opacity: coupon.is_active ? 1 : 0.5
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Space Mono'", fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>{coupon.code}</span>
                      <span style={{
                        background: 'rgba(240,157,81,0.12)', color: 'var(--accent)',
                        border: '1px solid rgba(240,157,81,0.25)', borderRadius: 5,
                        padding: '1px 8px', fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono'"
                      }}>{coupon.discount_percentage}% OFF</span>
                      {!coupon.is_active && (
                        <span style={{ background: 'rgba(100,100,100,0.15)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 7px', fontSize: 10 }}>INACTIVE</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 14 }}>
                      <span>Used: {coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ' (unlimited)'}</span>
                      {coupon.expires_at && (
                        <span>Expires: {new Date(coupon.expires_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleToggleCoupon(coupon)} style={{
                      background: coupon.is_active ? 'rgba(74,222,128,0.1)' : 'var(--card2)',
                      color: coupon.is_active ? '#4ade80' : 'var(--muted)',
                      border: `1px solid ${coupon.is_active ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`,
                      borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600
                    }}>{coupon.is_active ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} style={{
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

        {/* ── GAME REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div>
            {/* SQL setup note */}
            <div style={{ background: 'rgba(240,157,81,0.08)', border: '1px solid rgba(240,157,81,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', letterSpacing: 1, marginBottom: 6 }}>ONE-TIME SETUP</div>
              <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.7, marginBottom: 8 }}>
                If you haven't created the game_requests table yet, run this SQL in your Supabase SQL editor:
              </p>
              <code style={{ display: 'block', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text)', fontFamily: "'Space Mono'", lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{`create table game_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text,
  area text,
  request_date date not null,
  created_at timestamptz default now(),
  unique (user_id, request_date)
);
alter table game_requests enable row level security;
create policy "Users can insert their own requests" on game_requests
  for insert with check (auth.uid() = user_id);
create policy "Read own or admin" on game_requests
  for select using (
    auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can delete requests" on game_requests
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );`}</code>
            </div>

            {/* Area breakdown */}
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaLocationDot size={16} /> REQUESTS BY AREA
              </h3>
              {sortedAreaCounts.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '10px 0' }}>No requests yet.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sortedAreaCounts.map(([area, count]) => (
                    <div key={area} style={{
                      background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                      border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
                      padding: '6px 14px', fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      {area}
                      <span style={{ fontFamily: "'Space Mono'", fontSize: 12, opacity: 0.8 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Requests list */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                All Requests ({gameRequests.length})
              </div>
              {gameRequests.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No game requests yet.</div>
              ) : gameRequests.map((req, i) => (
                <div key={req.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < gameRequests.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{req.name || '(no name)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaLocationDot size={11} />{req.area || 'Unknown area'} · {req.request_date}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteGameRequest(req.id)} style={{
                    background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                    border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8,
                    padding: '5px 12px', fontSize: 12, fontWeight: 600, flexShrink: 0
                  }}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
