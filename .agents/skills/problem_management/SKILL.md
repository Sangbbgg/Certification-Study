---
name: 문제 관리 스킬
description: 자격증 학습용 문제 작성 및 구글 드라이브 이미지 업로드 연동
---
# 문제 관리 (문제 작성, 이미지 드라이브 업로드 및 조회)

자격증 학습용 문제 데이터를 Supabase에 저장하고, 첨부된 이미지를 구글 드라이브에 업로드하여 마크다운 지문에 포함하는 기능을 담당합니다.

## 1. 개요
- **역할:** 백엔드 API, 데이터베이스 스키마 설계 및 파일 시스템 연동.
- **주요 흐름:** 클라이언트 폼 입력 -> GAS 백엔드 -> Drive API 업로드 -> Supabase INSERT (UUID 기반).

## 2. 데이터베이스 스키마 (questions 테이블)
| 필드명 | 타입 | 설명 |
|---|---|---|
| id | UUID | Primary Key (자동 생성) |
| major_subject | TEXT | 대과목 |
| minor_subject | TEXT | 소과목 |
| question_title | TEXT | 문제명 |
| content | TEXT | 지문 (마크다운) |
| hint_explanation | TEXT | 힌트 및 해설 (마크다운) |
| question_type | TEXT | MULTIPLE_CHOICE, SHORT_ANSWER, FIND_AND_FILL |
| options | JSONB | 객관식 보기 리스트 |
| answer | JSONB | 정답 정보 (인덱스 또는 텍스트 배열) |
| created_at | TIMESTAMP | 생성 시간 |

## 3. 핵심 기능 구현 지침
### 3.1. 구글 드라이브 이미지 업로드 (`uploadImageToDrive`)
- **폴더 ID:** `getEnv('IMAGE_FOLDER_ID')` 사용.
- **파일명:** `Utilities.getUuid()`를 이용하여 유니크한 ID 부여 (문제 ID와 동기화).
- **권한:** `ANYONE_WITH_LINK`로 설정하여 웹앱에서 접근 가능하도록 처리.

### 3.2. 백엔드 컨트롤러 (`createQuestion`)
1. UUID 선제 생성.
2. 이미지를 드라이브에 업로드하고 마크다운 문법(`![image](url)`)으로 지문에 삽입.
3. 생성된 UUID를 포함하여 Supabase REST API 호출.
4. 성공 시 클라이언트 전역 캐시(`allQuestions`) 최신화 트리거.

## 4. 제약사항
- 필수 값 누락 시 DB 통신 전 GAS에서 에러를 차단합니다.
- 실패 시 `sheetLogger`를 호출하여 상세 내용을 기록합니다.
