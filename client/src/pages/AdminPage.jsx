import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { usePersistedState } from '../lib/usePersistedState';
import Navbar from '../components/Navbar';
import { GiRunningShoe, GiSoccerBall } from 'react-icons/gi';
import { FaSquareParking, FaLocationDot, FaMedal } from 'react-icons/fa6';
import { LuToilet, LuTag, LuMedal } from 'react-icons/lu';
import { CiShop } from 'react-icons/ci';
import { IoCheckmarkDoneCircleSharp, IoClose, IoImages, IoCamera, IoPeople, IoSearch } from 'react-icons/io5';
import { MdError, MdOutlineStadium, MdSave, MdSportsSoccer, MdOutlineCalendarMonth, MdOutlineCancel } from 'react-icons/md';
import FifaCard, { getCardTheme, POSITION_ABBR, STATS, calcOverall } from '../components/FifaCard';
import PlayerAvatar from '../components/PlayerAvatar';
import EquippedBorderFrame from '../components/EquippedBorderFrame';
import { drawCardImage } from '../lib/cardCanvas';
import { RANKS, getRank } from '../lib/rankUtils';
import { RARITY_COLORS, resolveBorderRender } from '../lib/borderCatalog';
import { AREAS } from '../lib/areas';
import { resizeImageFile } from '../lib/imageResize';
import { refundGamePlayers } from '../lib/refundGamePlayers';
import GameRulesEditor from '../components/GameRulesEditor';

const SHOES = ['IN (Indoor Futsal Boots)', 'TF (Turf Boots)', 'Sport Shoes', 'AG (Artificial Ground Boots)'];
// All games are 5v5 "Social Game" sessions for now — title, format and
// pay-at-court are fixed rather than exposed as choices in the form.
const DEFAULT_GAME_TITLE = 'Social Game';
const DEFAULT_GAME_FORMAT = '5v5';
const DEFAULT_GAME_SLOTS = 15;
const DEFAULT_GAME_PRICE = 15;
const DEFAULT_GAME_DESCRIPTION = 'A casual social futsal game. All skill levels welcome, come have fun and make new friends on the court!';
const CANCEL_REASONS = ['Rain', 'Insufficient Players', 'Other'];
const EMPTY_GAME_FORM = {
  assigned_manager_id: '', field_id: '', area: '', date: '', time: '',
  slots: DEFAULT_GAME_SLOTS, price: DEFAULT_GAME_PRICE, court: '',
  description: DEFAULT_GAME_DESCRIPTION, game_rules: '', shoes_type: [], allow_pay_at_court: false
};

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
    border: null,
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

  // ── Game requests state ───────────────────────────────
  const [gameRequests, setGameRequests] = useState([]);

  // ── Coupons state ─────────────────────────────────────
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', discount_percentage: 10, max_uses: '', expires_at: '' });

  // ── Avatar presets state ──────────────────────────────
  const [avatarPresets, setAvatarPresets] = useState([]);
  const [uploadingAvatarPreset, setUploadingAvatarPreset] = useState(false);

  // ── Card border catalog state ──────────────────────────
  const [borderCatalogAdmin, setBorderCatalogAdmin] = useState([]);
  const [uploadingBorder, setUploadingBorder] = useState(false);
  const [uploadingVariant, setUploadingVariant] = useState(null);
  const [borderForm, setBorderForm] = useState({ label: '', rarity: 'common', unlockType: 'games_played', unlockValue: 10, unlockLabel: '' });

  // ── Field form state ──────────────────────────────────
  const [fieldForm, setFieldForm] = useState({
    name: '', area: '', address: '', field_rules: '', images: [],
    has_toilet: false, has_parking: false, has_shop: false, has_shoe_rent: false,
    default_slots: 15, default_price: 15, maps_url: ''
  });

  // ── Managers state ────────────────────────────────────
  const [managers, setManagers] = useState([]);
  const [promoteQuery, setPromoteQuery] = useState('');
  const [promoteResults, setPromoteResults] = useState([]);
  const [promoteSearching, setPromoteSearching] = useState(false);

  // ── Player Stats (manual card editor) state ────────────
  const [statsQuery, setStatsQuery] = useState('');
  const [statsResults, setStatsResults] = useState([]);
  const [statsSearching, setStatsSearching] = useState(false);
  const [selectedStatsPlayer, setSelectedStatsPlayer] = useState(null);
  const [statsForm, setStatsForm] = useState(null);
  const [savingStats, setSavingStats] = useState(false);
  const [notifyOnStatsSave, setNotifyOnStatsSave] = useState(true);
  // Card as it stood before the player's most recently rated game — reconstructed by
  // subtracting that game's game_ratings delta from their current card_stats, so
  // "PAST CARD" means "before the last change", not just "current DB value" again.
  const [pastCardStats, setPastCardStats] = useState(null);
  const [loadingPastCard, setLoadingPastCard] = useState(false);
  const [pastCardHasHistory, setPastCardHasHistory] = useState(true);

  // ── Games state ────────────────────────────────────────
  const [games, setGames] = useState([]);
  const [gameForm, setGameForm] = useState(EMPTY_GAME_FORM);
  const [editingGame, setEditingGame] = useState(null);
  const [editGameForm, setEditGameForm] = useState(EMPTY_GAME_FORM);
  const [showEditGameModal, setShowEditGameModal] = useState(false);
  const [cancelingGame, setCancelingGame] = useState(null);
  const [cancelReason, setCancelReason] = useState('Rain');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFields(), fetchCardBgs(), fetchBanners(), fetchCoupons(), fetchGameRequests(), fetchAvatarPresetsAdmin(), fetchBorderCatalogAdmin(), fetchManagers(), fetchGames()]);
    setLoading(false);
  };

  // ── Managers ───────────────────────────────────────────
  const fetchManagers = async () => {
    const { data: mgrs } = await supabase.from('profiles').select('id, name, avatar_url').eq('is_admin', true).order('name');
    if (!mgrs) { setManagers([]); return; }
    const ids = mgrs.map(m => m.id);
    const { data: gamesData } = ids.length
      ? await supabase.from('games').select('id, title, area, date, time, format, assigned_manager_id, fields(name)').in('assigned_manager_id', ids)
      : { data: [] };
    setManagers(mgrs.map(m => ({ ...m, games: (gamesData || []).filter(g => g.assigned_manager_id === m.id) })));
  };

  // ── Games ──────────────────────────────────────────────
  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*, fields(name)').order('date', { ascending: true });
    if (data) setGames(data);
  };

  const resetGameForm = () => setGameForm(EMPTY_GAME_FORM);
  const resetEditGameForm = () => setEditGameForm(EMPTY_GAME_FORM);

  const handleAddGame = async () => {
    if (!gameForm.field_id || !gameForm.date || !gameForm.time || !gameForm.price) {
      showError('Fill in all required game details.'); return;
    }
    const { error } = await supabase.from('games').insert({
      title: DEFAULT_GAME_TITLE, field_id: gameForm.field_id, area: gameForm.area,
      format: DEFAULT_GAME_FORMAT, date: gameForm.date, time: gameForm.time,
      slots: parseInt(gameForm.slots) || DEFAULT_GAME_SLOTS,
      price: parseInt(gameForm.price) || DEFAULT_GAME_PRICE,
      court: gameForm.court || null,
      description: gameForm.description, game_rules: gameForm.game_rules,
      shoes_type: gameForm.shoes_type.join(', '),
      allow_pay_at_court: gameForm.allow_pay_at_court,
      assigned_manager_id: gameForm.assigned_manager_id || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) { showError(error.message); return; }
    showSuccess('Game added! Assign a manager any time from the games list.'); resetGameForm(); fetchGames(); fetchManagers();
  };

  // Inline reassignment from the games list — no need to open Edit or touch
  // anything else about the game to change (or first set) who manages it.
  const handleReassignManager = async (game, newManagerId) => {
    const { error } = await supabase.from('games')
      .update({ assigned_manager_id: newManagerId || null }).eq('id', game.id);
    if (error) { showError(error.message); return; }
    setGames(prev => prev.map(g => g.id === game.id ? { ...g, assigned_manager_id: newManagerId || null } : g));
    fetchManagers();
  };

  const handleEditGame = (game) => {
    setEditingGame(game.id);
    setEditGameForm({
      assigned_manager_id: game.assigned_manager_id || '', field_id: game.field_id, area: game.area,
      date: game.date, time: game.time,
      slots: game.slots, price: game.price, court: game.court || '',
      description: game.description || DEFAULT_GAME_DESCRIPTION, game_rules: game.game_rules || '',
      shoes_type: game.shoes_type ? game.shoes_type.split(', ') : [],
      allow_pay_at_court: game.allow_pay_at_court || false,
    });
    setShowEditGameModal(true);
  };

  const handleUpdateGame = async () => {
    const f = editGameForm;
    if (!f.field_id || !f.date || !f.time || (f.price === '' || f.price == null)) {
      showError('Fill in all required game details.'); return;
    }
    const { data: updated, error } = await supabase.from('games').update({
      field_id: f.field_id, area: f.area, date: f.date, time: f.time,
      slots: parseInt(f.slots), price: parseInt(f.price),
      court: f.court || null,
      description: f.description, game_rules: f.game_rules,
      shoes_type: f.shoes_type.join(', '),
      allow_pay_at_court: f.allow_pay_at_court,
      assigned_manager_id: f.assigned_manager_id || null,
    }).eq('id', editingGame).select('*, fields(name)');
    if (error) { showError(error.message); return; }
    if (!updated || updated.length === 0) { showError('Update failed. No rows matched.'); return; }
    setGames(prev => prev.map(g => g.id === editingGame ? updated[0] : g));
    showSuccess('Game updated!'); setEditingGame(null); setShowEditGameModal(false); resetEditGameForm();
    fetchManagers();
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Delete this game? Players will NOT be refunded — use Cancel instead if players have joined.')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (error) { showError(error.message); return; }
    showSuccess('Game deleted.'); fetchGames(); fetchManagers();
  };

  const handleOpenCancelModal = async (game) => {
    const { count } = await supabase
      .from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', game.id);
    setCancelReason('Rain');
    setCancelingGame({ ...game, _playerCount: count || 0 });
  };

  const handleConfirmCancel = async () => {
    if (!cancelingGame) return;
    setCancelling(true);
    const refundedCount = await refundGamePlayers(cancelingGame.id, cancelingGame.title, cancelingGame.price, cancelReason);
    const { error } = await supabase.from('games').delete().eq('id', cancelingGame.id);
    setCancelling(false);
    if (error) { showError(error.message); return; }
    showSuccess(`Game cancelled. ${refundedCount} player${refundedCount !== 1 ? 's' : ''} refunded.`);
    setCancelingGame(null);
    fetchGames(); fetchManagers();
  };

  const handlePromoteSearch = async (q) => {
    setPromoteQuery(q);
    if (!q.trim()) { setPromoteResults([]); return; }
    setPromoteSearching(true);
    const { data } = await supabase
      .from('profiles').select('id, name, avatar_url')
      .ilike('name', `%${q}%`).eq('is_admin', false).limit(10);
    setPromoteResults(data || []);
    setPromoteSearching(false);
  };

  const handleGrantManager = async (uid) => {
    const { error, count } = await supabase.from('profiles').update({ is_admin: true }, { count: 'exact' }).eq('id', uid);
    if (error) { showError(error.message); return; }
    if (count === 0) {
      showError('Update blocked. Run the super-admin RLS migration (20260808000000_add_super_admin_manager_access.sql) in your Supabase project.');
      return;
    }
    showSuccess('Manager access granted!');
    setPromoteResults(prev => prev.filter(p => p.id !== uid));
    setPromoteQuery('');
    fetchManagers();
  };

  const handleRevokeManager = async (uid, name) => {
    if (!confirm(`Remove manager access from ${name}? Games still assigned to them will stay assigned — reassign those from the Games tab if needed. They won't be able to manage players or rate anymore.`)) return;
    const { error } = await supabase.from('profiles').update({ is_admin: false }).eq('id', uid);
    if (error) { showError(error.message); return; }
    showSuccess('Manager access removed.');
    fetchManagers();
  };

  // ── Player Stats (manual card editor) ─────────────────
  const handleStatsSearch = async (q) => {
    setStatsQuery(q);
    if (!q.trim()) { setStatsResults([]); return; }
    setStatsSearching(true);
    const { data } = await supabase
      .from('profiles').select('id, name, avatar_url, position, card_stats, total_points, games_played')
      .ilike('name', `%${q}%`).limit(10);
    setStatsResults(data || []);
    setStatsSearching(false);
  };

  const STAT_TO_RATING_COL = {
    pac: 'good_chance', sho: 'shooting_quality', pas: 'passing_quality',
    dri: 'successful_dribble', def: 'good_defending', phy: 'good_keeping',
  };

  const handleSelectStatsPlayer = async (p) => {
    setSelectedStatsPlayer(p);
    const cs = p.card_stats || {};
    const currentStats = {
      pac: cs.pac ?? 30, sho: cs.sho ?? 30, pas: cs.pas ?? 30,
      dri: cs.dri ?? 30, def: cs.def ?? 30, phy: cs.phy ?? 30,
    };
    setStatsForm(currentStats);
    setStatsQuery(''); setStatsResults([]);

    setPastCardStats(null);
    setPastCardHasHistory(true);
    setLoadingPastCard(true);
    const { data: lastRating } = await supabase
      .from('game_ratings')
      .select('shooting_quality, passing_quality, good_defending, good_keeping, successful_dribble, good_chance')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const past = { ...currentStats };
    if (lastRating) {
      Object.entries(STAT_TO_RATING_COL).forEach(([statKey, col]) => {
        past[statKey] = Math.max(30, Math.min(99, past[statKey] - (lastRating[col] || 0)));
      });
    }
    setPastCardStats(past);
    setPastCardHasHistory(!!lastRating);
    setLoadingPastCard(false);
  };

  const handleSaveStatsPlayer = async () => {
    if (!selectedStatsPlayer || !statsForm) return;
    setSavingStats(true);
    const cardStats = {
      pac: statsForm.pac, sho: statsForm.sho, pas: statsForm.pas,
      dri: statsForm.dri, def: statsForm.def, phy: statsForm.phy,
    };
    const oldOverall = selectedStatsPlayer.total_points ?? calcOverall(selectedStatsPlayer.card_stats || {});
    const newOverall = calcOverall(cardStats);
    const { error, count } = await supabase.from('profiles').update({
      card_stats: cardStats,
      total_points: newOverall,
    }, { count: 'exact' }).eq('id', selectedStatsPlayer.id);
    setSavingStats(false);
    if (error) { showError(error.message); return; }
    if (count === 0) { showError('Update blocked by RLS. Confirm this account has admin access.'); return; }
    if (notifyOnStatsSave && newOverall !== oldOverall) {
      supabase.functions.invoke('send-card-adjustment-email', {
        body: { user_id: selectedStatsPlayer.id, old_ovr: oldOverall, new_ovr: newOverall },
      }).catch(() => {});
    }
    showSuccess(`${selectedStatsPlayer.name}'s card updated!${notifyOnStatsSave && newOverall !== oldOverall ? ' They\'ll get an email about it.' : ''}`);
    setSelectedStatsPlayer(prev => prev ? { ...prev, card_stats: cardStats, total_points: newOverall } : prev);
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

  // ── Avatar preset handlers ─────────────────────────────
  const fetchAvatarPresetsAdmin = async () => {
    const { data } = await supabase.from('avatar_presets').select('*').order('created_at', { ascending: true });
    if (data) setAvatarPresets(data);
  };

  const handleAvatarPresetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatarPreset(true);
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}.${ext}`;
    const uploadBody = file.type === 'image/gif' ? file : await resizeImageFile(file).catch(() => file);
    const { error: uploadErr } = await supabase.storage.from('avatar-presets').upload(filename, uploadBody, { contentType: file.type });
    if (uploadErr) { showError('Upload failed: ' + uploadErr.message); setUploadingAvatarPreset(false); return; }
    const { data } = supabase.storage.from('avatar-presets').getPublicUrl(filename);
    const { error: insertErr } = await supabase.from('avatar_presets').insert({ image_url: data.publicUrl });
    if (insertErr) { showError(insertErr.message); setUploadingAvatarPreset(false); return; }
    showSuccess('Avatar added.');
    await fetchAvatarPresetsAdmin();
    setUploadingAvatarPreset(false);
    e.target.value = '';
  };

  const handleDeleteAvatarPreset = async (preset) => {
    if (!confirm('Delete this avatar?')) return;
    const path = preset.image_url.split('/avatar-presets/')[1];
    if (path) await supabase.storage.from('avatar-presets').remove([path]);
    const { error } = await supabase.from('avatar_presets').delete().eq('id', preset.id);
    if (error) { showError(error.message); return; }
    setAvatarPresets(prev => prev.filter(a => a.id !== preset.id));
    showSuccess('Avatar deleted.');
  };

  // ── Card border catalog handlers ───────────────────────
  const fetchBorderCatalogAdmin = async () => {
    const { data } = await supabase.from('card_border_catalog').select('*').order('created_at', { ascending: true });
    if (data) setBorderCatalogAdmin(data);
  };

  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleBorderUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!borderForm.label.trim() || !borderForm.unlockLabel.trim() || !borderForm.unlockValue) {
      showError('Fill in label, unlock value and unlock label first.');
      e.target.value = '';
      return;
    }
    setUploadingBorder(true);
    const key = `${slugify(borderForm.label)}-${Date.now().toString(36).slice(-4)}`;
    const ext = file.name.split('.').pop();
    const filename = `${key}.${ext}`;
    const uploadBody = await resizeImageFile(file).catch(() => file);
    const { error: uploadErr } = await supabase.storage.from('card-borders').upload(filename, uploadBody, { contentType: file.type });
    if (uploadErr) { showError('Upload failed: ' + uploadErr.message); setUploadingBorder(false); return; }
    const { data } = supabase.storage.from('card-borders').getPublicUrl(filename);
    const { error: insertErr } = await supabase.from('card_border_catalog').insert({
      key, label: borderForm.label.trim(), rarity: borderForm.rarity,
      unlock_type: borderForm.unlockType, unlock_value: Number(borderForm.unlockValue),
      unlock_label: borderForm.unlockLabel.trim(), card_image_url: data.publicUrl,
    });
    if (insertErr) { showError(insertErr.message); setUploadingBorder(false); return; }
    showSuccess('Border added.');
    await fetchBorderCatalogAdmin();
    setBorderForm({ label: '', rarity: 'common', unlockType: 'games_played', unlockValue: 10, unlockLabel: '' });
    setUploadingBorder(false);
    e.target.value = '';
  };

  const handleDeleteBorderCatalog = async (row) => {
    if (!confirm('Delete this border?')) return;
    const paths = [row.card_image_url, row.leaderboard_image_url, row.roster_image_url]
      .filter(Boolean).map(url => url.split('/card-borders/')[1]).filter(Boolean);
    if (paths.length) await supabase.storage.from('card-borders').remove(paths);
    const { error } = await supabase.from('card_border_catalog').delete().eq('id', row.id);
    if (error) { showError(error.message); return; }
    setBorderCatalogAdmin(prev => prev.filter(b => b.id !== row.id));
    showSuccess('Border deleted.');
  };

  const handleBorderVariantUpload = async (e, row, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const variantKey = `${row.id}:${field}`;
    setUploadingVariant(variantKey);
    const filename = `${row.key}-${field}-${Date.now()}.${file.name.split('.').pop()}`;
    const uploadBody = await resizeImageFile(file).catch(() => file);
    const { error: uploadErr } = await supabase.storage.from('card-borders').upload(filename, uploadBody, { contentType: file.type });
    if (uploadErr) { showError('Upload failed: ' + uploadErr.message); setUploadingVariant(null); return; }
    const { data } = supabase.storage.from('card-borders').getPublicUrl(filename);
    const { error: updateErr } = await supabase.from('card_border_catalog').update({ [field]: data.publicUrl }).eq('id', row.id);
    if (updateErr) { showError(updateErr.message); setUploadingVariant(null); return; }
    showSuccess('Border art updated.');
    await fetchBorderCatalogAdmin();
    setUploadingVariant(null);
    e.target.value = '';
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

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    if (data) setBanners(data);
  };

  const showSuccess = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
  const showError   = (msg) => { setError(msg); setSuccess(''); };

  // ── Field handlers ────────────────────────────────────
  const resetFieldForm = () => setFieldForm({
    name: '', area: '', address: '', field_rules: '', images: [],
    has_toilet: false, has_parking: false, has_shop: false, has_shoe_rent: false,
    default_slots: 15, default_price: 15, maps_url: ''
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
      default_slots: parseInt(fieldForm.default_slots) || 15,
      default_price: parseInt(fieldForm.default_price) || 15,
      maps_url: fieldForm.maps_url.trim() || null,
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
      default_slots: field.default_slots ?? 15, default_price: field.default_price ?? 15,
      maps_url: field.maps_url || '',
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
      default_slots: parseInt(fieldForm.default_slots) || 15,
      default_price: parseInt(fieldForm.default_price) || 15,
      maps_url: fieldForm.maps_url.trim() || null,
    }, { count: 'exact' }).eq('id', editingField);
    if (error) { showError(error.message); return; }
    if (count === 0) {
      showError('Update blocked. Your Supabase RLS policy is preventing this. Run the SQL fix below in your Supabase SQL editor.');
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
        equippedBorder: cardForm.border || undefined,
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

  const TABS = [
    { key: 'managers',    label: 'Managers'    },
    { key: 'playerstats', label: 'Player Stats' },
    { key: 'games',       label: 'Games'       },
    { key: 'banners',     label: 'Banners'     },
    { key: 'fields',      label: 'Fields'      },
    { key: 'backgrounds', label: 'Card BG'     },
    { key: 'cardmaker',   label: 'Card Maker'  },
    { key: 'coupons',     label: 'Coupons'     },
    { key: 'avatars',     label: 'Avatars'     },
    { key: 'borders',     label: 'Borders'     },
    { key: 'requests',    label: 'Game Requests' },
  ];

  // Same MYT-relative "is this game still upcoming" check ManagerPage uses.
  const isUpcomingGame = (g) => {
    const [year, month, day] = g.date.split('-').map(Number);
    const [hour, minute] = (g.time || '00:00').split(':').map(Number);
    const gameStart = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
    return new Date() < gameStart;
  };

  const todayMYT = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const renderGameForm = (isEdit, form, setForm) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>ASSIGN TO MANAGER (optional)</label>
        <select value={form.assigned_manager_id} onChange={e => setForm({ ...form, assigned_manager_id: e.target.value })}>
          <option value="">Unassigned — assign later</option>
          {managers.map(m => <option key={m.id} value={m.id}>{m.name || 'Unnamed'}</option>)}
        </select>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>You can assign or change the manager any time from the games list below, no need to cancel the game.</div>
      </div>
      <div>
        <label style={labelStyle}>FIELD *</label>
        <select value={form.field_id} onChange={e => {
          const selected = fields.find(f => f.id === e.target.value);
          setForm({
            ...form, field_id: e.target.value, area: selected?.area || '',
            slots: selected?.default_slots ?? form.slots,
            price: selected?.default_price ?? form.price,
          });
        }}>
          <option value="">Select a field...</option>
          {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.area})</option>)}
        </select>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>All games are {DEFAULT_GAME_FORMAT} for now.</div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>DATE *</label>
          <input type="date" value={form.date} min={todayMYT} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>TIME *</label>
          <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
        </div>
      </div>
      {form.field_id ? (
        <>
          <div>
            <label style={labelStyle}>SLOTS *</label>
            <input type="number" min="1" value={form.slots}
              onChange={e => setForm({ ...form, slots: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>PRICE (RM) *</label>
            <input type="number" min="0" value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })} />
          </div>
        </>
      ) : (
        <div style={{
          background: 'var(--card2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--muted)'
        }}>
          Select a field to prefill its default slots &amp; price.
        </div>
      )}
      <div
        onClick={() => setForm({ ...form, allow_pay_at_court: !form.allow_pay_at_court })}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
          background: form.allow_pay_at_court ? 'rgba(240,157,81,0.06)' : 'var(--card2)',
          border: `1px solid ${form.allow_pay_at_court ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10, padding: '10px 14px',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
          background: form.allow_pay_at_court ? 'var(--accent)' : 'transparent',
          border: `2px solid ${form.allow_pay_at_court ? 'var(--accent)' : 'var(--border)'}`,
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Allow Pay at Court</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Players can book now and pay by cash or QR at the venue before kickoff, instead of paying online.</div>
        </div>
      </div>
      <div>
        <label style={labelStyle}>COURT / PITCH (only if venue has more than one)</label>
        <input placeholder="e.g. Court 2 (leave blank if there's only one court)" value={form.court}
          onChange={e => setForm({ ...form, court: e.target.value })} />
      </div>
      <div>
        <label style={labelStyle}>MATCH DESCRIPTION</label>
        <textarea placeholder="Tell players what to expect..." value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
      </div>
      <GameRulesEditor
        value={form.game_rules}
        format={DEFAULT_GAME_FORMAT}
        onChange={val => setForm({ ...form, game_rules: val })}
      />
      <div>
        <label style={labelStyle}>SHOES TYPE</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SHOES.map(s => (
            <button key={s} onClick={() => {
              const current = form.shoes_type;
              setForm({ ...form, shoes_type: current.includes(s) ? current.filter(x => x !== s) : [...current, s] });
            }} style={{
              background: form.shoes_type.includes(s) ? 'rgba(240,157,81,0.15)' : 'var(--card2)',
              color: form.shoes_type.includes(s) ? 'var(--accent)' : 'var(--muted)',
              border: `1px solid ${form.shoes_type.includes(s) ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500
            }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={isEdit ? handleUpdateGame : handleAddGame} style={{
          flex: 1, padding: '12px', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
        }}>{isEdit ? <><MdSave size={15} />Save Changes</> : '+ Add Game'}</button>
        {isEdit && (
          <button onClick={() => { setEditingGame(null); setShowEditGameModal(false); resetEditGameForm(); }} style={{
            flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 10, fontSize: 14
          }}>Cancel</button>
        )}
      </div>
    </div>
  );

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
            { label: 'Managers',            val: managers.length,  icon: <IoPeople size={24} color="var(--accent)" /> },
            { label: 'Total Games',         val: games.length,     icon: <GiSoccerBall size={24} color="var(--accent)" /> },
            { label: 'Active Banners',       val: banners.filter(b => b.active).length, icon: <IoImages size={24} color="var(--accent)" /> },
            { label: 'Total Fields',       val: fields.length,    icon: <MdOutlineStadium /> },
            { label: 'Card Backgrounds',   val: cardBgs.length,   icon: <IoImages size={24} color="var(--accent)" /> },
            { label: 'Card Borders',        val: borderCatalogAdmin.length, icon: <MdSave size={24} color="var(--accent)" /> },
            { label: 'Game Requests',       val: gameRequests.length, icon: <MdSportsSoccer size={24} color="var(--accent)" /> },
            { label: 'Avatar Presets',      val: avatarPresets.length, icon: <IoImages size={24} color="var(--accent)" /> },
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

        {/* ── MANAGERS TAB ── */}
        {activeTab === 'managers' && (
          <div>
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>
                GRANT MANAGER ACCESS
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
                Search a player by name to give them manager access — you'll then be able to assign them games from the Games tab, and they'll be able to manage players and rate for games assigned to them.
              </p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <IoSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  placeholder="Search by name..." value={promoteQuery}
                  onChange={e => handlePromoteSearch(e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
              </div>
              {promoteSearching && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Searching...</div>}
              {!promoteSearching && promoteQuery && promoteResults.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No players found for "{promoteQuery}"</div>
              )}
              {promoteResults.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0
                  }}>
                    {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name?.[0] || '?').toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{p.name}</span>
                  <button onClick={() => handleGrantManager(p.id)} style={{
                    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>+ Make Manager</button>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                All Managers ({managers.length})
              </div>
              {managers.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No managers yet.</div>
              ) : managers.map((m, i) => {
                const upcoming = m.games.filter(isUpcomingGame).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
                return (
                  <div key={m.id} style={{ padding: '16px 20px', borderBottom: i < managers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: upcoming.length ? 10 : 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0
                      }}>
                        {m.avatar_url ? <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.name?.[0] || '?').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.name || 'Unnamed'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{upcoming.length} upcoming · {m.games.length} total game{m.games.length !== 1 ? 's' : ''}</div>
                      </div>
                      <button onClick={() => handleRevokeManager(m.id, m.name)} style={{
                        background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                        border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8,
                        padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                      }}>Remove</button>
                    </div>
                    {upcoming.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 46 }}>
                        {upcoming.map(g => (
                          <div key={g.id} style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FaLocationDot size={10} />
                            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{g.fields?.name || g.area}</span>
                            · {g.date} {g.time} · {g.format}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAYER STATS TAB ── */}
        {activeTab === 'playerstats' && (
          <div>
            <style>{`
              @media (max-width: 860px) {
                .player-stats-layout { grid-template-columns: 1fr !important; }
                .player-stats-cards { position: static !important; }
              }
              @media (max-width: 600px) {
                .player-stats-cards { flex-direction: column !important; align-items: center !important; }
                .player-stats-cards > div { width: 100% !important; max-width: 300px; }
              }
            `}</style>
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 8 }}>
                EDIT PLAYER CARD
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
                Search a player to directly edit their card stats, OVR and games played — use this to fix a card left wrong by a broken or duplicate rating submission.
              </p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <IoSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  placeholder="Search by name..." value={statsQuery}
                  onChange={e => handleStatsSearch(e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
              </div>
              {statsSearching && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Searching...</div>}
              {!statsSearching && statsQuery && statsResults.length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No players found for "{statsQuery}"</div>
              )}
              {statsResults.map(p => (
                <div key={p.id} onClick={() => handleSelectStatsPlayer(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0
                  }}>
                    {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name?.[0] || '?').toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'Space Mono'" }}>OVR {p.total_points ?? 0}</span>
                </div>
              ))}
            </div>

            {selectedStatsPlayer && statsForm && (
              <div className="player-stats-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 24, alignItems: 'start' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                  <div style={sectionCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)' }}>
                        EDITING: {selectedStatsPlayer.name?.toUpperCase()}
                      </h3>
                      <button onClick={() => { setSelectedStatsPlayer(null); setStatsForm(null); setPastCardStats(null); }} style={{
                        background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '5px 12px', fontSize: 12,
                      }}>Close</button>
                    </div>
                    <div>
                      <label style={labelStyle}>GAMES PLAYED</label>
                      <div style={{ fontFamily: "'Space Mono'", fontSize: 14, color: 'var(--text)' }}>
                        {selectedStatsPlayer.games_played ?? 0} <span style={{ color: 'var(--muted)', fontSize: 12 }}>(fixed to games actually played — not editable here)</span>
                      </div>
                    </div>
                  </div>

                  <div style={sectionCard}>
                    <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>PLAYER STATS</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {CARD_STAT_FIELDS.map(({ key, label }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 32, fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1 }}>{label}</span>
                          <input
                            type="range" min={30} max={99}
                            value={statsForm[key]}
                            onChange={e => setStatsForm({ ...statsForm, [key]: parseInt(e.target.value) })}
                            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                          <span style={{ width: 28, fontFamily: "'Space Mono'", fontSize: 14, fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>
                            {statsForm[key]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div onClick={() => setNotifyOnStatsSave(v => !v)} style={{ ...checkboxLabel, padding: '2px 2px 4px' }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      background: notifyOnStatsSave ? 'var(--accent)' : 'transparent',
                      border: `2px solid ${notifyOnStatsSave ? 'var(--accent)' : 'var(--border)'}`,
                    }} />
                    Email the player about this change if their OVR changes
                  </div>

                  <button
                    onClick={handleSaveStatsPlayer}
                    disabled={savingStats}
                    style={{
                      padding: '12px', background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                      opacity: savingStats ? 0.6 : 1, cursor: savingStats ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >{savingStats ? 'Saving…' : <><MdSave size={15} />Save Card</>}</button>
                </div>

                <div className="player-stats-cards" style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'center', minWidth: 0 }}>
                  {(() => {
                    const cs = pastCardStats || selectedStatsPlayer.card_stats || {};
                    const cardStatsBefore = { pac: cs.pac ?? 30, sho: cs.sho ?? 30, pas: cs.pas ?? 30, dri: cs.dri ?? 30, def: cs.def ?? 30, phy: cs.phy ?? 30 };
                    const overallBefore = calcOverall(cardStatsBefore);
                    const rankBefore = getRank(overallBefore);

                    const cardStatsPreview = { pac: statsForm.pac, sho: statsForm.sho, pas: statsForm.pas, dri: statsForm.dri, def: statsForm.def, phy: statsForm.phy };
                    const overallPreview = calcOverall(cardStatsPreview);
                    const rankPreview = getRank(overallPreview);

                    const overallDelta = overallPreview - overallBefore;

                    return (
                      <>
                        <div style={{ ...sectionCard, padding: 20, textAlign: 'center', marginBottom: 0, minWidth: 260, opacity: loadingPastCard ? 0.5 : 1 }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>
                            PAST CARD {loadingPastCard && '· loading…'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <FifaCard
                              profile={{
                                name: selectedStatsPlayer.name || 'PLAYER',
                                position: selectedStatsPlayer.position,
                                avatar_url: selectedStatsPlayer.avatar_url,
                                games_played: selectedStatsPlayer.games_played,
                                total_points: overallBefore,
                              }}
                              cardStats={cardStatsBefore}
                              rank={rankBefore}
                            />
                          </div>
                          <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                            OVR {overallBefore} · {rankBefore}
                          </div>
                          {!loadingPastCard && !pastCardHasHistory && (
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>No rated games on record — same as current.</div>
                          )}
                        </div>

                        <div style={{ ...sectionCard, padding: 20, textAlign: 'center', marginBottom: 0, minWidth: 260, borderColor: overallDelta !== 0 ? 'var(--accent)' : 'var(--border)' }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 14, letterSpacing: 2, color: 'var(--muted)', marginBottom: 14 }}>NEW CARD</div>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <FifaCard
                              profile={{
                                name: selectedStatsPlayer.name || 'PLAYER',
                                position: selectedStatsPlayer.position,
                                avatar_url: selectedStatsPlayer.avatar_url,
                                games_played: selectedStatsPlayer.games_played,
                                total_points: overallPreview,
                              }}
                              cardStats={cardStatsPreview}
                              rank={rankPreview}
                            />
                          </div>
                          <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                            OVR {overallPreview} · {rankPreview}
                            {overallDelta !== 0 && (
                              <span style={{ color: overallDelta > 0 ? '#4ade80' : 'var(--red)', fontWeight: 700, marginLeft: 6 }}>
                                ({overallDelta > 0 ? '+' : ''}{overallDelta})
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── GAMES TAB ── */}
        {activeTab === 'games' && (
          <div>
            <div style={sectionCard}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 20 }}>
                ADD NEW GAME
              </h3>
              {renderGameForm(false, gameForm, setGameForm)}
            </div>

            {/* Games list */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                All Games ({games.length})
              </div>
              {games.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No games yet.</div>
              ) : games.map((game, i) => {
                const manager = managers.find(m => m.id === game.assigned_manager_id);
                return (
                  <div key={game.id}
                    style={{
                      padding: '14px 20px',
                      borderBottom: i < games.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{game.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><FaLocationDot size={11} />{game.fields?.name} · <MdOutlineCalendarMonth size={12} />{game.date} · {game.format}</div>
                      <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'Space Mono'", marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        RM {game.price} · {game.slots} slots
                        {game.allow_pay_at_court && (
                          <span style={{
                            background: 'rgba(74,222,128,0.1)', color: '#4ade80',
                            border: '1px solid rgba(74,222,128,0.3)', borderRadius: 5,
                            padding: '1px 7px', fontSize: 10, fontWeight: 700
                          }}>CASH/QR OK</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <IoPeople size={12} style={{ color: manager ? '#64a0ff' : 'var(--red)', flexShrink: 0 }} />
                        <select
                          value={game.assigned_manager_id || ''}
                          onChange={e => handleReassignManager(game, e.target.value)}
                          style={{
                            background: manager ? 'rgba(100,160,255,0.1)' : 'rgba(240,101,67,0.1)',
                            color: manager ? '#64a0ff' : 'var(--red)',
                            border: `1px solid ${manager ? 'rgba(100,160,255,0.3)' : 'rgba(240,101,67,0.3)'}`,
                            borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700,
                            fontFamily: "'Space Mono'", width: 'auto',
                          }}
                        >
                          <option value="">Unassigned</option>
                          {managers.map(m => <option key={m.id} value={m.id}>{m.name || 'Unnamed'}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => navigate(`/game/${game.id}/rate`)} style={{
                        background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                        border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
                        padding: '5px 10px', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><LuMedal size={14} /></button>
                      <button onClick={() => handleEditGame(game)} style={{
                        background: 'var(--card2)', color: 'var(--text)',
                        border: '1px solid var(--border)', borderRadius: 8,
                        padding: '5px 12px', fontSize: 12
                      }}>Edit</button>
                      <button onClick={() => handleOpenCancelModal(game)} style={{
                        background: 'rgba(240,157,81,0.1)', color: 'var(--accent)',
                        border: '1px solid rgba(240,157,81,0.25)', borderRadius: 8,
                        padding: '5px 10px', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><MdOutlineCancel size={14} /></button>
                      <button onClick={() => handleDeleteGame(game.id)} style={{
                        background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                        border: '1px solid rgba(240,101,67,0.25)', borderRadius: 8,
                        padding: '5px 12px', fontSize: 12, fontWeight: 600
                      }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.6 }}>Recommended: 16:5 ratio (e.g. 1600×500px)</div>
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
                  <label style={labelStyle}>GOOGLE MAPS LINK</label>
                  <input placeholder="Paste link from Google Maps → Share" value={fieldForm.maps_url}
                    onChange={e => setFieldForm({ ...fieldForm, maps_url: e.target.value })} />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                    Open Google Maps, drop a pin on the field, tap Share, and paste the link here. Leave blank to fall back to a search built from the address above.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>DEFAULT SLOTS *</label>
                    <input type="number" value={fieldForm.default_slots}
                      onChange={e => setFieldForm({ ...fieldForm, default_slots: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>DEFAULT PRICE (RM) *</label>
                    <input type="number" value={fieldForm.default_price}
                      onChange={e => setFieldForm({ ...fieldForm, default_price: e.target.value })} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -8 }}>
                  New games at this field default to these slots/price. Managers can't override them.
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
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: "'Space Mono'", marginTop: 2 }}>
                      {field.default_slots ?? 15} slots · RM{field.default_price ?? 15}
                    </div>
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

                {/* Border */}
                <div style={sectionCard}>
                  <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, color: 'var(--text)', marginBottom: 16 }}>BORDER</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <div onClick={() => setCardForm(prev => ({ ...prev, border: null }))} style={{ cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ borderRadius: 10, boxShadow: !cardForm.border ? '0 0 0 2px var(--accent)' : 'none' }}>
                        <FifaCard
                          size="small"
                          profile={{ name: cardForm.name || 'PLAYER', position: cardForm.position, avatar_url: cardAvatarPreview, games_played: cardForm.games_played }}
                          cardStats={{ pac: cardForm.pac, sho: cardForm.sho, pas: cardForm.pas, dri: cardForm.dri, def: cardForm.def, phy: cardForm.phy }}
                          rank={cardForm.rank}
                        />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: "'Space Mono'", fontWeight: 700, letterSpacing: 0.5 }}>NONE</div>
                    </div>
                    {borderCatalogAdmin.map(b => {
                      const active = cardForm.border === b.key;
                      return (
                        <div key={b.key} onClick={() => setCardForm(prev => ({ ...prev, border: b.key }))} style={{ cursor: 'pointer', textAlign: 'center' }}>
                          <div style={{ borderRadius: 10, boxShadow: active ? '0 0 0 2px var(--accent)' : 'none' }}>
                            <FifaCard
                              size="small"
                              profile={{ name: cardForm.name || 'PLAYER', position: cardForm.position, avatar_url: cardAvatarPreview, games_played: cardForm.games_played }}
                              cardStats={{ pac: cardForm.pac, sho: cardForm.sho, pas: cardForm.pas, dri: cardForm.dri, def: cardForm.def, phy: cardForm.phy }}
                              rank={cardForm.rank}
                              equippedBorder={b.key}
                            />
                          </div>
                          <div style={{ marginTop: 6, fontSize: 11, color: RARITY_COLORS[b.rarity] || 'var(--muted)', fontFamily: "'Space Mono'", fontWeight: 700, letterSpacing: 0.5 }}>{b.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  {borderCatalogAdmin.length === 0 && (
                    <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>No borders in the catalog yet — add some from the Borders tab.</p>
                  )}
                </div>

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
                      equippedBorder={cardForm.border}
                    />
                  </div>
                  <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                    OVR {cardOverall} · {cardForm.rank}
                  </div>
                </div>

                {/* Leaderboard strip preview — mirrors LeaderboardPage.jsx's renderPlayerRow
                    exactly (theme.bg/border/text drive the whole row there, not fixed
                    colors) so this actually previews how the row will look on the site. */}
                {(() => {
                  const theme = getCardTheme(cardForm.rank);
                  const posAbbr = POSITION_ABBR[cardForm.position] || cardForm.position;
                  const catalogRow = borderCatalogAdmin.find(b => b.key === cardForm.border);
                  const borderRender = resolveBorderRender(catalogRow, 'leaderboard');
                  return (
                    <div style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10 }}>LEADERBOARD ROW</div>
                      <div style={{
                        background: theme.bg, border: `1.5px solid ${theme.border}`,
                        borderRadius: 14, padding: '12px 14px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        position: 'relative',
                      }}>
                        {borderRender?.type === 'image' && (
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: 14,
                            pointerEvents: 'none', zIndex: 2,
                            borderStyle: 'solid', borderWidth: '11px 13px 11px 13px', borderColor: 'transparent',
                            borderImageSource: `url(${borderRender.imageUrl})`,
                            borderImageSlice: '32 16 16 16',
                            borderImageRepeat: 'stretch',
                          }} />
                        )}
                        <div style={{ width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FaMedal size={22} color="#FFD700" />
                        </div>
                        {/* Mini card swatch */}
                        <div style={{
                          width: 36, height: 50, flexShrink: 0, borderRadius: 6,
                          background: theme.statBg, border: `1.5px solid ${theme.border}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {cardAvatarPreview
                            ? <img src={cardAvatarPreview} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: theme.text }}>
                                {(cardForm.name || 'P')[0].toUpperCase()}
                              </div>
                          }
                          <div style={{ fontFamily: "'Space Mono'", fontSize: 6, color: theme.text, fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>{posAbbr}</div>
                        </div>
                        {/* Name + rank + stats */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {cardForm.name || 'PLAYER'}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text, fontFamily: "'Space Mono'", marginBottom: 6 }}>{cardForm.rank}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {STATS.map(s => (
                              <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <div style={{ fontSize: 9, color: theme.text, fontFamily: "'Space Mono'", fontWeight: 700 }}>{s.label}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: theme.text, fontFamily: "'Space Mono'" }}>{cardForm[s.key] || 30}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* OVR */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: theme.text, lineHeight: 1, letterSpacing: 1 }}>{cardOverall}</div>
                          <div style={{ fontSize: 9, color: theme.muted, fontFamily: "'Space Mono'", letterSpacing: 1 }}>OVR</div>
                          {cardForm.games_played > 0 && <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{cardForm.games_played} games</div>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Game detail strip preview — mirrors GameDetailPage.jsx's roster row
                    (theme.bg background + PlayerAvatar for the border/ring), not a
                    generic accent-bar card, so it matches the real in-game roster look. */}
                {(() => {
                  const theme = getCardTheme(cardForm.rank);
                  return (
                    <div style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 11, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10 }}>GAME DETAIL ROW</div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px',
                        background: theme.bg,
                        border: `1.5px solid ${theme.border}`,
                        borderRadius: 10,
                        position: 'relative',
                      }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 9, background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 55%)', pointerEvents: 'none' }} />
                        <EquippedBorderFrame equippedBorder={cardForm.border} context="roster" borderRadius={9} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <PlayerAvatar
                            profile={{ name: cardForm.name || 'PLAYER', avatar_url: cardAvatarPreview }}
                            size={42} borderColor={theme.border} background={theme.statBg}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {cardForm.name || 'PLAYER'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: "'Space Mono'", fontSize: 11, fontWeight: 700, color: theme.text }}>{cardForm.rank}</span>
                            {cardForm.position && <span style={{ fontSize: 11, color: theme.muted }}>· {cardForm.position}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: theme.text, lineHeight: 1 }}>{cardOverall}</div>
                          <div style={{ fontFamily: "'Space Mono'", fontSize: 9, color: theme.muted, letterSpacing: 1, marginTop: 1 }}>OVR</div>
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

              </div>

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

        {/* ── AVATARS TAB ── */}
        {activeTab === 'avatars' && (
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>AVATAR PRESETS</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                These are the profile pictures players choose from at signup. Anyone without one already gets assigned a random preset automatically. Recommended: square image, min 200×200px.
              </p>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: uploadingAvatarPreset ? 'var(--card2)' : 'var(--accent)',
                color: uploadingAvatarPreset ? 'var(--muted)' : '#fff',
                fontWeight: 700, fontSize: 13, cursor: uploadingAvatarPreset ? 'default' : 'pointer',
                opacity: uploadingAvatarPreset ? 0.6 : 1,
              }}>
                {uploadingAvatarPreset ? 'Uploading...' : '+ Upload Avatar'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarPresetUpload} disabled={uploadingAvatarPreset} />
              </label>
            </div>

            {avatarPresets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
                No avatars uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16 }}>
                {avatarPresets.map(preset => (
                  <div key={preset.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <img src={preset.image_url} alt="" style={{
                      width: 84, height: 84, borderRadius: '50%', objectFit: 'cover',
                      border: '2px solid var(--border)', background: 'var(--card)',
                    }} />
                    <button onClick={() => handleDeleteAvatarPreset(preset)} style={{
                      background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(240,101,67,0.25)', borderRadius: 6,
                      padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'borders' && (
          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 2, color: 'var(--text)', marginBottom: 6 }}>CARD BORDERS</div>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                Custom card border cosmetics, unlocked automatically once a player crosses the threshold. Fill in the details, then upload a transparent PNG (2:3 aspect ratio, e.g. 600×900px) to add it.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <input placeholder="Label (e.g. Iron Wall)" value={borderForm.label} onChange={e => setBorderForm({ ...borderForm, label: e.target.value })} style={{ flex: '1 1 180px' }} />
                <select value={borderForm.rarity} onChange={e => setBorderForm({ ...borderForm, rarity: e.target.value })} style={{ flex: '0 1 130px' }}>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
                <select value={borderForm.unlockType} onChange={e => setBorderForm({ ...borderForm, unlockType: e.target.value })} style={{ flex: '0 1 160px' }}>
                  <option value="games_played">Games Played</option>
                  <option value="mvp_count">MVP Count</option>
                  <option value="podium_count">Podium Count</option>
                </select>
                <input type="number" min="1" placeholder="Threshold" value={borderForm.unlockValue} onChange={e => setBorderForm({ ...borderForm, unlockValue: e.target.value })} style={{ flex: '0 1 100px' }} />
                <input placeholder="Unlock text (e.g. Play 25 games)" value={borderForm.unlockLabel} onChange={e => setBorderForm({ ...borderForm, unlockLabel: e.target.value })} style={{ flex: '1 1 200px' }} />
              </div>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: uploadingBorder ? 'var(--card2)' : 'var(--accent)',
                color: uploadingBorder ? 'var(--muted)' : '#fff',
                fontWeight: 700, fontSize: 13, cursor: uploadingBorder ? 'default' : 'pointer',
                opacity: uploadingBorder ? 0.6 : 1,
              }}>
                {uploadingBorder ? 'Uploading...' : '+ Upload Border Image'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBorderUpload} disabled={uploadingBorder} />
              </label>
            </div>

            {borderCatalogAdmin.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
                No borders yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                {borderCatalogAdmin.map(b => (
                  <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {b.card_image_url ? (
                      <img src={b.card_image_url} alt="" style={{ width: 60, height: 90, objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: 60, height: 90, borderRadius: 6, background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>
                        Built-in
                      </div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 700, color: RARITY_COLORS[b.rarity] || 'var(--text)', textAlign: 'center' }}>{b.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{b.unlock_label}</div>

                    {/* Compact-context art — uploaded per row, separate from the card image above */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['leaderboard_image_url', 'LB'], ['roster_image_url', 'Roster']].map(([field, short]) => {
                        const has = !!b[field];
                        const busy = uploadingVariant === `${b.id}:${field}`;
                        return (
                          <label key={field} title={has ? `${short} art uploaded` : `Upload ${short} art`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 8px', borderRadius: 6, cursor: busy ? 'default' : 'pointer',
                            background: has ? 'rgba(74,222,128,0.1)' : 'var(--card2)',
                            border: `1px solid ${has ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                            color: has ? '#4ade80' : 'var(--muted)',
                            fontSize: 10, fontWeight: 700, opacity: busy ? 0.6 : 1,
                          }}>
                            {busy ? '...' : `${has ? '✓ ' : '+ '}${short}`}
                            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy} onChange={e => handleBorderVariantUpload(e, b, field)} />
                          </label>
                        );
                      })}
                    </div>

                    <button onClick={() => handleDeleteBorderCatalog(b)} style={{
                      background: 'rgba(240,101,67,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(240,101,67,0.25)', borderRadius: 6,
                      padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GAME REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div>
            {/* SQL setup note */}
            <div style={{ background: 'rgba(240,157,81,0.08)', border: '1px solid rgba(240,157,81,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Mono'", fontSize: 11, color: 'var(--accent)', letterSpacing: 1, marginBottom: 6 }}>ONE-TIME SETUP</div>
              <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.7, marginBottom: 8 }}>
                If you haven't created the game_requests table yet, run this SQL in your Supabase SQL editor. request_date is generated automatically from created_at in Malaysia time, don't insert it directly.
              </p>
              <code style={{ display: 'block', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text)', fontFamily: "'Space Mono'", lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{`create table game_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  area text,
  created_at timestamptz default now(),
  request_date date generated always as (
    (created_at at time zone 'Asia/Kuala_Lumpur')::date
  ) stored,
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
              <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                Note: if your table already exists without the <code style={{ fontFamily: "'Space Mono'" }}>unique (user_id, request_date)</code> constraint, "once per day" is only enforced by the app, not the database. Add it with:
              </p>
              <code style={{ display: 'block', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--text)', fontFamily: "'Space Mono'", lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: 8 }}>{`alter table game_requests
  add constraint game_requests_user_id_request_date_key unique (user_id, request_date);`}</code>
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

      {/* ── EDIT GAME MODAL ── */}
      {showEditGameModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowEditGameModal(false); setEditingGame(null); resetEditGameForm(); } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>EDIT GAME</h3>
              <button
                onClick={() => { setShowEditGameModal(false); setEditingGame(null); resetEditGameForm(); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              ><IoClose size={18} /></button>
            </div>
            {renderGameForm(true, editGameForm, setEditGameForm)}
          </div>
        </div>
      )}

      {/* ── CANCEL GAME MODAL ── */}
      {cancelingGame && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !cancelling) setCancelingGame(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 2, color: 'var(--text)', margin: 0 }}>CANCEL GAME</h3>
              <button
                onClick={() => !cancelling && setCancelingGame(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              ><IoClose size={18} /></button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              {cancelingGame.title} · {cancelingGame._playerCount} player{cancelingGame._playerCount !== 1 ? 's' : ''} joined
            </p>

            <label style={labelStyle}>REASON</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {CANCEL_REASONS.map(r => (
                <button key={r} type="button" onClick={() => setCancelReason(r)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: cancelReason === r ? 'var(--accent)' : 'var(--card2)',
                  color: cancelReason === r ? '#fff' : 'var(--muted)',
                  border: `1px solid ${cancelReason === r ? 'var(--accent)' : 'var(--border)'}`,
                }}>{r}</button>
              ))}
            </div>

            {cancelingGame._playerCount > 0 && (
              <div style={{
                background: 'rgba(240,157,81,0.08)', border: '1px solid rgba(240,157,81,0.25)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                fontSize: 13, color: 'var(--accent)', lineHeight: 1.6,
              }}>
                All {cancelingGame._playerCount} player{cancelingGame._playerCount !== 1 ? 's' : ''} will be refunded RM {Number(cancelingGame.price).toFixed(2)} each
                (RM {(cancelingGame._playerCount * cancelingGame.price).toFixed(2)} total) to their wallets.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCancelingGame(null)}
                disabled={cancelling}
                style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 14 }}
              >Back</button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                style={{ flex: 2, padding: '12px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, opacity: cancelling ? 0.6 : 1 }}
              >{cancelling ? 'Cancelling...' : 'Confirm Cancel & Refund'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
