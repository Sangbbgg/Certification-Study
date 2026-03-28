# [스킬 01] Git(clasp) 초기화 및 고정 URL 배포 세팅 (보안 강화)

## 1. 역할 (Role)
* 너는 Google Apps Script(GAS) 환경 및 CI/CD 파이프라인 구축 전문가이자 보안 담당자야.

## 2. 목표 (Objective)
* 로컬 환경에서 `clasp`를 사용하여 GAS 프로젝트를 연동하고, 민감한 정보가 포함된 파일이 Git이나 GAS 서버에 절대 업로드되지 않도록 완벽하게 차단하는 설정 파일을 작성해.

## 3. 기술 스택 및 연동 흐름 (Tech Stack & Flow)
* **사용 기술:** Git, Google Clasp, GAS
* **흐름:** 로컬 작업 -> 보안 필터링(`.gitignore`, `.claspignore`) -> Git 커밋 -> `clasp push` -> `clasp deploy -i [배포ID]`

## 4. 세부 요구사항 (Requirements)
* 하단의 **[7. 실제 환경 데이터]**를 참조하여, 프로젝트 초기화를 위한 터미널 명령어 순서(`git init`, `git remote add origin [GIT_URL]`, `clasp login`, `clasp clone [GAS_SCRIPT_ID]`)를 작성할 것.
* **[중요] 고정 URL 배포 명령어:** 코드를 수정한 후 배포할 때 반드시 `clasp deploy -i [GAS_DEPLOYMENT_ID] -d "버전 설명"` 명령어를 사용하도록 안내할 것.
* 웹앱 배포 설정이 포함된 `appsscript.json`의 기본 구조를 작성할 것.
* **[보안 1] `.claspignore` 작성:** 로컬 전용 파일(`.git/`, `.env`, `Antigravity_Skills/`, `node_modules/` 등)이 GAS에 업로드되지 않도록 명시적으로 제외하는 코드를 제시할 것. (GAS에는 `.gs`와 `.html` 파일만 올라가야 함)
* **[보안 2] `.gitignore` 작성:** `.env`, `Antigravity_Skills/`, `.clasp.json` (GAS 고유 설정 파일) 등 민감한 파일이 Git 저장소에 커밋되지 않도록 제외하는 코드를 제시할 것.

## 5. 제약사항 및 예외처리 (Constraints)
* **[필수] 이중 배포 원칙:** 모든 작업 완료 후에는 반드시 `Git Commit & Push`와 `Clasp Push & Deploy`가 순차적으로 이루어져야 함을 강조할 것. 
* Git에는 소스 코드와 기획서(`Antigravity_Skills/` 제외 설정 확인)를 백업하고, GAS에는 실행 코드만 배포할 것.

## 6. 출력 형태 (Output Format)
* 터미널 명령어와 각 설정 파일(`.claspignore`, `.gitignore`, `appsscript.json`)의 내용이 포함된 옵시디언 마크다운 코드 블록.

## 7. 실제 환경 데이터 (User Input)
* **GIT_REPOSITORY_URL:** https://github.com/Sangbbgg/Certification-Study.git
* **GAS_SCRIPT_ID:** 1m-jG7v_nitpFw6jwmqS7qO9xhOURoCiJX4vki4Jwep5ulTTI5LTXomtr
* **GAS_DEPLOYMENT_ID:** AKfycbxAJWyRNCdL5wLokPxEix_5TDe4Dm_w3uT1-FasJRK-FqmLahsCbfZT0vtuJ6UdyKZr