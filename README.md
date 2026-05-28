# AutoMobile - 자동매매 모니터링 앱 👋

이 프로젝트는 Upbit 자동매매 봇(`auto/` 백엔드)의 동작 상태를 모바일 기기에서 실시간으로 안전하게 조회하고 모니터링하기 위해 구축된 **React Native (Expo)** 앱입니다.

---

## 🛠 기술 스택

* **Framework**: React Native (Expo SDK 54, Managed Workflow)
* **Language**: TypeScript
* **Navigation**: Expo Router (File-based Routing, Bottom Tabs)
* **State & Auth**: React Context & Expo SecureStore (Android Keystore 기반 안전한 토큰 보관)
* **Theme**: Sleek Dark Theme 고정
* **Testing**: Jest & Jest-Expo, React Native Testing Library

---

## ✨ 주요 기능

1. **안전한 인증 & 세션 유지**
   * 아이디/패스워드 및 보안용 **TOTP** 기반의 이중 로그인 지원.
   * `access_token` 만료(15분) 시 `refresh_token`을 통해 백그라운드에서 자동으로 세션을 갱신(Token Rotation).
   * 토큰은 Android Keystore로 암호화되어 `SecureStore`에 안전하게 보관되며, 앱 재시작 시 자동 로그인을 지원합니다.

2. **실시간 대시보드 (`(tabs)/index`)**
   * **현재가 조회**: Upbit 실시간 가격 연동.
   * **봇 상태**: Heartbeat 수신 경과 시간 및 봇의 생사 여부(`Alive` / `정지`) 표시.
   * **자산 요약**: 총 보유 BTC, 사용 중인 슬롯 비율, 매수 평단가 표시.
   * **실시간 실현/미실현 손익**: 오늘 하루 동안의 실현손익 및 현재 대기 중인 매도 주문들의 미실현 손익(`매도 대기` 손익)을 부호와 컬러로 시각화.
   * **미체결 및 대기 카운트**: 처리 대기 중인 주문 수 표시.

3. **그리드 슬롯 상세 모니터링 (`(tabs)/grid`)**
   * 봇의 전체 그리드 세부 슬롯(매수가, 계획수량, 보유수량, 매도가 등)을 가로로 정렬된 리스트로 시각화.
   * **보유 슬롯 강조**: 현재 비어 있지 않고 코인을 보유 중인 슬롯은 **은은한 초록 배경색**과 초록 텍스트로 즉각 강조.
   * **미체결 뱃지**: 미체결 주문이 들어가 있는 슬롯은 우측 끝에 파란색 점으로 표시.
   * 슬롯 탭 시 상세 팝업(Modal)으로 미체결 주문의 고유 UUID 및 상태 정보 노출.

4. **주문 이력 및 상세 조회 (`(tabs)/orders`)**
   * 미체결된 대기 주문 리스트와 최근 체결/취소된 주문 50건의 로그를 시간 순서대로 정렬하여 제공.

5. **기간별 실현손익 분석 (`(tabs)/pnl`)**
   * 오늘(`d`), 이번 주(`w`), 이번 달(`m`), 올해(`y`), 전체(`all`) 탭 토글을 제공하여 각 구간의 순손익, 매수/매도 BTC 거래량, 주문 수, 체결 건수를 상세히 모니터링.

6. **지능적인 로딩 피드백 & 안정성**
   * 쿼리가 느린 오늘 손익 및 매도 대기 등의 데이터를 다시 불러올 때, 카드 내에 개별적으로 **`조회중...`**을 파란색으로 표시하여 시각적 즉각 반응성 제공.
   * 데이터 조회 중 사용자가 다른 탭으로 넘어갈 경우 발생할 수 있는 데이터 불일치를 방지하기 위해 **조회 중 탭 이동 잠금(TabPress Interception)** 처리 적용.

---

## 📂 디렉토리 구조

```text
mobile-app/
├── app/                       # Expo Router 라우팅 설정
│   ├── _layout.tsx            # 전역 AuthProvider, 테마 셋업
│   ├── login.tsx              # 이중 인증 로그인 화면
│   └── (tabs)/                # 하단 네비게이션 탭 그룹
│       ├── _layout.tsx        # 탭 바 및 탭 전환 잠금 리스너 설정
│       ├── index.tsx          # 대시보드
│       ├── grid.tsx           # 그리드 슬롯 상세
│       ├── orders.tsx         # 미체결 / 최근 주문 목록
│       └── pnl.tsx            # 기간별 실현손익
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios 스타일 fetch wrapper (401 만료 시 자동 세션 갱신)
│   │   ├── auth.ts            # 로그인/로그아웃/갱신 API 요청
│   │   └── endpoints.ts       # 봇 상태/그리드/주문/손익 개별 API
│   ├── auth/
│   │   ├── AuthContext.tsx    # 로그인 세션 상태 및 핸들러 컨텍스트
│   │   └── storage.ts         # SecureStore 토큰 저장소 인터페이스
│   ├── components/
│   │   ├── StatCard.tsx       # 대시보드용 모듈형 카드
│   │   ├── SlotRow.tsx        # 그리드 슬롯 개별 행 렌더러
│   │   └── QueryBar.tsx       # 수동 조회 상태 바
│   ├── theme/
│   │   └── colors.ts          # 다크 테마 색상 시스템 단일 소스
│   └── utils/
│       └── format.ts          # KRW 콤마/원 기호, BTC 소수점, 경과 시간 포맷
└── docs/                      # 개발/빌드/장애 조치 가이드
    └── html/                  # 웹 브라우저에서 편리하게 읽을 수 있는 반응형 HTML 가이드 문서
```

---

## 🚀 개발 및 테스트 방법

### 1. 환경변수 설정
`mobile-app/` 루트 경로에 `.env` 파일을 생성하고 모바일 API의 베이스 URL을 설정합니다:
```env
EXPO_PUBLIC_API_BASE=http://43.202.113.123:8086
```

### 2. 의존성 패키지 설치
```powershell
npm install
```

### 3. 개발 서버 구동 (Expo Go)
```powershell
npm start
```
* 터미널에 QR 코드가 출력되면 폰의 **Expo Go** 앱으로 스캔하여 즉시 테스트할 수 있습니다.
* Wi-Fi 기기 간 통신이 막혀 접속되지 않을 경우 터널 모드로 구동하세요: `npx expo start --tunnel`
* 개발 서버 콘솔 단축키:
  * `r` : 앱 강제 새로고침(Reload)
  * `m` : 기기에서 개발자 메뉴(Dev Menu) 열기

### 4. 코드 린트 및 테스트 실행
```powershell
# 타입 체크
npm run typecheck

# Jest 테스트 실행
npm test
```

---

## 📦 실제 앱 빌드 (EAS Build)

EAS Build를 이용해 폰에 직접 설치할 수 있는 APK를 만듭니다:

1. **EAS CLI 로그인** (Expo 계정 필요):
   ```powershell
   npx eas-cli login
   ```
2. **APK 빌드 명령어 실행** (`preview` 프로필):
   ```powershell
   npx eas-cli build --profile preview --platform android
   ```
* 빌드가 완료되면 터미널과 Expo 계정 콘솔에 다운로드 링크 및 QR 코드가 제공됩니다.

---

## 📘 관련 문서

자세한 빌드 방법이나 개발 설정 및 과거 발생 장애 조치 내용은 아래 문서(HTML 가이드)를 통해 가독성 좋게 웹 브라우저로 바로 확인하실 수 있습니다:

* **[EAS Build 가이드 (HTML)](file:///C:/dev/mobileAuto/mobile-app/docs/html/eas-build.html)**
* **[Expo Go 개발 가이드 (HTML)](file:///C:/dev/mobileAuto/mobile-app/docs/html/expo-dev.html)**
* **[HTTP 통신 장애 조치 기록 (HTML)](file:///C:/dev/mobileAuto/mobile-app/docs/html/eas-network-failure-root-cause.html)**
