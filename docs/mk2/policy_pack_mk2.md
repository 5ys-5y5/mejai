# MK2 Policy Notes

Purpose:
- Define restock answerability and restock state as deterministic decision inputs.
- Keep LLM generation free while decision and tool usage are gated by policy.

New context fields required by mk2:
- product.id
- product.answerable (boolean)
- product.restock_known (boolean)
- product.restock_policy (NO_RESTOCK | RESTOCK_AT | UNKNOWN)
- product.restock_at (date | null)
- entity.channel (sms | kakao | email | etc.)

New predicates to add in policy engine:
- product.answerable
- product.restock_known

Args template placeholders (to implement in mk2 tool gate):
- {{product.id}}
- {{entity.channel}}
- {{entity.phone}}

Notes:
- policy_pack_mk2.json is a draft for mk2 and expects the new predicates and templating.
- Use product_rule + product_alias tables as the source of truth for product answerability and restock state.
