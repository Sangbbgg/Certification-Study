---
description: Git 및 Google Clasp 환경 설정 및 배포 가이드
---
# Git(clasp) 초기화 및 고정 URL 배포 세팅

로컬 환경에서 `clasp`를 사용하여 Google Apps Script(GAS) 프로젝트를 연동하고 보안 필터링을 통해 민감한 정보의 유출을 방지하며 고정 URL로 배포를 관리합니다.

## 1. 개요
- **기술:** Git, Google Clasp, GAS
- **흐름:** 로컬 작업 -> 보안 필터링(`.gitignore`, `.claspignore`) -> Git 커밋 -> `clasp push` -> `clasp deploy -i [배포ID]`

## 2. 세부 지침
### 2.1. 프로젝트 초기화
터미널에서 아래 명령어를 순차적으로 수행합니다:
1. `git init`
2. `git remote add origin https://github.com/Sangbbgg/Certification-Study.git`
3. `clasp login`
4. `clasp clone 1m-jG7v_nitpFw6jwmqS7qO9xhOURoCiJX4vki4Jwep5ulTTI5LTXomtr`

### 2.2. 보안 설정
- **.claspignore:** 소스 코드(.gs, .html) 외의 불필요한 파일이 GAS 서버에 업로드되지 않도록 방지합니다.
- **.gitignore:** `.env`, `.clasp.json` 등 민감한 설정 정보기 저장소에 커밋되지 않도록 방지합니다.

### 2.3. 고정 URL 배포
배포 시에는 항상 고정된 배포 ID를 사용하여 URL이 유지되도록 합니다:
- `clasp deploy -i AKfycbxAJWyRNCdL5wLokPxEix_5TDe4Dm_w3uT1-FasJRK-FqmLahsCbfZT0vtuJ6UdyKZr -d "업데이트 내용"`

## 3. 코드 구현 (appsscript.json 예시)
```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {
  },
  "webapp": {
    "access": "ANYONE",
    "executeAs": "USER_DEPLOYING"
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

## 4. 제약사항
- **이중 배포 원칙:** 모든 작업 완료 후 `Git Commit & Push`와 `Clasp Push & Deploy`가 순차적으로 이루어져야 함을 강조합니다.
- Git에는 프로젝트 기획과 소스 전반을 백업하고, GAS에는 실행 코드만 배포합니다.
