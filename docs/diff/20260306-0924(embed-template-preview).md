# 변경 요약
- 템플릿 키 사용 시 preview 플래그를 자동 활성화하여 same-origin 미리보기로 init 가능하게 함.

# 변경 전
- 템플릿 키로 /embed 접근 시 preview=false -> is_public=false 템플릿은 WIDGET_NOT_FOUND.

# 변경 후
- 템플릿 키(또는 UUID 형태 키)는 preview=true로 전송되어 same-origin 미리보기 허용.

# 수정 파일
- src/app/embed/[key]/page.tsx
