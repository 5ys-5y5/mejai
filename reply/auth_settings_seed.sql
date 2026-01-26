insert into public.auth_settings (
  org_id,
  user_id,
  providers
)
values (
  '8ad81b6b-3210-40dd-8e00-9a43a4395923',
  'fa7baaa2-806f-4457-88f0-7d29f802d126',
  jsonb_build_object(
    'cafe24', jsonb_build_object(
      'mall_id', 'sungjy2020',
      'client_id', 'JAYmwae9LCbAzEWz3vIsdB',
      'client_secret', '9Nm0W86KMl3oSbxrrwdeaC',
      'scope', 'mall.read_application mall.write_application mall.read_category mall.write_category mall.read_product mall.write_product mall.read_collection mall.write_collection mall.read_supply mall.write_supply mall.read_personal mall.write_personal mall.read_order mall.write_order mall.read_community mall.write_community mall.read_customer mall.write_customer mall.read_notification mall.write_notification mall.read_store mall.write_store mall.read_promotion mall.write_promotion mall.read_design mall.write_design mall.read_salesreport mall.read_shipping mall.write_shipping mall.read_translation mall.write_translation mall.read_analytics',
      'shop_no', '1',
      'board_no', '9',
      'access_token', 'JrclD15eF6TFrcoO3X2PhF',
      'refresh_token', 'BmdxLjczBRdmFvMyNHE1yD',
      'expires_at', (now() + interval '2 hours')
    )
  )
)
on conflict (org_id, user_id)
do update set
  providers = public.auth_settings.providers || excluded.providers,
  updated_at = now();
