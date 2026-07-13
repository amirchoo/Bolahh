alter table games add column allow_pay_at_court boolean not null default false;
alter table game_players add column payment_method text not null default 'wallet';
alter table game_players add column payment_status text not null default 'paid';
