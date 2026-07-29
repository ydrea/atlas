// Compatibility surface for existing app imports.
// The implementation now lives in react-native-cumquat-gestures.
export {
  applyHorizontalGesture,
  applyRubberBand,
  applyRubberBandValue,
  applyVerticalGesture,
  applyZoomCoupling,
  clamp,
  compose,
  contextToUpdateResult,
  createGestureContext,
  createGestureInput,
  finiteOr,
  getLimitExcess,
  gestureConfig,
  horizontalPipeline,
  normalizeState,
  prepareContext,
  rubberBandResistance,
  snapState,
  updateHorizontal,
  updateVertical,
  validateState,
  verticalPipeline,
} from "react-native-cumquat-gestures";

export type { RubberBandResult } from "react-native-cumquat-gestures";
