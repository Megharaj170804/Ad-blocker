import { YOUTUBE_CONFIG } from '@/constants';

/**
 * YouTube Ad Skipper & Accelerated Player
 * Handles in-stream video ads, unskippable ads, and anti-adblock playback warnings.
 *
 * Techniques:
 * 1. Instantly clicks any skip button across all variants (.ytp-ad-skip-button, .ytp-ad-skip-button-modern, aria-label, etc.)
 * 2. Directly jumps video currentTime to video.duration - 0.1s so the ad finishes instantaneously without waiting.
 * 3. Speeds up playback to 16x and mutes audio until the ad segment completes.
 * 4. Dismisses anti-adblock dialogs on YouTube and unfreezes player controls.
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

    // Fast MutationObserver to catch ads the instant DOM nodes are created
    if (typeof MutationObserver !== 'undefined' && document.body) {
      this.observer = new MutationObserver(() => {
        this.checkAndSkipAds();
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // High-frequency polling loop (50ms) as a fail-safe fallback
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
   * Auto-clicks visible and invisible skip buttons immediately
   */
  private clickSkipButtons(): void {
    for (const selector of YOUTUBE_CONFIG.SKIP_BUTTON_SELECTORS) {
      const buttons = document.querySelectorAll<HTMLElement>(selector);
      for (const btn of Array.from(buttons)) {
        try {
          btn.click();
        } catch {
          // Ignore click dispatch errors
        }
      }
    }
  }

  /**
   * Fast-forwards and terminates in-stream video ads directly
   */
  private handleVideoAdPlayback(): void {
    const video = document.querySelector<HTMLVideoElement>('video.html5-main-video');
    const adShowing = document.querySelector('.ad-showing, .ad-interrupting');

    if (adShowing && video) {
      // 1. Mute ad immediately to eliminate loud commercial bursts
      if (this.originalMuted === null) {
        this.originalMuted = video.muted;
      }
      video.muted = true;
      video.playbackRate = YOUTUBE_CONFIG.FAST_FORWARD_RATE;

      // 2. Instantly jump currentTime to the end so the ad terminates immediately
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const targetEnd = Math.max(0, video.duration - YOUTUBE_CONFIG.DURATION_END_OFFSET_SECONDS);
        if (video.currentTime < targetEnd) {
          video.currentTime = targetEnd;
        }
      }

      // 3. Trigger skip button click right after seeking
      this.clickSkipButtons();
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
