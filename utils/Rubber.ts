// utils/rubberBand.ts
import { withSpring, withSequence, withTiming, Easing, cancelAnimation, SharedValue } from 'react-native-reanimated';

export interface RubberBandConfig {
  tension: number;      // How stiff the rubber band is (higher = stiffer)
  maxOvershoot: number; // Maximum overshoot factor (1.2 = 20% over limit)
  damping: number;      // How quickly it returns to normal
  mass: number;         // Heavier = slower oscillation
}

export const DEFAULT_RUBBER_CONFIG: RubberBandConfig = {
  tension: 150,
  maxOvershoot: 1.2,
  damping: 12,
  mass: 0.8,
};

/**
 * Apply rubber-banding to a value when it exceeds limits
 * Returns the "stretched" value and whether it's over limit
 */
export function applyRubberBand(
  value: number,
  min: number,
  max: number,
  config: RubberBandConfig = DEFAULT_RUBBER_CONFIG
): { stretched: number; isOverMin: boolean; isOverMax: boolean; excess: number } {
  const isOverMin = value < min;
  const isOverMax = value > max;
  
  if (!isOverMin && !isOverMax) {
    return { stretched: value, isOverMin: false, isOverMax: false, excess: 0 };
  }
  
  let excess = 0;
  let stretched = value;
  
  if (isOverMin) {
    excess = min - value;
    // Logarithmic rubber band for smooth limit stretching
    const stretchFactor = Math.min(config.maxOvershoot, 1 + Math.log10(1 + excess / 100) * 0.3);
    stretched = min - (excess * stretchFactor * 0.5);
  } else if (isOverMax) {
    excess = value - max;
    const stretchFactor = Math.min(config.maxOvershoot, 1 + Math.log10(1 + excess / 100) * 0.3);
    stretched = max + (excess * stretchFactor * 0.5);
  }
  
  return { stretched, isOverMin, isOverMax, excess };
}

/**
 * Create a spring animation that snaps back when released
 */
export function createSnapBackAnimation<T extends number>(
  targetValue: T,
  shouldSnap: boolean,
  config?: Partial<RubberBandConfig>
) {
  'worklet';
  
  if (!shouldSnap) {
    return withSpring(targetValue, {
      damping: config?.damping || DEFAULT_RUBBER_CONFIG.damping,
      mass: config?.mass || DEFAULT_RUBBER_CONFIG.mass,
      stiffness: config?.tension || DEFAULT_RUBBER_CONFIG.tension,
    });
  }
  
  // Add oscillation effect when snapping back from limit
  return withSequence(
    withTiming(targetValue * 1.02, { duration: 80, easing: Easing.out(Easing.quad) }),
    withTiming(targetValue * 0.98, { duration: 60, easing: Easing.in(Easing.quad) }),
    withSpring(targetValue, {
      damping: 14,
      mass: 0.7,
      stiffness: 120,
    })
  );
}

/**
 * Visual stretch animation for UI elements when hitting limits
 */
export function animateLimitHit(
  scaleValue: SharedValue<number>,
  shakeValue: SharedValue<number>
) {
  'worklet';
  
  cancelAnimation(scaleValue);
  cancelAnimation(shakeValue);
  
  // Pulse scale effect
  scaleValue.value = withSequence(
    withTiming(1.3, { duration: 100, easing: Easing.out(Easing.quad) }),
    withTiming(1, { duration: 200, easing: Easing.bounce })
  );
  
  // Subtle shake effect
  shakeValue.value = withSequence(
    withTiming(5, { duration: 50 }),
    withTiming(-5, { duration: 50 }),
    withTiming(3, { duration: 50 }),
    withTiming(-3, { duration: 50 }),
    withTiming(0, { duration: 100 })
  );
}