# 변경 요약
- localhost 테스트를 위해 allowed_domains에 포트 포함 시 hostname만 사용하도록 정규화.

# 변경 전
- allowed_domains에 http://localhost:3000 추가 시 host(localhost)와 불일치로 DOMAIN_NOT_ALLOWED.

# 변경 후
- allowed_domains에 localhost 형태로 저장되어 host와 매칭.

# 수정 파일
- src/app/embed/[key]/page.tsx
