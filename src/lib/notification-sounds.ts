// iOS-style Notification Sounds Service
// Generates audio notifications similar to iOS system sounds

export class NotificationSounds {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // Initialize audio context when first used (only on client side)
    if (typeof window !== 'undefined') {
      this.initializeAudioContext();
    }
  }

  private initializeAudioContext() {
    // Only initialize on client side
    if (typeof window === 'undefined') {
      this.isEnabled = false;
      return;
    }
    
    try {
      // Create audio context (handle browser compatibility)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
      this.isEnabled = false;
    }
  }

  private async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Generate iOS "Rebound" style notification sound
  private async playTriTone(frequencies: number[], duration: number = 0.3) {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      await this.resumeAudioContext();
      
      const now = this.audioContext.currentTime;
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        
        // Connect oscillator to gain to speakers
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);
        
        // Configure oscillator
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now + (index * 0.08)); // Faster timing for rebound effect
        
        // Configure gain (volume envelope) - softer volume for Rebound style
        gainNode.gain.setValueAtTime(0, now + (index * 0.08));
        gainNode.gain.linearRampToValueAtTime(0.06, now + (index * 0.08) + 0.03); // Softer and quicker attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.08) + (duration * 0.8)); // Shorter decay
        
        // Start and stop
        oscillator.start(now + (index * 0.08));
        oscillator.stop(now + (index * 0.08) + (duration * 0.8));
      });
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  // iOS "Rebound" style sound for new tasks
  async playNewTaskSound() {
    // Rebound-style: Quick ascending then descending pattern
    const frequencies = [523.25, 659.25, 783.99, 659.25]; // C5, E5, G5, E5 (rebound pattern)
    await this.playTriTone(frequencies, 0.25);
  }

  // iOS "Rebound" style sound for new comments (softer variation)
  async playNewCommentSound() {
    // Softer rebound: D5, F#5, A5, F#5 (similar pattern, different pitch)
    const frequencies = [587.33, 739.99, 880.00, 739.99]; // D5, F#5, A5, F#5
    await this.playTriTone(frequencies, 0.25);
  }

  // iOS-style "Ding" sound for general notifications
  async playGeneralNotificationSound() {
    // Single chime: G5 with harmonic
    const frequencies = [783.99]; // G5
    await this.playTriTone(frequencies, 0.6);
  }

  // Success sound for completed tasks
  async playSuccess() {
    // Success sound: C5, E5, G5, C6 (ascending major chord)
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    await this.playTriTone(frequencies, 0.4);
  }

  // Progress sound for tasks in progress
  async playProgress() {
    // Progress sound: G4, B4, D5 (ascending minor progression)
    const frequencies = [392.00, 493.88, 587.33]; // G4, B4, D5
    await this.playTriTone(frequencies, 0.3);
  }

  // Assignment sound for newly assigned tasks
  async playAssignment() {
    // Assignment sound: D5, F#5, A5 (ascending major triad)
    const frequencies = [587.33, 739.99, 880.00]; // D5, F#5, A5
    await this.playTriTone(frequencies, 0.35);
  }

  // Enable/disable sounds
  setSoundEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Check if sounds are enabled
  isSoundEnabled(): boolean {
    return this.isEnabled && this.audioContext !== null;
  }

  // Clean up audio context
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create singleton instance
const soundsInstance = new NotificationSounds();

export const notificationSounds = {
  // Bind all methods to the singleton instance
  playSuccess: () => soundsInstance.playSuccess(),
  playProgress: () => soundsInstance.playProgress(), 
  playAssignment: () => soundsInstance.playAssignment(),
  playNewTaskSound: () => soundsInstance.playNewTaskSound(),
  playNewCommentSound: () => soundsInstance.playNewCommentSound(),
  playGeneralNotificationSound: () => soundsInstance.playGeneralNotificationSound(),
  setSoundEnabled: (enabled: boolean) => soundsInstance.setSoundEnabled(enabled),
  isSoundEnabled: () => soundsInstance.isSoundEnabled(),
  dispose: () => soundsInstance.dispose()
};

// Auto-enable audio context on user interaction (required by browsers)
let audioInitialized = false;

const initializeAudio = () => {
  if (!audioInitialized) {
    soundsInstance.playGeneralNotificationSound().then(() => {
      console.log('🔊 Notification sounds initialized');
    }).catch(() => {
      console.log('🔇 Audio initialization failed');
    });
    audioInitialized = true;
    
    // Remove event listeners after first interaction
    document.removeEventListener('click', initializeAudio);
    document.removeEventListener('touchstart', initializeAudio);
    document.removeEventListener('keydown', initializeAudio);
  }
};

// Only add event listeners on client side
if (typeof window !== 'undefined') {
  // Add event listeners for user interaction
  document.addEventListener('click', initializeAudio);
  document.addEventListener('touchstart', initializeAudio);
  document.addEventListener('keydown', initializeAudio);
}