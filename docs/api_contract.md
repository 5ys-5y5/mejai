# API 계약서 초안 (v1)

본 문서는 Mejai MVP에서 프론트엔드와 백엔드가 동일 규격으로 통신하기 위한 API 계약서입니다.

## 1) 공통 규칙
- Base URL: `https://mejai.help/api` (운영)
- 인증: Bearer 토큰 (Supabase JWT)
- 헤더
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- 페이지네이션
  - `limit`, `offset` 기반
- 정렬
  - `order=created_at.desc|asc`
- 시간 형식: ISO 8601 (`2026-01-22T05:30:00Z`)
- 조직 스코프
  - 모든 데이터는 `org_id` 범위에서만 조회/수정

## 2) 에러 규격
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다.",
    "trace_id": "req_123456"
  }
}
```

## 3) 엔드포인트 목록 (요약)
- 인증
  - `POST /auth/signup`
  - `POST /auth/login`
- 세션
  - `GET /sessions`
  - `GET /sessions/{id}`
- 턴 로그
  - `GET /sessions/{id}/turns`
- 오디오 구간
  - `GET /sessions/{id}/audio-segments`
- 이벤트 로그
  - `GET /sessions/{id}/events`
- 리뷰 큐
  - `GET /review-queue`
- 지식베이스
  - `GET /kb`
  - `POST /kb`
- 감사 로그
  - `GET /audit-logs`

## 4) 요청/응답 스키마

### 4.1 인증
#### POST /auth/signup
```json
{
  "email": "user@mejai.help",
  "password": "********"
}
```

#### POST /auth/login
```json
{
  "email": "user@mejai.help",
  "password": "********"
}
```

### 4.2 세션 목록
#### GET /sessions?limit=20&offset=0&order=created_at.desc
응답 예시:
```json
{
  "items": [
    {
      "id": "uuid",
      "session_code": "s_9d3f2b",
      "org_id": "uuid",
      "started_at": "2026-01-21T01:12:00Z",
      "ended_at": "2026-01-21T01:17:12Z",
      "duration_sec": 312,
      "channel": "유선",
      "caller_masked": "+82-10-****-5678",
      "agent_id": "a_support",
      "outcome": "해결",
      "sentiment": "보통",
      "escalation_reason": "해당 없음",
      "satisfaction": 1
    }
  ],
  "total": 1
}
```

### 4.3 세션 상세
#### GET /sessions/{id}
```json
{
  "id": "uuid",
  "session_code": "s_9d3f2b",
  "org_id": "uuid",
  "started_at": "2026-01-21T01:12:00Z",
  "ended_at": "2026-01-21T01:17:12Z",
  "duration_sec": 312,
  "channel": "유선",
  "caller_masked": "+82-10-****-5678",
  "agent_id": "a_support",
  "outcome": "해결",
  "sentiment": "보통",
  "recording_url": "https://storage/...",
  "escalation_reason": "해당 없음",
  "satisfaction": 1,
  "metadata": {}
}
```

### 4.4 턴 로그
#### GET /sessions/{id}/turns
```json
[
  {
    "turn_id": "uuid",
    "seq": 1,
    "start_time": "00:00",
    "end_time": "00:20",
    "asr_text": "안녕하세요...",
    "asr_confidence": 0.92,
    "summary_text": "고객 문의 요약...",
    "confirmation_prompt": "~가 맞나요?",
    "confirmation_response": "네 맞아요",
    "correction_text": "추가 수정 내용",
    "final_answer": "안내드립니다...",
    "created_at": "2026-01-21T01:12:20Z"
  }
]
```

### 4.5 오디오 구간
#### GET /sessions/{id}/audio-segments
```json
[
  {
    "segment_id": "uuid",
    "label": "인사",
    "start_time": "00:00",
    "end_time": "00:10",
    "audio_url": "https://storage/..."
  }
]
```

### 4.6 이벤트 로그
#### GET /sessions/{id}/events
```json
[
  {
    "event_id": "uuid",
    "event_type": "SUMMARY_GENERATED",
    "payload": { "summary": "..." },
    "created_at": "2026-01-21T01:13:00Z"
  }
]
```

### 4.7 리뷰 큐
#### GET /review-queue?limit=20&offset=0
```json
{
  "items": [
    {
      "id": "rq_01",
      "session_id": "uuid",
      "reason": "후속 지원 요청",
      "owner": "홍길동",
      "status": "Open",
      "created_at": "2026-01-20T08:00:00Z"
    }
  ],
  "total": 1
}
```

### 4.8 지식베이스
#### GET /kb?limit=20&offset=0
```json
[
  {
    "id": "kb_001",
    "title": "환불 정책",
    "version": "v3",
    "status": "Published",
    "updated_at": "2026-01-18",
    "category": "환불"
  }
]
```

#### POST /kb
```json
{
  "title": "신규 정책",
  "content": "...",
  "category": "환불"
}
```

### 4.9 감사 로그
#### GET /audit-logs?limit=50&offset=0
```json
[
  {
    "id": "audit_01",
    "actor": "operator@mejai.help",
    "action": "VIEW_SESSION",
    "target": "sessions:s_9d3f2b",
    "created_at": "2026-01-21T01:30:00Z"
  }
]
```

## 5) 화면별 매핑
- `/app` : GET /sessions, GET /review-queue
- `/app/calls` : GET /sessions
- `/app/calls/{id}` : GET /sessions/{id}, GET /sessions/{id}/turns, GET /sessions/{id}/audio-segments, GET /sessions/{id}/events
- `/app/review` : GET /review-queue
- `/app/kb` : GET /kb, POST /kb
- `/app/settings` : GET /audit-logs
