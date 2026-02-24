# 회원가입 이슈 정리 (시간 순서)

## 개요
- 증상: 회원가입 시 `POST /auth/v1/signup`가 504 Gateway Timeout
- 영향: 이메일 인증 기반 신규 가입 불가
- 범위: 브라우저 직접 호출 및 서버 프록시 호출 모두 실패

## 타임라인 (주요 시도 순서)
1. **가입 페이지 오류 확인**
- 회원가입 버튼 클릭 후 504 발생
- 네트워크 탭에서 `POST https://grfkmbrhbvcyahflqttl.supabase.co/auth/v1/signup` 504 확인

2. **서버 프록시(/api/auth/signup) 추가**
- 브라우저 직접 호출 대신 서버에서 Supabase Auth 호출
- 목적: 재시도/타임아웃/로그 확보
- 결과: 서버에서도 502/AbortError 발생

3. **환경변수 로딩 방식 점검**
- `B_chat_settings.runtime_env` 암호화 저장 구조 확인
- `applyManagedEnvOverrides`로 런타임 시점에 env 주입 적용
- 결과: env 정상 로드 확인됨 (`env_loaded` 로그로 검증)

4. **서버 단계별 디버깅 로그 추가**
- 로그 단계: start → env_loaded → health_check → attempt_start → supabase_response/attempt_exception
- 결과:
- `health_check`는 200 OK
- `signup` 호출은 타임아웃(AbortError) 반복

5. **브라우저 직접 호출로 복귀**
- Supabase JS 직접 호출로 변경
- 결과: 브라우저에서도 동일하게 504 발생

6. **Rate limit 이슈 확인**
- 서버 프록시 시도 중 429 발생 기록
- Supabase 이메일 발송 rate limit 상향(50→200) 후에도 504 지속

7. **invite fallback 시도**
- 서버에서 `auth.admin.inviteUserByEmail` 우회
- 결과: `email rate limit exceeded` 혹은 빈 오류 발생
- 근본 원인 해결 불가

## 확인된 사실
- **CORS OPTIONS**는 200으로 정상
- **POST /auth/v1/signup**만 504
- **health endpoint**는 200
- **환경변수 로드**는 정상 (`env_loaded` 로그)
- **브라우저 직접 호출**도 동일 증상

## 유의미한 원인 범위
1. **Supabase Auth signup 처리 지연/불능**
- health는 정상이나 signup만 타임아웃
- Supabase 내부 서비스/리전/프로젝트 상태 문제 가능성

2. **Supabase 이메일 발송 시스템 제한/지연**
- 429, rate limit exceeded 기록
- invite 방식도 실패

3. **프로젝트 Auth 설정 문제**
- SMTP/Email provider 설정 오류 또는 비활성
- Auth 설정 내 rate limit/보안 정책 영향 가능

## 현재 결론
- **코드/클라이언트/서버 모두 동일 실패**이므로, 로컬 코드 문제 가능성 낮음
- **Supabase Auth 처리 과정 자체가 응답하지 않거나, 이메일 발송 단계에서 정지**되는 것으로 판단

## 다음 확인 권장 (Supabase 대시보드)
- Auth → Settings → Email provider 활성화 여부
- SMTP 설정 유효성
- Auth → Logs 에서 signup 요청이 도달하는지
- Rate limit 설정 및 최근 사용량
- 프로젝트 상태/리전 장애 여부
