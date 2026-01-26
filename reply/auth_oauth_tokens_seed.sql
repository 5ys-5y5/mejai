insert into public.auth_oauth_tokens (
  org_id,
  user_id,
  provider,
  mall_id,
  client_id,
  client_secret,
  access_token,
  refresh_token,
  expires_at,
  updated_at
)
values (
  '8ad81b6b-3210-40dd-8e00-9a43a4395923',
  'fa7baaa2-806f-4457-88f0-7d29f802d126',
  'cafe24',
  'sungjy2020',
  'JAYmwae9LCbAzEWz3vIsdB',
  '9Nm0W86KMl3oSbxrrwdeaC',
  'JrclD15eF6TFrcoO3X2PhF',
  'BmdxLjczBRdmFvMyNHE1yD',
  now() + interval '2 hours',
  now()
)
on conflict (org_id, user_id, provider)
do update set
  mall_id = excluded.mall_id,
  client_id = excluded.client_id,
  client_secret = excluded.client_secret,
  access_token = excluded.access_token,
  refresh_token = excluded.refresh_token,
  expires_at = excluded.expires_at,
  updated_at = now();
