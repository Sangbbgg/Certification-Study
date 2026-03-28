---
name: 데이터 로드 최적화 스킬
description: GAS의 한계를 극복하기 위한 글로벌 캐시 및 지연 동기화 시스템
---
# 데이터 로드 최적화 (글로벌 캐시 및 지연 동기화)

GAS의 실행 속도 한계를 극복하기 위해 브라우저 메모리와 서버 간의 지능형 동기화 시스템을 구축하여 최적의 응답 속도를 확보합니다.

## 1. 개요
- **핵심 아키텍처:** 지연 동기화 (Lazy Sync / Dirty Flag).
- **목표:** 사용자 경험 상 데이터 로딩 속도 0.1초 내외 달성.

## 2. 핵심 메커니즘
### 2.1. 글로벌 캐싱 (Global Caching)
- `JS.html`에 `var allQuestions` 선언.
- 앱 시작 시 단 1회 모든 데이터를 서버에서 불러와 메모리에 적재.
- 탭 이동 시 서버 호출 없이 즉시 캐시 데이터를 렌더링.

### 2.2. 지연 동기화 (Dirty Flag)
- **채점 시:** `learning_history`에 INSERT만 수행 (빠른 반응성).
- **마킹:** 채점 성공 시 `isGlobalDataDirty = true` 설정.
- **동기화 시점:** 분석 페이지 진입 시에만 서버 측에서 통계를 일괄 업데이트(`syncAllStats`)하고 데이터를 최신화.

### 2.3. 즉시 무효화 (Immediate Invalidation)
- 중요 데이터(수정, 삭제) 처리 시에는 Dirty Flag 대기 없이 즉시 `loadGlobalData`를 호출하여 전역 캐시를 갱신.

## 3. 주요 함수 가이드
- `loadGlobalData(callback, forceSync)`: 데이터 로드 및 서버 동기화 트리거.
- `syncAllStats()`: 백그라운드 성격의 벌크 통계 갱신 로직.

## 4. 제약사항
- 불필요한 서버 호출을 철저히 차단하여 GAS 할당량(Quota)을 보존합니다.
- 수동 새로고침(`forceRefresh`) 기능을 항상 열어두어 데이터 불일치 상황에 대응합니다.
