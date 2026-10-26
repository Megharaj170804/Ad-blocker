import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeAdSkipper } from '@/content/youtube-ad-skipper';
import { YOUTUBE_CONFIG } from '@/constants';

describe('YouTubeAdSkipper Unit Tests', () => {
  let skipper: YouTubeAdSkipper;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    skipper = new YouTubeAdSkipper();
  });

  afterEach(() => {
    skipper.stop();
    vi.restoreAllMocks();
  });

  it('automatically clicks the skip button when an ad provides one', () => {
    const skipBtn = document.createElement('button');
    skipBtn.className = 'ytp-ad-skip-button';
    let clicked = false;
    skipBtn.addEventListener('click', () => {
      clicked = true;
    });
    // mock offsetParent so it appears visible
    Object.defineProperty(skipBtn, 'offsetParent', { value: document.body, configurable: true });
    document.body.appendChild(skipBtn);

    skipper.start();

    expect(clicked).toBe(true);
  });

  it('accelerates video playback to 16x and mutes audio when unskippable video ad is playing', () => {
    const video = document.createElement('video');
    video.className = 'html5-main-video';
    video.playbackRate = 1.0;
    video.muted = false;
    document.body.appendChild(video);

    const adMarker = document.createElement('div');
    adMarker.className = 'ad-showing';
    document.body.appendChild(adMarker);

    skipper.start();

    expect(video.playbackRate).toBe(YOUTUBE_CONFIG.FAST_FORWARD_RATE);
    expect(video.muted).toBe(true);

    // Remove ad marker and verify playback returns to 1.0x and unmuted
    adMarker.remove();
    skipper.checkAndSkipAds();

    expect(video.playbackRate).toBe(YOUTUBE_CONFIG.NORMAL_PLAYBACK_RATE);
    expect(video.muted).toBe(false);
  });

  it('dismisses YouTube anti-adblock enforcement dialog and resumes video', () => {
    const dialog = document.createElement('ytd-enforcement-message-view-model');
    document.body.appendChild(dialog);

    const video = document.createElement('video');
    video.className = 'html5-main-video';
    let played = false;
    video.play = vi.fn().mockImplementation(async () => {
      played = true;
    });
    // Mock paused property
    Object.defineProperty(video, 'paused', { value: true, configurable: true });
    document.body.appendChild(video);

    skipper.start();

    expect(document.querySelector('ytd-enforcement-message-view-model')).toBeNull();
    expect(played).toBe(true);
  });
});
