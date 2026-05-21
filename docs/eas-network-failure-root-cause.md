# EAS 빌드 로그인 `network failure` 원인과 조치 기록

작성일: 2026-05-15

## 증상

- Expo Go에서는 로그인과 API 호출이 정상 동작했다.
- `eas build -p android --profile preview --clear-cache`로 만든 APK에서는 로그인 화면에서 `network failure`가 떴다.
- 같은 아이디/비밀번호를 사용해도 APK에서만 로그인에 실패했다.

## 결론

원인은 **빌드된 Android APK의 실제 `AndroidManifest.xml`에 HTTP 허용 설정이 들어가지 않은 것**이었다.

앱이 호출하는 API 주소는 아래처럼 `http://`를 사용한다.

```text
http://43.202.113.123:8086
```

Android 9 이상에서는 기본적으로 일반 HTTP(cleartext) 트래픽이 차단된다. 그래서 APK의 실제 Manifest에 아래 속성이 들어가야 한다.

```xml
android:usesCleartextTraffic="true"
```

문제는 `app.json`에 `"usesCleartextTraffic": true`가 보이더라도, Expo SDK 54 기준으로 이 값만으로는 실제 Android Manifest에 반영되지 않았다는 점이다. 즉 설정 파일에는 있는 것처럼 보였지만, 빌드 결과물 기준으로는 HTTP 허용이 빠져 있었다.

## 확인한 내용

처음에는 환경변수 누락을 의심했다. Expo Go는 로컬 `.env`를 읽지만, EAS Build는 빌드 시점의 환경변수를 APK에 박기 때문이다.

하지만 이 프로젝트의 `eas.json`에는 `preview` 프로파일에 이미 아래 값이 들어가 있었다.

```json
"env": {
  "EXPO_PUBLIC_API_BASE": "http://43.202.113.123:8086"
}
```

그리고 PC에서 API 서버도 정상 응답했다.

```powershell
Invoke-WebRequest -Uri "http://43.202.113.123:8086/docs" -UseBasicParsing
```

로그인 API도 틀린 계정으로 호출했을 때 네트워크 실패가 아니라 `invalid credentials`를 반환했다. 따라서 서버 다운이나 API 주소 오타는 아니었다.

결정적인 확인은 Expo가 실제로 생성할 Android Manifest를 보는 것이었다.

```powershell
npx expo config --type introspect --json | Select-String "usesCleartextTraffic"
```

수정 전에는 `android:usesCleartextTraffic`가 실제 Manifest 출력에 없었다. 그래서 EAS로 만든 APK에서 HTTP API 호출이 Android 보안 정책에 막혔고, 앱 코드에서는 그 fetch 실패를 `network failure`로 표시했다.

## 조치

Android Manifest를 직접 수정하는 Expo config plugin을 추가했다.

- [plugins/withCleartextTraffic.js](../plugins/withCleartextTraffic.js)

핵심 내용:

```js
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });
}

module.exports = withCleartextTraffic;
```

그리고 [app.json](../app.json)의 `plugins`에 이 plugin을 등록했다.

```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  "./plugins/withCleartextTraffic"
]
```

재발 방지 테스트도 추가했다.

- [plugins/cleartext-config.test.js](../plugins/cleartext-config.test.js)

이 테스트는 `expo config --type introspect --json` 결과에서 실제 Android Manifest에 아래 값이 있는지 확인한다.

```text
"android:usesCleartextTraffic":"true"
```

## 수정 후 검증

아래 명령들이 통과했다.

```powershell
npm run typecheck
node .\node_modules\jest\bin\jest.js --runInBand
```

그리고 Manifest 확인 명령에서 `true`가 출력됐다.

```powershell
node -e "const {execFileSync}=require('child_process'); const cli=require.resolve('expo/bin/cli'); const out=execFileSync(process.execPath,[cli,'config','--type','introspect','--json'],{encoding:'utf8'}); const c=JSON.parse(out); console.log(c._internal.modResults.android.manifest.manifest.application[0]['$']['android:usesCleartextTraffic']);"
```

출력:

```text
true
```

이후 아래 명령으로 APK를 새로 빌드하고 설치하니 로그인 문제가 해결됐다.

```powershell
eas build -p android --profile preview --clear-cache
```

## 다음에 같은 문제가 나면 볼 순서

1. 폰 브라우저에서 `http://43.202.113.123:8086/docs`가 열리는지 확인한다.
2. `eas.json`의 `preview.env.EXPO_PUBLIC_API_BASE`가 맞는지 확인한다.
3. `npx expo config --type introspect --json | Select-String "usesCleartextTraffic"`로 실제 Manifest 반영 여부를 확인한다.
4. 설정을 바꿨다면 `eas build -p android --profile preview --clear-cache`로 새로 빌드한다.
5. 헷갈리면 폰에서 기존 앱을 삭제하고 최신 APK를 다시 설치한다.
