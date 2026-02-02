-- Admin KB(mk2) 실행 강제 규칙 보강
-- 대상: B_bot_knowledge_bases.id = 0da02c01-aad4-4286-a445-4db7a89f8ebe
-- 목적:
-- 1) 우편번호 미입력 상태에서 update_order_shipping_address 강제 실행 방지
-- 2) 우편번호 재질문 템플릿을 admin policy(content_json)에 직접 관리

with target as (
  select
    id,
    coalesce(content_json, '{}'::jsonb) as cj
  from "B_bot_knowledge_bases"
  where id = '0da02c01-aad4-4286-a445-4db7a89f8ebe'::uuid
    and is_admin = true
  for update
),
rule_catalog as (
  select *
  from (
    values
      (
        'R268_order_change_need_zipcode_tool',
        jsonb_build_object(
          'id', 'R268_order_change_need_zipcode_tool',
          'stage', 'tool',
          'priority', 668,
          'when', jsonb_build_object(
            'all', jsonb_build_array(
              jsonb_build_object('predicate', 'intent.is', 'args', jsonb_build_object('value', 'order_change')),
              jsonb_build_object('predicate', 'entity.order_id.present'),
              jsonb_build_object('predicate', 'entity.address.present'),
              jsonb_build_object('predicate', 'entity.zipcode.missing')
            )
          ),
          'enforce', jsonb_build_object(
            'actions', jsonb_build_array(
              jsonb_build_object('type', 'force_response_template', 'template_id', 'order_change_need_zipcode')
            )
          )
        )
      ),
      (
        'R302_order_change_need_zipcode_output',
        jsonb_build_object(
          'id', 'R302_order_change_need_zipcode_output',
          'stage', 'output',
          'priority', 597,
          'when', jsonb_build_object(
            'all', jsonb_build_array(
              jsonb_build_object('predicate', 'intent.is', 'args', jsonb_build_object('value', 'order_change')),
              jsonb_build_object('predicate', 'entity.order_id.present'),
              jsonb_build_object('predicate', 'entity.address.present'),
              jsonb_build_object('predicate', 'entity.zipcode.missing')
            )
          ),
          'enforce', jsonb_build_object(
            'actions', jsonb_build_array(
              jsonb_build_object('type', 'force_response_template', 'template_id', 'order_change_need_zipcode')
            )
          )
        )
      )
  ) as t(rule_id, rule_json)
),
rules_to_append as (
  select coalesce(jsonb_agg(rc.rule_json), '[]'::jsonb) as arr
  from target t
  join rule_catalog rc on true
  where not exists (
    select 1
    from jsonb_array_elements(coalesce(t.cj->'rules', '[]'::jsonb)) r
    where r->>'id' = rc.rule_id
  )
)
update "B_bot_knowledge_bases" kb
set content_json = jsonb_set(
  jsonb_set(
    target.cj,
    '{rules}',
    coalesce(target.cj->'rules', '[]'::jsonb) || (select arr from rules_to_append),
    true
  ),
  '{templates}',
  coalesce(target.cj->'templates', '{}'::jsonb) || jsonb_build_object(
    'order_change_need_zipcode', '배송지 변경을 위해 우편번호(5자리)를 알려주세요. 예) 06236'
  ),
  true
)
from target
where kb.id = target.id;

-- 검증 1) 룰 존재 확인
select
  id,
  title,
  jsonb_path_exists(content_json, '$.rules[*] ? (@.id == "R268_order_change_need_zipcode_tool")') as has_r268,
  jsonb_path_exists(content_json, '$.rules[*] ? (@.id == "R302_order_change_need_zipcode_output")') as has_r302,
  content_json->'templates'->>'order_change_need_zipcode' as tpl_need_zipcode
from "B_bot_knowledge_bases"
where id = '0da02c01-aad4-4286-a445-4db7a89f8ebe'::uuid;
