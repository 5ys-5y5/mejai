# Confirmed Entity / Entity 지속 및 재사용 설계 (전 런타임 불변식)

## 배경과 문제 요약
- 로그에서 TURN_ID `21895f1e-a6e4-4566-95ba-7895e6602d92`에서 상품 후보가 제안되고,
  TURN_ID `ddbac646-96a0-4c3f-87f3-e0e17c8bd111`에서 사용자가 `2`를 선택해 상품이 확정됨.
- 그러나 TURN_ID `624955b6-480b-4cdf-b89b-23891e918fed`에서 `product_id`가 이어지지 않아
  재입고 알림 신청 흐름이 실패.
- 원인 핵심: “사용자 선택 → confirmed_entity 승격 → 이후 턴 재사용” 계약이 전 런타임에서 보장되지 않음.

## 목표
1. 엔드유저가 선택/확정한 정보는 대화 내에서 끝까지 유지된다.
2. 새로운 정보가 들어오면 반드시 사용자 확인을 거쳐 교체 여부를 결정한다.
3. DB 기반 정보는 최초 1회 확인 후 사용한다.
4. 재사용 정책은 중앙 테이블로 관리하여 모든 의도에 공통 적용한다.

---

## 전 런타임 불변식 (Global Invariants)
1. confirmed_entity는 대화가 끝날 때까지 유지된다.
2. confirmed_entity는 expected_input, contamination, stage reset에 의해 삭제되지 않는다.
3. confirmed_entity는 정책/툴/응답 생성 시 항상 1순위 보정값으로 병합된다.
4. confirmed_entity와 충돌하는 신규 값은 자동 교체되지 않는다.
5. confirmed_entity가 교체될 때는 반드시 사용자 확인 로그가 남는다.
6. DB memory 값은 confirmed_entity보다 낮은 우선순위이며, confirm_once 규칙을 따른다.

---

## 핵심 개념

### 엔티티 계층
- `entity`: 턴에서 추출된 임시 값(턴 스코프)
- `confirmed_entity`: 사용자 선택/확정으로 승인된 값(스코프 지정)
- `memory_entity`: DB에 저장된 사용자 기억값

### 스코프
- `flow`: 한 의도 흐름 내에서만 유지 (예: 재입고 대상 상품)
- `session`: 대화 전체에서 유지 (예: 연락처)

### 엔티티 정책 테이블 (공통 계약)
- `scope`: flow | session
- `reuse_policy`: always | confirm_once | confirm_each_flow
- `conflict_policy`: ask_replace | auto_replace | keep_existing
- `source_priority`: user_selection > explicit_user_text > confirmed_entity > db_match

초기 정책 예시
- `product_id`: scope=flow, reuse_policy=always, conflict_policy=ask_replace
- `product_name`: scope=flow, reuse_policy=always, conflict_policy=ask_replace
- `product_query`: scope=flow, reuse_policy=always, conflict_policy=ask_replace
- `phone`: scope=session, reuse_policy=confirm_once, conflict_policy=ask_replace
- `order_id`: scope=flow, reuse_policy=confirm_each_flow, conflict_policy=ask_replace
- `address`: scope=flow, reuse_policy=confirm_each_flow, conflict_policy=ask_replace
- `zipcode`: scope=flow, reuse_policy=confirm_each_flow, conflict_policy=ask_replace

---

## 전 런타임 공통 처리 흐름 (요약)

### 1) Turn 시작 시점
- prevBotContext.confirmed_entity + confirmed_entity_meta를 로드한다.
- flow_id를 계산한다.
- flow 스코프 엔티티는 flow_id가 바뀌면 정리한다.
- session 스코프 엔티티는 유지한다.

### 2) 입력 해석 단계
- user_selection / explicit_user_text로 신규 값 추출
- confirmed_entity를 기본값으로 병합
- memory_entity는 confirm_once 정책 확인 후 사용

### 3) 충돌 처리 단계
- 신규 값과 confirmed_entity가 다르면 conflict_policy에 따라 확인 질문 생성
- 사용자가 교체를 승인한 경우에만 confirmed_entity를 업데이트

### 4) 응답/툴 실행 단계
- policyContext, tool input, 답변 템플릿 모두 confirmed_entity를 최종 보정값으로 반영
- confirmed_entity는 스테이지/expected_input/contamination과 무관하게 유지

---

## 스코프 전환 규칙

### Flow 생성
- 의도 변경 또는 `action:other_inquiry` 발생 시 새 flow_id 생성

### Flow 종료
- flow 스코프 confirmed_entity는 flow 종료 시 삭제
- session 스코프 confirmed_entity는 유지

---

## DB 매칭 정보 처리 규칙
- DB memory는 confirmed_entity보다 낮은 우선순위
- 최초 1회 반드시 사용자 확인 후 사용
- 확인 승인이 완료되면 confirmed_entity로 승격

---

## 메타데이터 구조 제안
confirmed_entity는 값만 유지하고, 메타데이터는 별도 구조로 관리한다.

```ts
type ConfirmedEntityMeta = {
  key: string;
  scope: "flow" | "session";
  source: "user_selection" | "explicit_user_text" | "db_match" | "tool_result";
  confirmed_at: string;
  last_used_at: string;
  flow_id: string | null;
  reuse_policy: "always" | "confirm_once" | "confirm_each_flow";
  conflict_policy: "ask_replace" | "auto_replace" | "keep_existing";
};
```

---

## 구현 포인트 (중앙 계약에 기반한 전 런타임 적용)

### 1) 계약/정책 정의
- 엔티티 정책 테이블을 단일 파일로 중앙 정의
- 모든 런타임이 이 테이블을 참조

### 2) confirmed_entity 승격
- 카드/퀵리플라이/선택 응답은 즉시 승격
- 확정 질문에 대한 응답도 승격

### 3) 컨텍스트 병합
- 모든 intent/단계에서 confirmed_entity를 최우선 병합
- expected_input/contamination 로직은 entity만 정리하고 confirmed_entity는 유지

### 4) DB memory 재사용
- confirm_once 정책으로 “최초 1회 확인” 강제
- 확인 전에는 confirmed_entity로 승격하지 않음

---

## 검증/가드레일
- 이전 턴 confirmed_entity가 다음 턴에서 사라질 경우 경고 로그 기록
- confirmed_entity가 user_confirm 없이 교체되면 오류 처리
- 정책 테이블에 없는 키는 기본적으로 재사용 금지

---

## 기대 효과
- 모든 런타임에서 “사용자 선택/확정 정보는 대화 내 끝까지 유지” 보장
- 재입고/환불/배송 변경 등 다른 흐름에서도 동일한 안정성 확보
- DB 정보 오염 방지와 사용자 신뢰 개선

---

## 보완 사항: "모든 확정 정보" 기록 원칙

요구사항에 따라, **대화에서 봇이 제시하고 엔드유저가 확정한 정보는 모두 기록**한다.
초기 정책처럼 일부 항목만 저장하는 방식은 금지한다.

### 원칙
1. `confirmed_entity`에 들어간 모든 key/value는 전부 `A_end_user_memories`에 기록한다.
2. 저장 여부는 재사용 정책과 분리한다. (저장은 전부, 재사용은 정책으로 제어)
3. confirmed_entity는 이미 안전한 타입(스칼라/간단 배열/간단 객체)으로 정규화되므로,
   저장 시 별도 필터링을 두지 않는다.
4. 단, 저장 시 아래 메타데이터를 반드시 포함한다.

### 저장 포맷 (value_json 권장)
```json
{
  "value": "...",
  "source": "user_selection | explicit_user_text | db_match | tool_result",
  "scope": "flow | session",
  "flow_id": "...",
  "confirmed_at": "...",
  "last_used_at": "..."
}
```

### 구현 체크
- 기존에 특정 key만 저장하는 로직이 있다면 제거한다.
- `confirmed_entity` 전체 key를 순회해 저장하도록 수정한다.
- 저장된 key는 제한 없이 `memory_type = "confirmed"`로 누적 관리한다.

---

### 구현 보완: 확정 기록은 "누적" 저장
- confirmed_entity는 기존 upsert(덮어쓰기) 대신 **항상 insert**로 저장한다.
- 이렇게 하면 동일 key의 과거 확정 이력도 모두 보존된다.
- 재사용 시에는 최신 레코드만 활용하고, 기록은 전체를 남긴다.

### 감사 이벤트 추가
- confirmed_entity 기록 시 `END_USER_CONFIRMED_ENTITY_SAVED` 이벤트를 남긴다.
- payload에는 key_count, keys(최대 50개), flow_id를 포함한다.

---

## 현재 반영 사항
1. flow_id 생성/전파
- action:other_inquiry 발생 시 새 flow_id 발급
- 모든 턴 bot_context에 flow_id, flow_index, flow_intent 주입
- confirmed_entity_meta에 flow_id 자동 주입

2. confirmed_entity_meta + flow_id 저장
- confirmed 기록 저장 시 value_json에 flow_id와 meta 포함

3. confirmed 기록 감사 이벤트 추가
- END_USER_CONFIRMED_ENTITY_SAVED 이벤트 기록
- payload에 key_count, keys(최대 50개), flow_id 포함

4. "모두 기록" 보장
- confirmed_entity_delta 기반으로 누적 insert
- pending_/selected_ 기반 확정 정보는 값 동일해도 기록

---

## 다음 선택 사항
1. flow_id 전환 조건 확대
- other_inquiry 외에도 의도(intent) 변경 시 새 flow_id를 발급할지 결정

2. confirmed_entity_meta source 정밀화
- user_selection / explicit_user_text / db_match / tool_result를 구분 저장

3. 감사 이벤트 분리 저장
- END_USER_CONFIRMED_ENTITY_SAVED를 별도 테이블로 분리할지 결정


### 범용 선택 기억(Selection Resolution) 추가
- 이전 턴의 선택 후보(예: *_candidates, *_choices, response_schema.choice_items)로부터
  사용자의 선택을 범용적으로 해석한다.
- 선택 결과를 entity에 병합하여 confirmed_entity로 자동 승격되도록 한다.
- key 매핑은 중앙 KEY_ALIASES로 관리하여 개별 핫픽스 없이 확장한다.

---

## 현재 발생한 오류와 조치

### 오류 요약
- 사용자가 선택한 상품이 다음 턴에서 유지되지 않아 `product_id`가 누락됨.
- 결과적으로 `restock_subscribe` 단계에서 "해당 상품은 안내 대상이 아닙니다." 응답으로 종료됨.

### 원인
- 선택 정보가 `pending_*` / `selected_*`에 반영되지 않으면
  confirmed_entity로 승격되지 못하는 구조.
- 특정 핸들러에 의존한 개별 로직만 존재해 범용적으로 선택을 기억하지 못함.

### 조치
1. 범용 선택 해석 로직 추가
- 이전 턴 `*_candidates`, `*_choices`, `response_schema.choice_items`를 기반으로
  사용자 선택을 범용적으로 추출.
- 선택 결과를 `entity`로 병합 → confirmed_entity로 자동 승격.

2. 컨텍스트 병합 단계 확장
- `contextResolutionRuntime`에서 선택 결과를 mergeConversationEntity에 포함.
- 의도별 핫픽스 없이 모든 흐름에 동일하게 적용.

### 기대 효과
- product_id 외 다른 항목도 선택값이 누락되지 않음.
- 선택 후 다음 턴에서도 동일한 정보로 대화가 이어짐.
