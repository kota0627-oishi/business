# 広告PDCAダッシュボード

Amazon（ツールフォーセラー）と楽天広告CSVを読み込み、商品別の広告実績・前回比較・改善点を確認するダッシュボードです。

## GitHub Pages

このフォルダをGitHubリポジトリにアップロードし、GitHub Pagesを有効化すると公開できます。

公開対象ファイル:

- `index.html`
- `xlsx.full.min.js`

## クラウド同期

他のPCでもデータを共有する場合は、Supabaseに `ad_pdca_state` テーブルを作成し、画面上の同期設定に以下を入力します。

- 同期ID
- Supabase URL
- Supabase Anon Key

## Supabase SQL

```sql
create table if not exists public.ad_pdca_state (
  workspace_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ad_pdca_state enable row level security;

create policy "allow anon read ad pdca state"
on public.ad_pdca_state
for select
to anon
using (true);

create policy "allow anon upsert ad pdca state"
on public.ad_pdca_state
for insert
to anon
with check (true);

create policy "allow anon update ad pdca state"
on public.ad_pdca_state
for update
to anon
using (true)
with check (true);
```
