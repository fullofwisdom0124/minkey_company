# PhotoSelector

사진관에서 SD카드의 1000여 장을 빠르게 셀렉하기 위한 데스크탑 앱입니다.
**Tauri 2 + React 18 + TypeScript + Rust**로 작성되었고,
Apple 사진 앱과 유사한 다크 모드 UI를 목표로 합니다.

기본 개발/실행 타겟은 macOS (Apple Silicon)이며, 동일한 코드베이스로
Windows / Linux 빌드도 가능합니다.

## 요구사항

- **Node.js 20+** (https://nodejs.org)
- **Rust toolchain** (https://rustup.rs)
- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Windows: Microsoft C++ Build Tools, WebView2
- Linux: `webkit2gtk-4.1`, `librsvg2-dev` 등

자세한 시스템 의존성은 https://v2.tauri.app/start/prerequisites/ 참고.

## 처음 한 번만

```bash
cd app
npm install
```

## 개발 모드 실행

```bash
cd app
npm run tauri:dev
```

Vite dev 서버가 1420 포트에서 뜨고, Tauri 윈도우가 열립니다.
React 코드는 HMR로 즉시 반영, Rust 코드는 변경 시 자동 재컴파일.

## 배포 빌드

```bash
cd app
npm run tauri:build
```

`app/src-tauri/target/release/bundle/` 에 `.app` (macOS) / `.dmg` /
`.exe` (Windows) / `.AppImage` (Linux) 가 생성됩니다.

## 사용 방법

1. ⌘O 또는 툴바의 "Open Folder" 버튼으로 SD카드 또는 사진 폴더 선택.
2. 그리드(⌘G) ↔ 디테일(⌘D) 모드 전환.
3. 화살표 키로 사진 이동.
4. 키보드 단축키:
   - `P` — Pick(채택)
   - `X` — Reject(탈락)
   - `U` — 플래그 해제
   - `0`~`5` — 별점
   - `Space` / `Enter` — 디테일 보기 토글
   - `Esc` — 그리드로 돌아가기
   - `⌘⇧E` — 선택본 폴더로 내보내기
   - `⌥⌘I` — 인스펙터 토글
5. 사이드바에서 Pick / Reject / 별점 / 컬러 라벨로 필터링.
6. 셀렉이 끝나면 ⌘⇧E로 채택본을 별도 폴더에 복사.

## 지원 포맷

- **확실히 디코딩됨**: JPEG, PNG, TIFF, WebP, BMP, GIF
- **확장자는 인식하나 디코딩은 추가 의존성 필요**: HEIC/HEIF, RAW
  (CR2/CR3, NEF, ARW, RAF, ORF, RW2, PEF, DNG 등)

RAW/HEIC 지원은 Phase 2에서 `libraw` / `libheif` 바인딩을 통합합니다.
현 단계에서는 RAW+JPEG 듀얼 촬영의 JPEG 사이드를 우선 사용하세요.

## 아이콘 교체

`src-tauri/icons/icon.png`은 임시 placeholder입니다.
실제 로고를 원하시면 1024×1024 PNG를 준비한 뒤:

```bash
npx @tauri-apps/cli icon path/to/your-logo.png
```

이 명령으로 macOS/Windows/Linux 각각의 아이콘이 자동 생성됩니다.

## 프로젝트 구조

```
app/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── src/                         # React + TypeScript 프론트엔드
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles.css
│   ├── types/photo.ts
│   ├── store/library.ts         # Zustand 글로벌 상태
│   ├── lib/
│   │   ├── ipc.ts               # Tauri invoke 래퍼
│   │   ├── thumbnails.ts        # 썸네일 훅
│   │   └── keyboard.ts          # 키보드 단축키 훅
│   └── components/
│       ├── Sidebar.tsx
│       ├── Toolbar.tsx
│       ├── PhotoGrid.tsx        # 가상화된 그리드 (1000+장 대응)
│       ├── PhotoThumbnail.tsx
│       ├── PhotoDetail.tsx      # 줌/팬 지원
│       ├── Filmstrip.tsx
│       └── Inspector.tsx
└── src-tauri/                   # Rust + Tauri 백엔드
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── build.rs
    ├── capabilities/default.json
    ├── icons/icon.png
    └── src/
        ├── main.rs
        ├── lib.rs               # 명령 등록
        ├── importer.rs          # 폴더 스캔 + EXIF
        ├── thumbnails.rs        # 디스크 캐시 + 리사이즈
        └── exporter.rs          # 채택본 복사
```

## 알려진 제한 (Phase 1 / MVP)

- 비교 모드(2~4장 나란히) 미구현
- HEIC / RAW 디코딩은 phase 2 (libheif / libraw 통합 필요)
- 셀렉 상태(flag/rating/colorLabel)는 메모리에만 저장 — 종료 시 사라짐.
  사이드카(.xmp) 또는 SQLite 저장은 Phase 2
- 임포트 진행률은 indeterminate spinner

## 참고: SwiftUI 버전

`PhotoSelector/` 디렉토리에는 동일 앱의 SwiftUI 네이티브 구현이 있습니다.
크로스플랫폼이 우선이 아니라 macOS 전용 네이티브 룩앤필이 우선이라면
그쪽이 더 완벽한 Apple 사진 앱 재현입니다. 참고용으로 보관.
