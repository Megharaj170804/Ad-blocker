import { YOUTUBE_CONFIG } from '@/constants';

/**
 * YouTube Ad Skipper & Accelerated Player
 * Handles in-stream video ads, unskippable ads, and anti-adblock playback warnings.
 *
 * Techniques:
 * 1. Automatically clicks the skip button (.ytp-ad-skip-button, .ytp-ad-skip-button-modern, etc.)
 * 2. Speeds up unskippable ads to 16x and mutes audio until the ad segment finishes.
 * 3. Dismisses anti-adblock dialogs on YouTube and unfreezes player controls.
 */
export class YouTubeAdSkipper {
  private isRunning = false;
  private pollTimer: number | null = null;
  private observer: MutationObserver | null = null;
  private originalMuted: boolean | null = null;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.checkAndSkipAds();

    // Observe player DOM changes
    if (typeof MutationObserver !== 'undefined' && document.body) {
      this.observer = new MutationObserver(() => {
        this.checkAndSkipAds();
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // Polling fallback to guarantee continuous fast-forward during unskippable video ad playback
    this.pollTimer = window.setInterval(() => {
      this.checkAndSkipAds();
    }, YOUTUBE_CONFIG.POLL_INTERVAL_MS);
  }

  public stop(): void {
    this.isRunning = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.restoreVideoPlayback();
  }

  /**
   * Primary inspection and skipping cycle
   */
  public checkAndSkipAds(): void {
    if (!this.isRunning) return;

    this.dismissAntiAdblockDialogs();
    this.clickSkipButtons();
    this.handleVideoAdPlayback();
  }

  /**
   * Auto-clicks visible skip buttons
   */
  private clickSkipButtons(): void {
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-text',
      'button.ytp-ad-skip-button',
      '.ytp-ad-overlay-close-button',
    ];

    for (const selector of skipSelectors) {
      const btn = document.querySelector<HTMLElement>(selector);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        break;
      }
    }
  }

  /**
   * Fast-forwards and mutes unskippable in-stream video ads
   */
  private handleVideoAdPlayback(): void {
    const video = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    const adShowing = document.querySelector('.ad-showing, .ad-interrupting');

    if (adShowing && video) {
      // Save original mute state before muting the ad
      if (this.originalMuted === null) {
        this.originalMuted = video.muted;
      }
      video.muted = true;
      video.playbackRate = YOUTUBE_CONFIG.FAST_FORWARD_RATE;

      // Try skipping to the end if duration is available and finite
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }
    } else if (video && video.playbackRate === YOUTUBE_CONFIG.FAST_FORWARD_RATE) {
      this.restoreVideoPlayback();
    }
  }

  /**
   * Restores video playback back to normal speed and restores volume
   */
  private restoreVideoPlayback(): void {
    const video = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    if (video) {
      video.playbackRate = YOUTUBE_CONFIG.NORMAL_PLAYBACK_RATE;
      if (this.originalMuted !== null) {
        video.muted = this.originalMuted;
        this.originalMuted = null;
      }
    }
  }

  /**
   * Dismisses any anti-adblock enforcement dialogs injected by YouTube
   */
  private dismissAntiAdblockDialogs(): void {
    const dialog = document.querySelector<HTMLElement>(
      'tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model), ytd-enforcement-message-view-model'
    );
    if (dialog) {
      dialog.remove();

      // Resume video playback if it was paused by enforcement
      const video = document.querySelector<HTMLVideoElement>('video.html5-main-video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }
  }
}
