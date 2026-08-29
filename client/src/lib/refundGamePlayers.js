import { supabase } from './supabaseClient';

export async function refundGamePlayers(gameId, gameTitle, gamePrice, reasonLabel) {
  const { data: gamePlayers } = await supabase
    .from('game_players').select('user_id, amount_paid, payment_method, payment_status, is_guest').eq('game_id', gameId);

  // Guests have no wallet/account to refund and no user_id to log against — their
  // share of the money is already accounted for in the booker's row, which is
  // still in this same result set and gets refunded normally.
  const refundableRows = (gamePlayers || []).filter(p => !p.is_guest);

  await Promise.all(refundableRows.map(async ({ user_id: uid, amount_paid, payment_method, payment_status }) => {
    // A 'pending' row (cash-at-court, or a direct-pay ToyyibPay bill never completed)
    // never actually collected money — nothing to refund.
    const refundAmount = payment_status === 'pending' ? 0 : (amount_paid ?? gamePrice);
    const { data: freshProfile } = await supabase
      .from('profiles').select('wallet_balance').eq('id', uid).single();
    const freshBalance = freshProfile?.wallet_balance || 0;
    const newBalance = parseFloat((freshBalance + refundAmount).toFixed(2));
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', uid);
    await supabase.from('wallet_transactions').insert({
      user_id: uid,
      type: 'refund',
      amount: refundAmount,
      description: `Game cancelled (${reasonLabel}): ${gameTitle}`,
      balance_after: newBalance,
    });
    await supabase.from('game_cancellations').insert({
      game_id: gameId,
      user_id: uid,
      payment_method,
      amount_paid,
      refund_amount: refundAmount,
      reason: reasonLabel,
    });
  }));

  return refundableRows.length;
}
