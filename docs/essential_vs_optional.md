# 필수/비필수 구분 기준 (보수적 기본안)

이 문서는 `C:\dev\1227\mejai3\mejai` 기준으로, 서비스 기능 실행/빌드에 필요한 파일과 그렇지 않은 파일을 **보수적으로** 구분한 초안입니다.
모호하거나 환경 의존적인 항목은 별도 표기로 남겼습니다.

## 1) 구분 기준
- **필수**: 런타임 실행/빌드/배포에 직접 필요하거나, 소스의 단일 진실로서 반드시 존재해야 하는 것
- **비필수**: 캐시/빌드 산출물/로컬 개발 편의/로그/IDE 설정 등 없어도 동작 가능한 것
- **모호/검토 필요**: 팀 정책이나 배포 환경에 따라 달라지는 것

## 2) 현재 레포 기준 분류

### 필수 (서비스 기능 실행/빌드 기준)
- `src/` (핵심 애플리케이션 소스)
- `public/` (정적 자산)
- `package.json` (의존성/스크립트 정의)
- `package-lock.json` (의존성 고정)
- `next.config.ts` (Next.js 설정)
- `tsconfig.json` (TypeScript 설정)
- `next-env.d.ts` (Next.js TS 환경 정의)
- `postcss.config.mjs` (CSS 빌드 설정, 사용 시 필수)
- `eslint.config.mjs` (빌드에는 직접 영향 없음. 팀 정책상 필수로 둘지 검토)

### 비필수 (일반적으로 `.gitignore` 대상)
- `node_modules/` (의존성 설치 결과)
- `.next/` (Next.js 빌드 산출물)
- `docs/logs/` 및 로그 파일류 (운영/분석 산출물)
- `docs/diff/` (변경 비교 산출물)
- `.cursor/` (IDE/에디터 설정)
- `.github/` (CI/CD 설정; **런타임에는 불필요**지만 협업에는 필수로 둘지 검토)
- `MCP` (용도 미상, 일반적으로 로컬 산출물 가능)

### 모호/검토 필요 (환경/정책에 따라 달라짐)
- `.env` (서비스 실행에 **필수 값**을 포함하지만, 보안상 VCS 제외가 일반적)
  - 권장: `.env`는 gitignore, 대신 `.env.example` 또는 샘플 파일을 커밋
- `scripts/` (빌드/배포 자동화에 쓰인다면 필수, 아니면 선택)
- `README.md`, `quick_start.md`, `principle.md`, `AGENTS.md` (문서이므로 실행에는 불필요)
- `ws-server.mjs` (런타임 구성에 따라 필수일 수 있음)
- `_check_totalagent.ps1`, `_patch_sidebar.txt`, `codex-utf8.ps1`, `codex-utf8.cmd`
  - 개발 편의 스크립트로 보이나, 팀 규약에 따라 포함 여부 결정 필요

## 3) `.gitignore` 후보 패턴 (초안)
아래는 **보수적 기본안**입니다. 실제 반영 전 검토 필요.

- `node_modules/`
- `.next/`
- `.env*` (단, `.env.example` 등은 예외 처리)
- `docs/logs/`
- `docs/diff/`
- `.cursor/`
- `*.log`

## 4) 다음 단계 제안
- `ws-server.mjs`, `scripts/`, `.github/`, `eslint.config.mjs`가 실제 배포/CI에 필요한지 확인 필요
- `.env` 사용 정책 확정 후, `.env.example` 생성 여부 결정

---
필요하시면 실제 파일 구조를 더 깊게 스캔해서 상세 분류표를 확장하겠습니다.

## 5) 삭제 대상 리스트 (초안)
아래는 본 문서 내 항목 중 삭제(또는 gitignore) 후보를 정리한 목록입니다.

| 행 번호 | 삭제 대상 경로 | 사유 | 삭제/잔존 여부 |
| --- | --- | --- | --- |
| 25 | `node_modules/` | 의존성 설치 결과, 재생성 가능 | 삭제(권장) |
| 26 | `.next/` | 빌드 산출물, 재생성 가능 | 삭제(권장) |
| 27 | `docs/logs/` | 로그/운영 산출물 | 삭제(권장) |
| 28 | `docs/diff/` | 변경 비교 산출물 | 삭제(권장) |
| 29 | `.cursor/` | IDE/에디터 설정 | 삭제(권장) |
| 30 | `.github/` | 런타임에는 불필요, 협업/CI 용도 | 잔존(검토) |
| 31 | `MCP` | 용도 미상, 로컬 산출물 가능 | 잔존(검토) |
| 34 | `.env` | 보안상 VCS 제외가 일반적 | 삭제(권장, 샘플 유지) |
| 36 | `scripts/` | 빌드/배포 자동화 여부에 따라 다름 | 잔존(검토) |
| 37 | `README.md` | 문서 | 잔존(검토) |
| 37 | `quick_start.md` | 문서 | 잔존(검토) |
| 37 | `principle.md` | 문서 | 잔존(검토) |
| 37 | `AGENTS.md` | 문서/규정 | 잔존(검토) |
| 38 | `ws-server.mjs` | 런타임 구성 의존 | 잔존(검토) |
| 39 | `_check_totalagent.ps1` | 개발 편의 스크립트 | 잔존(검토) |
| 39 | `_patch_sidebar.txt` | 개발 편의/임시 파일 가능 | 잔존(검토) |
| 39 | `codex-utf8.ps1` | 개발 편의 스크립트 | 잔존(검토) |
| 39 | `codex-utf8.cmd` | 개발 편의 스크립트 | 잔존(검토) |
