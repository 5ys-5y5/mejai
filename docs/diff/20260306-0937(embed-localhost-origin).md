# 변경 요약
- /embed 요청에서 origin/page_url이 비어있으면 현재 브라우저 URL을 사용.
- parameter=true일 때 allowed_domains가 비어있으면 현재 origin을 overrides.allowed_domains로 주입(테스트용 localhost 허용).

# 변경 전
- origin/page_url/referrer가 비어있으면 DOMAIN_NOT_ALLOWED로 실패 가능.
- parameter=true여도 allowed_domains는 변경되지 않음.

# 변경 후
- localhost 테스트 시 origin/page_url이 자동으로 채워지고, allowed_domains가 비어있으면 localhost가 추가됨.

# 수정 파일
- src/app/embed/[key]/page.tsx
