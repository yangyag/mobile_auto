# Expo Go로 개발/테스트하기

Expo Go는 실제 안드로이드 폰에 깔린 컨테이너 앱이다. 코드를 폰에 직접 빌드/설치하지 않고도 PC의 Metro 번들러에서 JS 코드를 받아 즉시 실행할 수 있다. 코드 수정 → 폰에서 hot reload로 1~2초 안에 반영된다.

## 한 줄 요약

폰에 Expo Go 앱 설치 → PC에서 `npx expo start` → 폰으로 QR 스캔 → 끝. 코드 수정하면 자동으로 갱신된다.

## 사전 준비

### 1. 폰에 Expo Go 설치

Play Store에서 "Expo Go" 검색해서 설치.

직접 링크: https://play.google.com/store/apps/details?id=host.exp.exponent

### 2. PC와 폰을 같은 Wi-Fi에 연결

가장 흔한 시행착오 — 이게 안 되면 폰이 PC의 Metro 번들러에 접속을 못 한다. 사무실에서 PC는 유선 LAN이고 폰은 모바일 데이터일 때, 또는 PC는 5GHz 폰은 2.4GHz 같은 분리된 SSID일 때 문제 발생.

서로 같은 네트워크인지 확인하려면:
- PC: `ipconfig` 실행 후 IPv4 주소 확인 (예: 192.168.0.10)
- 폰: 설정 → Wi-Fi → 연결된 네트워크 → IP 주소 확인 (예: 192.168.0.15)

앞 세 자리(`192.168.0.`)가 같으면 보통 같은 LAN이다.

### 3. Node.js

```powershell
node --version
npm --version
```

Node v18 이상. 안 깔려있으면 https://nodejs.org/ 에서 LTS 설치.

### 4. 작업 위치

```powershell
cd C:\dev\mobileAuto\mobile-app
```

처음 설치하는 경우 (다른 PC로 옮기거나 새로 받은 경우):

```powershell
git clone https://github.com/yangyag/mobile_auto.git
cd mobile_auto
cp .env.example .env
notepad .env
```

`.env` 내용:
```
EXPO_PUBLIC_API_BASE=http://43.202.113.123:8086
```

운영 API 주소가 바뀌었으면 그 주소로 수정.

### 5. 의존성 설치

```powershell
npm install
```

처음 한 번만. 2~5분 소요.

## 개발 서버 실행

### 기본 명령

```powershell
npx expo start
```

수행 동작:
- Metro 번들러가 시작된다 (포트 8081).
- 터미널에 큰 QR 코드와 함께 두 가지 URL이 나온다:
  - Metro 콘솔 (`http://localhost:8081`) — 브라우저로 열면 디버그 정보
  - LAN URL (`exp://192.168.x.x:8081`) — 폰이 접속할 주소
- 키보드 단축키 안내도 나온다 (`r`, `j`, 등).

터미널을 닫으면 Metro가 같이 꺼진다. 개발 중에는 켜둬야 한다.

### 폰에서 접속

1. 폰에서 Expo Go 앱을 열기
2. "Scan QR code" 탭
3. PC 터미널의 QR 코드 스캔
4. 1~2분 정도 번들 다운로드 → 앱 실행

처음 한 번만 번들을 받느라 좀 걸리고, 이후로는 빠르다.

### LAN 접속이 안 될 때 → Tunnel 모드

회사/카페 Wi-Fi가 디바이스 간 통신을 막거나(client isolation), PC에 방화벽이 켜져있어 폰이 직접 못 닿는 경우가 있다.

이때는 `--tunnel` 사용:

```powershell
npx expo start --tunnel
```

수행 동작:
- ngrok을 통해 인터넷으로 노출. 폰이 어디 있든 접속 가능 (모바일 데이터로도 됨).
- 처음 실행 시 `@expo/ngrok` 설치 prompt → `Y` 입력.
- 속도는 LAN보다 느림. 코드 변경 후 reload가 5~10초 걸릴 수 있음.

LAN이 되면 LAN, 안 되면 tunnel.

## 코드 수정 워크플로

### 자동 hot reload

`.tsx`/`.ts` 파일을 저장하면 자동으로 폰의 앱이 갱신된다. 대부분의 변경(스타일, 텍스트, 로직)은 화면이 그대로 유지된 채 즉시 반영된다.

상태(`useState`)는 가능하면 보존되지만, 컴포넌트 구조가 크게 바뀌면 새로 마운트된다.

### 수동 reload

화면이 이상해지거나 reload가 안 먹을 때:
- 폰을 흔든다 → dev menu 뜸 → "Reload"
- 또는 PC 터미널에서 `r` 키
- 강제 새로고침: 터미널에서 `r r` (빠르게 두 번)

### Dev menu (폰)

폰을 흔들면 뜨는 메뉴:
- **Reload**: 앱 새로고침
- **Toggle Inspector**: UI 요소 클릭해서 스타일 확인 (Chrome devtools 비슷)
- **Toggle Performance Monitor**: FPS, 메모리 확인
- **Open JS Debugger**: 브라우저에서 console 로그/breakpoint

### console.log

코드에서 `console.log(...)`를 쓰면 PC 터미널에 출력된다 (Metro가 폰의 로그를 가져온다).

```tsx
console.log('grid data:', grid.data);
```

## 자주 만나는 문제

### QR 스캔 후 "Could not connect" 또는 무한 로딩

원인 후보:
1. PC와 폰이 다른 Wi-Fi
2. PC 방화벽이 8081 포트 막음
3. 라우터가 디바이스 간 통신 막음 (게스트 Wi-Fi에서 흔함)

해결:
- 같은 Wi-Fi 확인
- Windows 방화벽: "Windows Defender 방화벽" → "앱 또는 기능 허용" → Node.js 체크
- 안 되면 `npx expo start --tunnel`

### "Unable to resolve module ..."

의존성이 안 깔렸거나 캐시 문제. 시도 순서:

```powershell
npx expo start --clear
```

또는:
```powershell
rm -rf node_modules
npm install
npx expo start
```

### `.env` 변경했는데 반영 안 됨

`.env`는 빌드 타임에만 읽힌다. Metro를 재시작해야 한다:

```powershell
# Ctrl+C로 Metro 종료
npx expo start --clear
```

### 폰에 빨간 에러 화면

JS 런타임 에러다. 화면에 에러 메시지와 스택 트레이스가 보인다.
- "Dismiss" 탭하고 코드 수정 → 자동 reload
- 스택 트레이스에 우리 코드 경로(`src/...`나 `app/...`)가 보이면 거기가 출발점

### 패키지 버전 경고

```
The following packages should be updated for best compatibility:
  jest-expo@... - expected version: ...
```

대부분 무시해도 된다. 정 신경 쓰이면:
```powershell
npx expo install --check
```

추천 버전으로 자동 정렬해준다.

### Expo Go에서는 작동하는데 APK에서는 안 됨

가끔 발생하는 차이:
- **개발 vs 프로덕션 환경 차이**: `__DEV__` 분기, console.log 동작 차이 등
- **native module 차이**: Expo Go는 표준 native module만 포함. 커스텀 native module 쓰면 안 됨.
- **환경변수**: `.env`는 EAS Build 시점에 임베드된다. 빌드 후 `.env` 수정해도 APK에 반영 안 됨.
- **HTTP 차단**: APK에서는 Android Manifest의 cleartext 설정이 실제로 들어가야 `http://` API 호출이 된다.

로그인 화면에서 `"network failure"`가 뜨면 [EAS Build 문서의 로그인/API 실패 섹션](./eas-build.md#빌드는-성공하지만-앱에서-로그인api-호출-실패)을 먼저 확인한다.

## Expo Go의 한계

다음 경우는 Expo Go로 안 되고 APK 빌드가 필요하다:
- 커스텀 native module (이 프로젝트는 해당 없음)
- 푸시 알림 (Expo Go는 자체 푸시만 지원, 프로젝트 푸시는 dev build 필요)
- 일부 deep link / 외부 앱 연동

MVP 범위에서는 Expo Go로 대부분 검증 가능하다.

## 키보드 단축키 (Metro 콘솔)

`npx expo start` 실행 중인 터미널에서:

| 키 | 동작 |
|---|---|
| `r` | 폰 reload |
| `j` | 디버거 열기 (브라우저) |
| `m` | 폰의 dev menu 토글 |
| `o` | iOS에서 시뮬레이터 열기 (Windows에서는 안 됨) |
| `a` | Android 에뮬레이터 열기 (안드로이드 스튜디오 에뮬레이터 있어야 함) |
| `?` | 모든 단축키 보기 |
| `Ctrl+C` | Metro 종료 |

## 새로운 코드를 받았을 때 (git pull 후)

```powershell
cd C:\dev\mobileAuto\mobile-app
git pull origin main
npm install   # package.json이 바뀌었다면 필요
npx expo start --clear
```

`--clear`로 Metro 캐시 비우면 stale 번들 문제 예방.

## 참고 명령

### 캐시 다 비우고 재시작

```powershell
npx expo start --clear
```

### 자동 polling으로 시작 (파일 변경 감지가 느릴 때)

```powershell
$env:EXPO_USE_POLLING=1; npx expo start
```

### Tunnel + 캐시 비우기

```powershell
npx expo start --tunnel --clear
```

## 일반적인 개발 흐름 요약

```
1. PowerShell: cd C:\dev\mobileAuto\mobile-app
2. npx expo start          # Metro 시작
3. 폰: Expo Go → QR 스캔
4. 코드 수정 (VSCode 등) → 저장 → 폰에서 자동 갱신
5. 화면이 이상해지면 폰 흔들기 → Reload
6. 끝났으면 PC 터미널에서 Ctrl+C
```

이게 매일 개발할 때 반복하는 과정이다.

## 참고 링크

- Expo 공식 문서: https://docs.expo.dev/
- Expo Go 트러블슈팅: https://docs.expo.dev/get-started/expo-go/
- React Native 데뷔깅: https://reactnative.dev/docs/debugging
