# AR Compass Beta

An augmented reality view for exploring points of interest with intuitive bidirectional gesture controls.

## 🖐️ Gesture Controls (Two-Finger)

| Gesture              | Direction   | Effect                     | Result                                   |
| -------------------- | ----------- | -------------------------- | ---------------------------------------- |
| **Top finger**       | ⬆️ UP       | MAX distance **INCREASES** | See further away                         |
| **Top finger**       | ⬇️ DOWN     | MAX distance **DECREASES** | See less far                             |
| **Bottom finger**    | ⬆️ UP       | MIN distance **INCREASES** | Can't see as close (near clip moves out) |
| **Bottom finger**    | ⬇️ DOWN     | MIN distance **DECREASES** | Can see closer objects                   |
| **Both fingers**     | ↕️ APART    | Camera Zoom **IN**         | Closer view                              |
| **Both fingers**     | ↕️ TOGETHER | Camera Zoom **OUT**        | Wider view                               |
| **Horizontal pinch** | ↔️ SPREAD   | FOV **INCREASES**          | See more (wider)                         |
| **Horizontal pinch** | ↔️ PINCH    | FOV **DECREASES**          | See less (narrower)                      |

## 🎯 Visual Feedback

### POI Indicators

| Indicator           | Location  | Meaning                                |
| ------------------- | --------- | -------------------------------------- |
| **White label**     | On screen | POI is visible with name + distance    |
| **White triangle**  | On edge   | POI is offscreen → Turn this way       |
| **Yellow triangle** | At top    | POI is too far (beyond max distance)   |
| **Blue triangle**   | At bottom | POI is too close (within min distance) |

### Distance-Based Styling

- **Opacity**: Farther = more transparent (0.2 → 1.0)
- **Font Size**: Farther = smaller text (8px → 16px)
- **Triangle Size**: Farther = smaller indicator (6px → 14px)

## 📊 Top HUD Display

| Element     | Description                       |
| ----------- | --------------------------------- |
| **MIN**     | Current minimum distance (green)  |
| **BEARING** | Average direction of visible POIs |
| **MAX**     | Current maximum distance (blue)   |
| **FOV**     | Current field of view in degrees  |

## 🔄 Quick Reset

Tap the **↺** button to reset:

- MIN distance to default (30m)
- MAX distance to default (5000m)
- Camera zoom to wide (0)
- FOV to default (60°)

## 🎮 Gesture Logic

The gesture controller intelligently detects which finger is moving:

1. **Top finger moves** → Adjust MAX distance
2. **Bottom finger moves** → Adjust MIN distance
3. **Both fingers move** → Camera zoom
4. **Horizontal pinch** → FOV control

Each gesture works BOTH ways for full control:

- UP/SPREAD = increase
- DOWN/PINCH = decrease

## 🛠 Technical Notes

- Uses device motion sensors for orientation tracking
- GPS for user position
- Real-time perspective projection
- Rubber band effect at gesture limits
- Spring animations for smooth feedback
- Distance clipping uses true radial distance (not camera-plane depth)

## 📱 Beta Status

- Works best outdoors with clear GPS signal
- POIs are pre-configured for testing
- Sensor fusion for stable orientation
- Min/Max distance gestures independent

- Sensor fusion for stable orientation
- Min/Max distance gestures independent
