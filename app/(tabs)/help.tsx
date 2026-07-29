// app/HelpScreen.tsx
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";
import { useLanguage } from "@/contexts/LanguageContext";
import Svg, {
  Circle,
  Path,
  Rect,
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

const { width, height } = Dimensions.get("window");

interface HelpScreenProps {
  onClose: () => void;
}

// SVG Icons with proper finger highlighting
const HandIcon = ({
  color,
  direction,
  finger,
}: {
  color: string;
  direction?: "up" | "down" | "left" | "right" | "horizontal";
  finger?: "top" | "bottom" | "both";
}) => (
  <Svg width={44} height={44} viewBox="0 0 24 24">
    {direction === "horizontal" ? (
      // Horizontal pinch - FOV control
      <>
        <Path
          d="M3 12L8 7M3 12L8 17"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M21 12L16 7M21 12L16 17"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx="8" cy="12" r="1.5" fill={color} />
        <Circle cx="16" cy="12" r="1.5" fill={color} />
        <Path
          d="M12 2L12 6M12 18L12 22"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M2 12L6 12M18 12L22 12"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </>
    ) : finger === "top" ? (
      // Top finger - Adjust MAX distance (BOTH ways)
      <>
        <Path
          d="M12 3L12 21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 8L12 3L17 8"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 16L12 21L17 16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.3}
        />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
        {/* Top finger highlight */}
        <Circle cx="12" cy="3" r="4" fill={color} opacity={0.2} />
        <Circle cx="12" cy="3" r="2" fill={color} />
        {/* UP arrow */}
        <Path
          d="M9 7L12 4L15 7"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* DOWN arrow */}
        <Path
          d="M9 10L12 13L15 10"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
        <SvgText
          fontSize="7"
          fill="white"
          x="12"
          y="-4"
          textAnchor="middle"
          fontWeight="bold"
        >
          MAX
        </SvgText>
      </>
    ) : finger === "bottom" ? (
      // Bottom finger - Adjust MIN distance (BOTH ways)
      <>
        <Path
          d="M12 3L12 21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 16L12 21L17 16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 8L12 3L17 8"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.3}
        />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
        {/* Bottom finger highlight */}
        <Circle cx="12" cy="21" r="4" fill={color} opacity={0.2} />
        <Circle cx="12" cy="21" r="2" fill={color} />
        {/* UP arrow */}
        <Path
          d="M9 18L12 15L15 18"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* DOWN arrow */}
        <Path
          d="M9 21L12 24L15 21"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <SvgText
          fontSize="7"
          fill="white"
          x="12"
          y="27"
          textAnchor="middle"
          fontWeight="bold"
        >
          MIN
        </SvgText>
      </>
    ) : (
      // Both fingers - Symmetric zoom
      <>
        <Path
          d="M12 3L12 21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 8L12 3L17 8"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M7 16L12 21L17 16"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
        {/* Both fingers highlighted */}
        <Circle cx="12" cy="3" r="3" fill={color} opacity={0.15} />
        <Circle cx="12" cy="21" r="3" fill={color} opacity={0.15} />
        {/* Zoom arrows */}
        <Path
          d="M12 6L12 9M12 15L12 18"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M9 12L15 12"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.5}
        />
      </>
    )}
  </Svg>
);

// Gesture Card Component
const GestureCard = ({
  title,
  description,
  icon,
  color,
  delay,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}) => (
  <Animated.View
    entering={SlideInRight.delay(delay).springify()}
    style={[styles.gestureCard, { borderLeftColor: color }]}
  >
    <View style={styles.gestureIcon}>{icon}</View>
    <View style={styles.gestureContent}>
      <Text style={[styles.subtitle, { color }]}>{title}</Text>
      <Text style={styles.subtitle}>{description}</Text>
    </View>
  </Animated.View>
);

// Feedback Item Component
const FeedbackItem = ({
  label,
  badgeText,
  borderColor,
  bgColor,
}: {
  label: string;
  badgeText: string;
  borderColor: string;
  bgColor: string;
}) => (
  <View style={styles.feedbackItem}>
    <View
      style={[
        styles.feedbackBadge,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
    >
      <Text style={styles.badgeText}>{badgeText}</Text>
    </View>
    <Text style={styles.feedbackLabel}>{label}</Text>
  </View>
);

export default function HelpScreen({ onClose }: HelpScreenProps) {
  const { translate } = useLanguage();

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn} style={styles.header}>
          <Text style={styles.title}>{translate("helpTitle")}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.subtitle}>{translate("helpSubtitle")}</Text>

          {/* MAX Distance - Top Finger */}
          <GestureCard
            title={translate("maxDistanceTitle")}
            description={translate("maxDistanceDesc")}
            icon={<HandIcon color="#2196F3" finger="top" />}
            color="#2196F3"
            delay={100}
          />

          {/* MIN Distance - Bottom Finger */}
          <GestureCard
            title={translate("minDistanceTitle")}
            description={translate("minDistanceDesc")}
            icon={<HandIcon color="#4CAF50" finger="bottom" />}
            color="#4CAF50"
            delay={200}
          />

          {/* Symmetric Zoom */}
          <GestureCard
            title={translate("cameraZoomTitle")}
            description={translate("cameraZoomDesc")}
            icon={<HandIcon color="#FF9800" finger="both" />}
            color="#FF9800"
            delay={300}
          />

          {/* Horizontal FOV */}
          <GestureCard
            title={translate("fovTitle")}
            description={translate("fovDesc")}
            icon={<HandIcon color="#00BCD4" direction="horizontal" />}
            color="#00BCD4"
            delay={400}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {translate("visualFeedbackTitle")}
          </Text>

          <View style={styles.feedbackGrid}>
            <FeedbackItem
              label={translate("yellowTopTooFar")}
              badgeText="▲"
              borderColor="#FFC864"
              bgColor="rgba(255, 200, 100, 0.2)"
            />

            <FeedbackItem
              label={translate("blueBottomTooClose")}
              badgeText="▼"
              borderColor="#64C8FF"
              bgColor="rgba(100, 200, 255, 0.2)"
            />

            <FeedbackItem
              label={translate("whiteEdgeTurn")}
              badgeText="◀"
              borderColor="rgba(255,255,255,0.5)"
              bgColor="rgba(255, 255, 255, 0.1)"
            />

            <FeedbackItem
              label={translate("cyanPulsingRing")}
              badgeText="◎"
              borderColor="#00FFFF"
              bgColor="rgba(0, 255, 255, 0.15)"
            />
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>{translate("proTipsTitle")}</Text>
            <Text style={styles.tipText}>{translate("proTip1")}</Text>
            <Text style={styles.tipText}>{translate("proTip2")}</Text>
            <Text style={styles.tipText}>{translate("proTip3")}</Text>
            <Text style={styles.tipText}>{translate("proTip4")}</Text>
            <Text style={styles.tipText}>{translate("proTip5")}</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{translate("helpFooter")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00ffff",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#cccccc",
    marginBottom: 24,
    lineHeight: 22,
  },
  gestureCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  gestureIcon: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  gestureContent: {
    flex: 1,
    marginLeft: 12,
  },
  gestureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  gestureDescription: {
    fontSize: 13,
    color: "#aaaaaa",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  feedbackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  feedbackItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
  },
  feedbackBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  badgeText: {
    fontSize: 18,
    color: "white",
  },
  feedbackLabel: {
    fontSize: 12,
    color: "#cccccc",
    flex: 1,
    flexWrap: "wrap",
  },
  tipBox: {
    backgroundColor: "rgba(0, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.2)",
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffff",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: "#cccccc",
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: "#666666",
    textAlign: "center",
  },
});
