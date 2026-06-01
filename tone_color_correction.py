#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tone_color_correction.py

1번(소스) 사진을 2번(레퍼런스) 사진의 톤/색감으로 옮기는 일반적인 보정 파이프라인.

설계 원칙
---------
- "하드피팅" 금지: 특정 픽셀 좌표나 상수 색을 외워서 결과를 베끼지 않는다.
  대신 레퍼런스 이미지의 *통계량*(밝기/대비/채도/색상 분포)을 추정해서
  소스에 일반적으로 적용한다. 따라서 다른 사진 쌍에도 그대로 동작한다.
- 강도(strength) 파라미터로 보정량을 조절할 수 있어서 과보정을 피한다.

작업 순서 (요청대로)
-------------------
  1) 톤 커브 맞추기 + 밝기 맞추기   -> match_tone_and_brightness()
  2) HSV 변환(채도/색상 정합)        -> match_hsv()
  3) 디테일 보정 (눈 / 피부톤 / 배경) -> refine_details()

사용법
------
  python tone_color_correction.py source.jpg reference.jpg -o output.jpg
  python tone_color_correction.py 1.jpg 2.jpg -o out.jpg --strength 0.85
"""

import argparse
import sys

import cv2
import numpy as np


# ---------------------------------------------------------------------------
# 공용 유틸
# ---------------------------------------------------------------------------
def _to_float(img):
    """uint8 BGR -> float32 BGR [0,1]"""
    return img.astype(np.float32) / 255.0


def _to_uint8(img):
    """float BGR [0,1] -> uint8 BGR"""
    return np.clip(img * 255.0, 0, 255).astype(np.uint8)


def _blend(a, b, strength):
    """a를 원본, b를 보정 결과로 보고 strength(0~1)만큼 b쪽으로 섞는다."""
    return a * (1.0 - strength) + b * strength


# ---------------------------------------------------------------------------
# 1) 톤 커브 + 밝기
# ---------------------------------------------------------------------------
def _smooth_curve_from_percentiles(src_chan, ref_chan, n_points=16):
    """
    소스/레퍼런스 채널의 분위수(percentile)를 대응시켜 '부드러운 톤 커브'를 만든다.
    전체 히스토그램 매칭은 거칠고 노이즈에 민감하므로, 분위수 몇 개만 잡아
    단조 증가하는 매핑(LUT, 0..255)을 보간으로 생성한다 -> 일반적이고 부드러움.
    """
    qs = np.linspace(0, 100, n_points)
    src_pts = np.percentile(src_chan, qs)
    ref_pts = np.percentile(ref_chan, qs)

    # 단조 증가 보장 (보간 안정성)
    src_pts = np.maximum.accumulate(src_pts)
    src_pts[0], src_pts[-1] = 0.0, 255.0  # 양 끝을 고정해 전체 레인지를 보존

    x = np.arange(256, dtype=np.float32)
    lut = np.interp(x, src_pts, ref_pts).astype(np.float32)
    return lut


def match_tone_and_brightness(src, ref, strength=1.0):
    """
    LAB의 L(밝기) 채널에 분위수 기반 톤 커브를 적용해 밝기/대비/톤을 맞춘다.
    a,b(색) 채널은 여기서 건드리지 않는다 -> 색 정합은 2단계 HSV에서 처리.
    """
    src_lab = cv2.cvtColor(src, cv2.COLOR_BGR2LAB)
    ref_lab = cv2.cvtColor(ref, cv2.COLOR_BGR2LAB)

    L_src = src_lab[:, :, 0]
    L_ref = ref_lab[:, :, 0]

    lut = _smooth_curve_from_percentiles(L_src, L_ref)
    L_mapped = cv2.LUT(L_src, lut.astype(np.uint8))

    # 원본 대비 strength 만큼만 적용 (과보정 방지)
    L_out = _blend(L_src.astype(np.float32), L_mapped.astype(np.float32), strength)
    src_lab[:, :, 0] = np.clip(L_out, 0, 255).astype(np.uint8)

    return cv2.cvtColor(src_lab, cv2.COLOR_LAB2BGR)


# ---------------------------------------------------------------------------
# 2) HSV 정합 (채도 / 색상)
# ---------------------------------------------------------------------------
def _circular_hue_shift(h_src_mean, h_ref_mean):
    """OpenCV Hue는 0~180. 색상환이라 최단거리로 시프트량을 구한다."""
    diff = (h_ref_mean - h_src_mean)
    diff = (diff + 90) % 180 - 90  # -90..90 범위로 래핑
    return diff


def match_hsv(src, ref, sat_strength=0.8, hue_strength=0.5):
    """
    HSV로 변환해서
      - S(채도): 레퍼런스의 평균/표준편차에 맞춰 스케일 (전반적 채도 정합)
      - H(색상): 평균 색상을 레퍼런스 쪽으로 부드럽게 시프트 (전체 화이트밸런스/웜톤)
    V(명도)는 1단계에서 다뤘으므로 거의 손대지 않는다.
    """
    src_hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV).astype(np.float32)
    ref_hsv = cv2.cvtColor(ref, cv2.COLOR_BGR2HSV).astype(np.float32)

    H, S, V = src_hsv[:, :, 0], src_hsv[:, :, 1], src_hsv[:, :, 2]
    Hr, Sr = ref_hsv[:, :, 0], ref_hsv[:, :, 1]

    # --- 채도: 평균/표준편차 정합 후 strength로 블렌드 ---
    s_mean, s_std = S.mean(), S.std() + 1e-6
    sr_mean, sr_std = Sr.mean(), Sr.std() + 1e-6
    S_matched = (S - s_mean) * (sr_std / s_std) + sr_mean
    S_out = _blend(S, S_matched, sat_strength)

    # --- 색상: 평균 hue를 레퍼런스 쪽으로 시프트 ---
    shift = _circular_hue_shift(H.mean(), Hr.mean()) * hue_strength
    H_out = (H + shift) % 180

    src_hsv[:, :, 0] = H_out
    src_hsv[:, :, 1] = np.clip(S_out, 0, 255)
    src_hsv[:, :, 2] = V

    return cv2.cvtColor(src_hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


# ---------------------------------------------------------------------------
# 3) 디테일 보정 (눈 / 피부 / 배경)
# ---------------------------------------------------------------------------
def _skin_mask(img):
    """YCrCb 기반 일반 피부 마스크. (조명 변화에 비교적 강함)"""
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    cr, cb = ycrcb[:, :, 1], ycrcb[:, :, 2]
    mask = ((cr >= 133) & (cr <= 180) & (cb >= 77) & (cb <= 127)).astype(np.uint8) * 255
    mask = cv2.medianBlur(mask, 7)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return mask


def _background_mask(img, skin):
    """
    배경 마스크: 네 모서리 색과 비슷하고 + 그라디언트(질감)가 약한 영역.
    (인물 사진의 단색 배경을 일반적으로 잡기 위한 방법)
    """
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)

    # 모서리 패치 평균색을 배경 기준색으로
    p = max(8, min(h, w) // 20)
    corners = np.concatenate([
        lab[:p, :p].reshape(-1, 3), lab[:p, -p:].reshape(-1, 3),
        lab[-p:, :p].reshape(-1, 3), lab[-p:, -p:].reshape(-1, 3),
    ])
    bg_ref = corners.mean(axis=0)

    dist = np.linalg.norm(lab - bg_ref, axis=2)
    color_close = (dist < 25).astype(np.uint8) * 255

    # 질감이 약한 영역(배경은 매끈함)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    grad = cv2.magnitude(cv2.Sobel(gray, cv2.CV_32F, 1, 0),
                         cv2.Sobel(gray, cv2.CV_32F, 0, 1))
    smooth = (grad < np.percentile(grad, 60)).astype(np.uint8) * 255

    mask = cv2.bitwise_and(color_close, smooth)
    mask = cv2.bitwise_and(mask, cv2.bitwise_not(skin))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    return mask


def _feather(mask, ksize=21):
    """마스크 경계를 부드럽게(가우시안) 만들어 합성 티가 안 나게."""
    m = cv2.GaussianBlur(mask, (ksize, ksize), 0).astype(np.float32) / 255.0
    return m[:, :, None]


def _region_mean_bgr(img, mask):
    m = mask.astype(bool)
    if m.sum() < 50:
        return None
    return img[m].reshape(-1, 3).mean(axis=0)


def enhance_eyes(img, strength=0.5):
    """
    눈 영역을 검출해 언샤프 마스크로 또렷하게 + 캐치라이트 살짝 강조.
    검출 실패 시 원본 그대로 반환(일반성 유지).
    """
    out = img.copy()
    try:
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        eyes = cascade.detectMultiScale(gray, 1.1, 6, minSize=(20, 20))
    except Exception:
        eyes = []

    for (x, y, w, h) in eyes:
        roi = out[y:y + h, x:x + w].astype(np.float32)
        blur = cv2.GaussianBlur(roi, (0, 0), 2.0)
        sharp = cv2.addWeighted(roi, 1.0 + strength, blur, -strength, 0)
        out[y:y + h, x:x + w] = np.clip(sharp, 0, 255).astype(np.uint8)
    return out


def correct_skin(img, ref, strength=0.4):
    """
    피부 영역:
      - 레퍼런스 피부 평균색 쪽으로 톤을 부드럽게 이동 (웜/쿨 정합)
      - bilateral로 잡티/노이즈를 살짝 정돈하되 질감은 보존
    """
    skin = _skin_mask(img)
    ref_skin = _skin_mask(ref)

    out = img.astype(np.float32)

    src_mean = _region_mean_bgr(img, skin)
    ref_mean = _region_mean_bgr(ref, ref_skin)
    if src_mean is not None and ref_mean is not None:
        shift = (ref_mean - src_mean) * strength
        toned = np.clip(out + shift, 0, 255)
    else:
        toned = out

    # 부드러운 스킨 스무딩 (질감 보존 위해 약하게 + 블렌드)
    smooth = cv2.bilateralFilter(toned.astype(np.uint8), 7, 35, 35).astype(np.float32)
    toned = _blend(toned, smooth, 0.35)

    alpha = _feather(skin)
    out = out * (1 - alpha) + toned * alpha
    return np.clip(out, 0, 255).astype(np.uint8)


def correct_background(img, ref, strength=0.7):
    """배경 영역을 레퍼런스 배경 평균색 쪽으로 부드럽게 정합."""
    skin = _skin_mask(img)
    bg = _background_mask(img, skin)
    ref_skin = _skin_mask(ref)
    ref_bg = _background_mask(ref, ref_skin)

    src_mean = _region_mean_bgr(img, bg)
    ref_mean = _region_mean_bgr(ref, ref_bg)
    if src_mean is None or ref_mean is None:
        return img

    out = img.astype(np.float32)
    shift = (ref_mean - src_mean) * strength
    recolored = np.clip(out + shift, 0, 255)

    alpha = _feather(bg, ksize=31)
    out = out * (1 - alpha) + recolored * alpha
    return np.clip(out, 0, 255).astype(np.uint8)


def refine_details(img, ref, eye=0.5, skin=0.4, background=0.7):
    img = enhance_eyes(img, strength=eye)
    img = correct_skin(img, ref, strength=skin)
    img = correct_background(img, ref, strength=background)
    return img


# ---------------------------------------------------------------------------
# 파이프라인
# ---------------------------------------------------------------------------
def transform(src, ref, strength=1.0):
    """소스(1번)를 레퍼런스(2번) 톤으로. strength로 전체 보정량 스케일."""
    # 1) 톤 커브 + 밝기
    out = match_tone_and_brightness(src, ref, strength=strength)
    # 2) HSV (채도/색상)
    out = match_hsv(out, ref,
                    sat_strength=0.8 * strength,
                    hue_strength=0.5 * strength)
    # 3) 디테일
    out = refine_details(out, ref,
                         eye=0.5 * strength,
                         skin=0.4 * strength,
                         background=0.7 * strength)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="1번 사진을 2번(레퍼런스) 톤으로 옮기는 일반 보정 스크립트")
    ap.add_argument("source", help="소스 이미지 (1번)")
    ap.add_argument("reference", help="레퍼런스 이미지 (2번, 목표 톤)")
    ap.add_argument("-o", "--output", default="output.jpg", help="결과 저장 경로")
    ap.add_argument("--strength", type=float, default=1.0,
                    help="전체 보정 강도 0~1 (기본 1.0)")
    args = ap.parse_args(argv)

    src = cv2.imread(args.source)
    ref = cv2.imread(args.reference)
    if src is None:
        sys.exit(f"소스 이미지를 못 읽음: {args.source}")
    if ref is None:
        sys.exit(f"레퍼런스 이미지를 못 읽음: {args.reference}")

    out = transform(src, ref, strength=args.strength)
    cv2.imwrite(args.output, out)
    print(f"저장 완료: {args.output}")


if __name__ == "__main__":
    main()
