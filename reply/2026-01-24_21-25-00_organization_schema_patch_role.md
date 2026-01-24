# organization_schema_patch.sql 역할 설명

## 대상 파일
- docs/organization_schema_patch.sql

## 역할
- organizations 테이블에 사업자 등록번호와 등록자(등록 수행 사용자)를 저장하기 위한 컬럼을 추가합니다.
- registrant_id에 대해 auth.users를 참조하는 FK를 생성합니다.
- name, owner_id, registrant_id, business_registration_number 조합에 대해 중복을 방지하는 유니크 인덱스를 추가합니다.

## 참고
- 파일명은 singular(organization)로 되어 있으나 실제 대상은 organizations 테이블입니다.
- public 스키마에 적용해야 하며, 다른 스키마에서 실행하면 컬럼이 보이지 않습니다.
