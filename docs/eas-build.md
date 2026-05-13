# EAS Build로 안드로이드 APK 만들기

Expo Application Services(EAS)의 클라우드 빌드를 사용해서 안드로이드 APK를 만드는 가이드다. 안드로이드 스튜디오나 JDK 없이 빌드된다.

## 한 줄 요약

`eas build -p android --profile preview` 한 줄이면 클라우드에서 APK가 만들어지고, 다운로드 URL이 터미널에 출력된다. 처음 한 번만 셋업이 필요하다.

## 사전 준비

### 1. Expo 계정

https://expo.dev/signup 에서 무료 가입. 이메일만 있으면 된다.

### 2. Node.js

이미 깔려있을 것이다. PowerShell에서 확인:

```powershell
node --version
npm --version
```

Node v18 이상이면 충분하다.

### 3. 작업 위치

PowerShell을 `mobile-app` 폴더로 이동:

```powershell
cd C:\dev\mobileAuto\mobile-app
```

## 처음 한 번만 하는 셋업

### 1. EAS CLI 설치

```powershell
npm install -g eas-cli
eas --version
```

전역 설치라 한 번만 하면 된다.

### 2. Expo 로그인

```powershell
eas login
```

이메일/패스워드 입력. 이후 같은 PC에서는 다시 로그인 안 해도 된다.

### 3. 프로젝트 등록

```powershell
eas init
```

수행 동작:
- Expo 서버에 새 프로젝트를 만든다.
- `app.json`에 `extra.eas.projectId`와 `owner` 필드를 추가한다.

이미 한 번 했으면 다시 안 해도 된다. (이 저장소는 이미 등록되어 있음.)

### 4. 빌드 설정 파일 생성

```powershell
eas build:configure
```

수행 동작:
- 플랫폼 선택 prompt: **Android** 선택
- `eas.json` 파일이 생성된다.

이미 한 번 했으면 다시 안 해도 된다. (이 저장소는 `eas.json`이 이미 있음.)

#### `eas.json` 확인

```powershell
cat eas.json
```

`preview` 프로파일이 아래처럼 되어 있어야 한다:

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

- `"distribution": "internal"`: Play Store에 안 올림. 다운로드 URL로 직접 설치.
- `"android.buildType": "apk"`: AAB가 아닌 APK로 빌드.

## 빌드 실행

### 매번 실행할 명령

```powershell
eas build -p android --profile preview
```

### 처음 빌드할 때만 묻는 prompt

- **"Generate a new Android Keystore?"** → `Y`

  Expo가 keystore를 자동 생성하고 서버에 보관한다. 이후 같은 프로젝트의 빌드는 항상 같은 keystore로 서명되므로, 폰에 이미 깔린 앱 위에 덮어 설치하면 업데이트로 처리된다.

  ⚠️ keystore를 잃어버리면 같은 패키지명으로 업데이트 못 한다. Expo가 알아서 보관해주니까 직접 관리할 필요는 없지만, 알아두면 좋다.

### 빌드 진행

- 클라우드 큐에 들어간다.
- 일반적으로 10~20분 소요.
- 진행 상황은 두 가지 방법으로 볼 수 있다:
  - 터미널 (자동으로 진행률이 갱신된다)
  - https://expo.dev/accounts/<your-account>/projects/auto-mobile/builds 페이지

빌드가 진행 중에는 터미널을 꺼도 빌드는 계속 진행된다. 다시 보려면 위 URL에 접속하면 된다.

### 빌드 완료 후 prompt

```
Install and run the Android build on an emulator? » (Y/n)
```

→ `n` 입력.

이건 로컬 안드로이드 에뮬레이터에 자동 설치할지 묻는 것이다. 우리는 에뮬레이터 안 쓰고 실제 폰에 설치할 거니까 `n`.

### 출력 확인

빌드가 성공하면 터미널에 두 가지 URL이 나온다:

1. **Artifact URL**: `https://expo.dev/artifacts/eas/...` — APK 직접 다운로드 링크
2. **Build page URL**: `https://expo.dev/accounts/.../projects/auto-mobile/builds/<build-id>` — 빌드 상세 페이지. 여기서도 Install 버튼으로 QR/링크를 받을 수 있다.

## APK 폰에 설치

### 첫 설치

1. 폰 브라우저에서 Artifact URL 열기
2. APK 파일이 다운로드된다 (5~20MB 정도)
3. 다운로드 완료 알림 탭 → APK 설치 안내가 뜬다
4. 처음이면 "출처를 알 수 없는 앱 설치 허용" 권한 요청이 뜬다. 허용으로 들어가서 브라우저 앱에 권한을 줘야 한다.
5. 설치 → AutoMobile 앱 실행
6. 로그인 → 4탭 동작 확인

### 업데이트(덮어 설치)

같은 프로젝트의 새 APK는 같은 keystore로 서명되므로, 위와 같은 방법으로 다운로드 받아서 설치하면 **기존 앱 위에 업데이트**된다. 데이터(SecureStore의 토큰 포함)는 유지된다.

⚠️ 다른 프로젝트의 APK이거나 keystore가 다르면 설치 충돌이 나서 기존 앱을 먼저 제거해야 한다. 이 가이드대로 같은 Expo 프로젝트에서 빌드하면 그런 일은 없다.

## 두 번째 이후 빌드

처음 셋업이 다 돼 있으면 이것만 하면 된다:

```powershell
cd C:\dev\mobileAuto\mobile-app
eas build -p android --profile preview
```

- keystore prompt: 안 뜸 (이미 생성됨)
- 빌드 큐 → 10~20분 → 다운로드 URL

## 자주 만나는 문제

### `eas: command not found`

EAS CLI가 전역 설치 안 됨. 다시:

```powershell
npm install -g eas-cli
```

설치 후에도 안 되면 PowerShell을 한 번 닫고 다시 열어본다.

### "Not logged in" 또는 인증 오류

```powershell
eas login
```

다시 로그인.

### `Failed to find Android SDK`

EAS Build는 클라우드 빌드라 로컬에 안드로이드 SDK 필요 없다. 이 오류가 나면 `--local` 플래그가 들어갔는지 확인.

올바른 명령:
```powershell
eas build -p android --profile preview
```

`--local` 없음.

### 빌드는 성공하지만 앱에서 API 호출 실패

`app.json`에 `"usesCleartextTraffic": true`가 있는지 확인:

```powershell
cat app.json
```

`android` 블록 안에 있어야 한다. 안 그러면 Android 9+에서 HTTP(non-HTTPS) 호출이 차단된다.

### 빌드 진행 중에 다른 작업하고 싶다

터미널 닫아도 된다. 빌드는 클라우드에서 계속 진행되고, 진행 상황은 https://expo.dev/accounts/<your-account>/projects/auto-mobile/builds 에서 볼 수 있다.

빌드 완료 후 다운로드 URL은 그 페이지에서도 받을 수 있다.

### "Build limit exceeded"

EAS Free 티어는 월 빌드 수가 제한되어 있다 (현재 월 30회). 초과하면 다음 달까지 기다리거나 유료 플랜으로 업그레이드.

## 참고 명령

### 빌드 목록 보기

```powershell
eas build:list
```

### 특정 빌드 상태 보기

```powershell
eas build:view <build-id>
```

### Production 빌드 (Play Store용 AAB)

```powershell
eas build -p android --profile production
```

`production` 프로파일은 `app.json`의 `version`을 자동 증가시키고 AAB(Android App Bundle)를 생성한다. Play Store 업로드용. 우리 MVP는 internal 배포만 하므로 `preview`(APK)만 쓰면 된다.

## 참고 링크

- EAS Build 공식 문서: https://docs.expo.dev/build/introduction/
- Expo 콘솔: https://expo.dev/
- 이 프로젝트 빌드 페이지: https://expo.dev/accounts/<your-account>/projects/auto-mobile/builds
