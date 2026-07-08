import { supabase } from './supabaseClient';

export async function refundGamePlayers(gameId, gameTitle, gamePrice, reasonLabel) {
  const { data: gamePlayers } = await supabase
    .from('game_players').select('user_id').eq('game_id', gameId);
  const userIds = (gamePlayers || []).map(p => p.user_id);

  await Promise.all(userIds.map(async (uid) => {
    const { data: freshProfile } = await supabase
      .from('profiles').select('wallet_balance').eq('id', uid).single();
    const freshBalance = freshProfile?.wallet_balance || 0;
    const newBalance = parseFloat((freshBalance + gamePrice).toFixed(2));
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', uid);
    await supabase.from('wallet_transactions').insert({
      user_id: uid,
      type: 'refund',
      amount: gamePrice,
      description: `Game cancelled (${reasonLabel}): ${gameTitle}`,
      balance_after: newBalance,
    });
  }));

  return userIds.length;
}
