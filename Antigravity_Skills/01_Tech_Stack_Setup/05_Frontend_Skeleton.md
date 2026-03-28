# [스킬 05] 기본 화면(UI) 프레임워크 구축 (Tailwind CSS 적용 및 반응형 최적화)

## 1. 역할 (Role)
* 너는 프론트엔드 UI/UX 개발자야.

## 2. 목표 (Objective)
* GAS Web App 환경에서 동작할 자격증 학습 보조 시스템의 기본 Single Page Application(SPA) 화면 뼈대를 Tailwind CSS를 활용하여 기획하고, PC 및 갤럭시 폴드7(접힘/펼침) 환경에 완벽히 대응하는 반응형으로 작성해.

## 3. 기술 스택 및 연동 흐름 (Tech Stack & Flow)
* **사용 기술:** HTML5, Tailwind CSS (CDN), Vanilla JS, GAS `HtmlService`
* **흐름:** 사용자가 웹앱 URL 접속 -> `doGet()`이 화면 렌더링 -> 메뉴 클릭 시 JS를 통해 화면 전환(SPA 방식)

## 4. 세부 요구사항 (Requirements)
* **Tailwind CSS 적용 및 반응형 Breakpoint 커스텀:**
  * `Index.html`의 `<head>` 태그 내에 `<script src="https://cdn.tailwindcss.com"></script>`를 추가할 것.
  * Tailwind `tailwind.config` 스크립트를 삽입하여 해상도 기준을 다음과 같이 구성할 것.
    * **[기본 모바일]** Prefix 없음: 기본 스마트폰 및 갤럭시 폴드7 접은 상태 (뷰포트 412px 기준 레이아웃)
    * **[폴드 펼침]** `fold:` (min-width: 750px): 갤럭시 폴드7 펼친 상태를 위한 레이아웃 최적화
    * **[PC 환경]** `lg:` (min-width: 1024px): 데스크톱 모니터용 레이아웃
* **레이아웃 구조:** 상단 네비게이션 바(GNB)와 메인 콘텐츠 영역(Main Container)으로 분리. 해상도에 따라 메뉴 UI를 변형할 것 (예: 모바일은 하단 고정 탭 또는 햄버거 버튼, 폴드 펼침/PC는 상단 또는 측면 가로 배치).
* **기본 메뉴 탭 구성:** '문제 작성', '학습 분석', '문제풀이', '모의시험' 4가지 화면으로 전환할 수 있는 네비게이션 메뉴를 구성할 것.
* **화면 전환 로직:** 페이지 새로고침 없이 메뉴 클릭 시 메인 콘텐츠 영역의 DOM만 동적으로 교체되도록 Vanilla JS 활용. 각 페이지는 자신만의 독립적인 초기화 함수(예: `initWritePage()`)를 가질 수 있음.
* **파일 모듈화 (GAS 표준):** 무거워진 단일 파일을 피하기 위해 다음과 같은 규칙으로 분리함.
  * `Index.html`: 메인 뼈대 (Shell), GNB, 공통 라이브러리 로드 및 라우팅 처리.
  * `CSS.html`: 전체적인 디자인 시스템 및 공통 스타일.
  * `JS.html`: 전역 변수, 유틸리티 함수, 공통 이벤트 핸들러.
  * `Page_XXX.html`: 특정 기능(메뉴) 전용 HTML 템플릿과 해당 기능만을 위한 JavaScript 로직을 하나의 파일에 포함 (예: `Page_Write.html`, `Page_Analyze.html`).
* **앱 초기화 흐름:** 
  1. `DOMContentLoaded` 이벤트 발생.
  2. `loadGlobalData()` 호출하여 전체 데이터를 브라우저 메모리에 로드.
  3. 로드 완료 후 `navigate()`를 호출하여 기본 페이지로 진입.

## 5. 제약사항 및 예외처리 (Constraints)
* 초기 단계이므로 각 메뉴 화면에는 본격적인 기능 대신 "이곳에 문제 작성 폼이 들어갑니다" 등의 Placeholder(더미 요소)만 배치할 것.
* 백엔드 비동기 통신을 위해 사용할 `google.script.run`의 기본 호출 골격 함수(예: `fetchData()`)를 `JS.html`에 미리 주석과 함께 세팅해 둘 것.
* 장시간 학습에도 눈이 피로하지 않도록 차분한 색상 테마를 사용할 것.

## 6. 출력 형태 (Output Format)
* `Index.html`, `CSS.html`, `JS.html` 파일 코드와 이 파일들을 병합하여 렌더링하는 GAS 백엔드의 `doGet()` 코드가 포함된 옵시디언 마크다운 코드 블록.