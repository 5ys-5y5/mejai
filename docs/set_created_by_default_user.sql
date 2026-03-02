-- 지정 사용자로 created_by 일괄 설정
-- 대상 사용자: fa7baaa2-806f-4457-88f0-7d29f802d126 (sungjy2020@gmail.com)

update public."B_bot_agents"
set created_by = 'fa7baaa2-806f-4457-88f0-7d29f802d126'::uuid;

update public."B_bot_knowledge_bases"
set created_by = 'fa7baaa2-806f-4457-88f0-7d29f802d126'::uuid;

update public."B_chat_widgets"
set created_by = 'fa7baaa2-806f-4457-88f0-7d29f802d126'::uuid;

update public."C_mcp_tools"
set created_by = 'fa7baaa2-806f-4457-88f0-7d29f802d126'::uuid;
