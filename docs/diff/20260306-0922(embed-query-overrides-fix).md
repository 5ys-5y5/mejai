# 변경 요약
- embed URL의 widget.* 쿼리 파라미터를 chat_policy.pages['/embed'].features.widget.* 경로로 저장하도록 수정.

# 변경 전
- widget.header.logo=0 -> features.header.logo 로 저장되어 실제 정책에 반영되지 않음.

# 변경 후
- widget.header.logo=0 -> features.widget.header.logo 로 저장되어 정책 반영됨.

# 수정 파일
- src/app/embed/[key]/page.tsx
