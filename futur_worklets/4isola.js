//Step 4: Add the Isolated Reactive Element Component
// This structural wrapper 
// reads coordinates directly out of your native memory reference pool using 
// useAnimatedProps. It updates the positions of UI components without 
// triggering React component re-renders.
function ARNodePointer({ index, streamRef }) {
  const animatedProps = useAnimatedProps(() => {
    const data = streamRef.value[index];
    if (!data) return { cx: 0, cy: 0, opacity: 0 };
    return {
      cx: data.x,
      cy: data.y,
      opacity: data.opacity
    };
  });

  const textProps = useAnimatedProps(() => {
    const data = streamRef.value[index];
    if (!data) return { x: 0, y: 0, opacity: 0 };
    return {
      x: data.x + 16,
      y: data.y + 4,
      opacity: data.opacity
    };
  });

  return (
    <>
      <AnimatedCircle r={8} fill="#00ffff" stroke="#fff" strokeWidth={2} animatedProps={animatedProps} />
      <AnimatedText fill="#fff" fontSize={14} fontWeight="bold" animatedProps={textProps}>
        {ISLANDS[index].name}
      </AnimatedText>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" }
});
