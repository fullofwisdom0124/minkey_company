# PhotoSelector

사진관에서 SD카드의 1000여 장을 빠르게 셀렉하기 위한 macOS 네이티브 앱입니다.
SwiftUI + AppKit으로 작성되었으며, Apple 사진 앱과 유사한 룩앤필을 목표로 합니다.

## 요구사항

- Apple Silicon Mac
- macOS 14 Sonoma 이상
- Xcode 15 이상 (무료, App Store에서 설치)
- Apple Developer Program 가입 **불필요** — 무료 Apple ID + 자동 로컬 서명으로 본인 Mac에서 실행 가능

## 빌드 및 실행

```bash
open PhotoSelector/PhotoSelector.xcodeproj
```

Xcode에서 ⌘R로 실행. 첫 빌드 시 "Signing & Capabilities" 탭에서
본인 Apple ID 팀을 선택하면 됩니다.

## 사용 방법

1. ⌘O 또는 메뉴 → File → Open Folder… 로 SD카드 또는 사진 폴더를 엽니다.
2. 그리드(⌘G) / 디테일(⌘D) 모드 전환.
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

JPEG, HEIC/HEIF, PNG, TIFF
RAW: CR2/CR3 (Canon), NEF/NRW (Nikon), ARW (Sony), RAF (Fuji),
ORF (Olympus), RW2 (Panasonic), PEF (Pentax), DNG

Image I/O가 디코딩하므로 macOS가 인식하는 모든 RAW를 지원합니다.

## 프로젝트 구조

```
PhotoSelector/
├── PhotoSelector.xcodeproj/
└── PhotoSelector/
    ├── PhotoSelectorApp.swift   # @main 진입점, 메뉴/단축키
    ├── Models/
    │   ├── Photo.swift          # 사진 1장 모델 (flag/rating/color)
    │   └── LibraryStore.swift   # 라이브러리 전역 상태
    ├── Services/
    │   ├── PhotoImporter.swift  # 폴더 스캔 + EXIF 메타데이터
    │   ├── ThumbnailCache.swift # 비동기 썸네일 + 디스크 캐시
    │   ├── ImageLoader.swift    # 디테일 뷰용 풀사이즈 로더
    │   └── Exporter.swift       # 셀렉 결과 폴더 복사
    └── Views/
        ├── ContentView.swift          # 사이드바 + 메인 + 인스펙터
        ├── SidebarView.swift          # 필터 사이드바
        ├── PhotoGridView.swift        # Apple 사진 앱 스타일 그리드
        ├── PhotoThumbnailView.swift   # 그리드 셀
        ├── PhotoDetailView.swift      # 한 장 크게 보기 + 줌
        ├── FilmstripView.swift        # 하단 필름스트립
        ├── InspectorView.swift        # 우측 메타데이터 패널
        └── ToolbarContent.swift       # 상단 툴바
```

## 알려진 제한 (Phase 1 / MVP)

- 비교 모드(2~4장 나란히)는 미구현 — Phase 2
- 100% 픽셀 피핑은 디테일 뷰의 핀치 줌으로 일부 지원 — 고정 100% 토글은 Phase 2
- RAW+JPEG 듀얼 페어는 각각 별도 사진으로 표시됨 — 페어링 로직은 Phase 2
- 셀렉 상태(flag/rating)는 메모리에만 저장 — 종료 시 사라짐.
  사이드카(.xmp) 또는 라이브러리 DB 저장은 Phase 2
