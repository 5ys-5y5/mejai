# 변경 요약
- embed URL에서 parameter=true(또는 paremeter=true)일 때 widget.* 쿼리 파라미터를 chat_policy 오버라이드로 반영.
- /embed/{public_key}와 /embed/{template_key} 및 /embed/public_key=.../embed/template_key=... 경로를 구분하여 public_key 또는 template_id로 init 요청.
- ovr(base64) 오버라이드와 쿼리 오버라이드를 병합.

# 변경 전
- /api/widget/init payload에 public_key와 template_id가 모두 key로 전송됨.
- URL 쿼리의 widget.header.logo=0/1 형태는 무시됨.

# 변경 후
- key prefix 및 parameter=true에 따라 public_key 또는 template_id를 분리 전송.
- widget.* 쿼리 파라미터를 /embed 페이지의 features 오버라이드로 적용.
- ovr와 쿼리 오버라이드를 병합.

# 수정 파일
- src/app/embed/[key]/page.tsx
