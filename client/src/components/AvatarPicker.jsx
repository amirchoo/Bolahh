import { useEffect, useState } from 'react';
import { IoCloudUploadOutline } from 'react-icons/io5';
import { supabase } from '../lib/supabaseClient';

export async function fetchAvatarPresets() {
  const { data } = await supabase.from('avatar_presets').select('image_url').order('created_at', { ascending: true });
  return (data || []).map(r => r.image_url);
}

export default function AvatarPicker({ value, onSelect, size = 64, onUploadClick, uploadLabel = 'Upload' }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvatarPresets().then(opts => { setOptions(opts); setLoading(false); });
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>Loading avatars...</p>;
  }
  if (!options.length && !onUploadClick) {
    return <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>No avatars available yet.</p>;
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(4, ${size}px)`,
      gap: 14, justifyContent: 'center',
    }}>
      {onUploadClick && (
        <button
          type="button"
          onClick={onUploadClick}
          style={{
            width: size, height: size, borderRadius: '50%', padding: 0,
            border: '2px dashed var(--border)', background: 'var(--card2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, cursor: 'pointer', color: 'var(--muted)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <IoCloudUploadOutline size={Math.round(size * 0.3)} />
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.2, textAlign: 'center', lineHeight: 1.15, padding: '0 5px', whiteSpace: 'normal' }}>{uploadLabel}</span>
        </button>
      )}
      {options.map(url => {
        const selected = value === url;
        return (
          <button
            key={url}
            type="button"
            onClick={() => onSelect(url)}
            style={{
              width: size, height: size, borderRadius: '50%', padding: 0,
              border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
              boxShadow: selected ? '0 0 0 3px rgba(240,157,81,0.25)' : 'none',
              overflow: 'hidden', cursor: 'pointer', background: 'var(--card2)',
              transition: 'all 0.15s',
            }}
          >
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        );
      })}
    </div>
  );
}
