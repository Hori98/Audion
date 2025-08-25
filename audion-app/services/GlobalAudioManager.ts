/**
 * GlobalAudioManager - Ensures only one audio source plays at a time
 * Coordinates between AudioContext and AudioPlayerContext
 */

type AudioSystem = 'legacy' | 'new';
type StopAudioCallback = () => Promise<void> | void;

class GlobalAudioManager {
  private static instance: GlobalAudioManager;
  private currentSystem: AudioSystem | null = null;
  private stopCallbacks: Record<AudioSystem, StopAudioCallback | null> = {
    legacy: null,
    new: null,
  };

  static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  /**
   * Register stop callback for a specific audio system
   */
  registerStopCallback(system: AudioSystem, callback: StopAudioCallback) {
    this.stopCallbacks[system] = callback;
    console.log(`🎵 GlobalAudioManager: Registered ${system} system stop callback`);
  }

  /**
   * Unregister stop callback for a specific audio system
   */
  unregisterStopCallback(system: AudioSystem) {
    this.stopCallbacks[system] = null;
    console.log(`🎵 GlobalAudioManager: Unregistered ${system} system stop callback`);
  }

  /**
   * Request to play audio on a specific system (stops all others)
   */
  async requestAudioControl(system: AudioSystem): Promise<void> {
    if (this.currentSystem === system) {
      // Already playing on this system
      return;
    }

    console.log(`🎵 GlobalAudioManager: Switching from ${this.currentSystem || 'none'} to ${system}`);

    // Stop all other systems
    for (const [otherSystem, stopCallback] of Object.entries(this.stopCallbacks)) {
      if (otherSystem !== system && stopCallback) {
        try {
          await stopCallback();
          console.log(`🎵 GlobalAudioManager: Stopped ${otherSystem} system`);
        } catch (error) {
          console.warn(`🎵 GlobalAudioManager: Error stopping ${otherSystem}:`, error);
        }
      }
    }

    this.currentSystem = system;
  }

  /**
   * Notify that audio has stopped on a system
   */
  notifyAudioStopped(system: AudioSystem) {
    if (this.currentSystem === system) {
      this.currentSystem = null;
      console.log(`🎵 GlobalAudioManager: ${system} system stopped, no active audio`);
    }
  }

  /**
   * Get currently active audio system
   */
  getCurrentSystem(): AudioSystem | null {
    return this.currentSystem;
  }

  /**
   * Force stop all audio systems
   */
  async stopAllAudio(): Promise<void> {
    console.log('🎵 GlobalAudioManager: Stopping all audio systems');
    
    const stopPromises = Object.entries(this.stopCallbacks)
      .filter(([_, callback]) => callback)
      .map(async ([system, callback]) => {
        try {
          await callback!();
          console.log(`🎵 GlobalAudioManager: Stopped ${system} system`);
        } catch (error) {
          console.warn(`🎵 GlobalAudioManager: Error stopping ${system}:`, error);
        }
      });

    await Promise.all(stopPromises);
    this.currentSystem = null;
  }
}

// Create global instance
const globalAudioManager = GlobalAudioManager.getInstance();

// Make it available globally for debugging
if (typeof global !== 'undefined') {
  (global as any).audioManager = globalAudioManager;
}

export default globalAudioManager;