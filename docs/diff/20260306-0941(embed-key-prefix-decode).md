# 변경 요약
- /embed/public_key=... 또는 /embed/template_key=... 경로에서 URL 인코딩된 key를 decode 후 prefix 판별.

# 변경 전
- key가 public_key%3D... 형태로 들어오면 prefix 인식 실패.

# 변경 후
- decodeURIComponent 적용으로 public_key=... 인식 가능.

# 수정 파일
- src/app/embed/[key]/page.tsx
