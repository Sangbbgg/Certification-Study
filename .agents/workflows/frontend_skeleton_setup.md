---
description: 기본 화면(UI) 프레임워크 및 SPA 구조 구축
---
# 기본 화면(UI) 프레임워크 및 SPA 구조 구축

GAS Web App 환경에서 동작할 자격증 학습 보조 시스템의 기본 Single Page Application(SPA) 화면 뼈대를 Tailwind CSS를 활용하여 구축합니다.

## 1. 개요
- **기술:** HTML5, Tailwind CSS (CDN), Vanilla JS, GAS `HtmlService`
- **구조:** 반응형 레이아웃 (모바일 / 폴드 펼침 / PC 대응)

## 2. 레이아웃 대응 전략 (Tailwind Config)
```javascript
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        screens: {
          'fold': '750px', // 갤럭시 폴드7 펼침 대응
        }
      }
    }
  }
</script>
```

## 3. 핵심 파일 구성
### 3.1. Index.html (메인 뼈대)
- GNB 로드, 메인 컨테이너 정의 및 라우팅 처리.
- 반응형 네비게이션 적용 (하단 탭 또는 상단 가로 배치).

### 3.2. Page_XXX.html (모듈화)
- 각 메뉴(문제작성, 학습분석, 문제풀이 등) 전용 HTML 템플릿과 JS 로직 포함.

### 3.3. JS.html (공통 비즈니스 로직)
- 전역 상태 관리 및 비동기 통신 골격 구축.
```javascript
function fetchData(action, payload, callback) {
  google.script.run
    .withSuccessHandler(response => {
      const res = JSON.parse(response);
      if (res.status === 'success') callback(res.data);
      else console.error(res.message);
    })
    .router({ action, payload });
}
```

## 4. 제약사항
- 페이지 새로고침 없이 DOM만 교체하는 SPA 방식을 고수합니다.
- 데이터 조회는 `loadGlobalData()`를 통해 초기 1회 전역 캐싱을 수행합니다.
- 디자인은 차분한 테마를 사용하여 장시간 학습 시의 피로도를 최소화합니다.
