// components/DebugClippedOverlay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProjectedPOI } from '@/cumquat/types';

interface DebugClippedOverlayProps {
  poiData: ProjectedPOI[];
  minDistance: number;
  maxDistance: number;
}

export function DebugClippedOverlay({ poiData, minDistance, maxDistance }: DebugClippedOverlayProps) {
  const total = poiData.length;
  const visible = poiData.filter(p => p.screenPos.visible).length;
  const minClipped = poiData.filter(p => p.screenPos.clippedByDistance === 'min').length;
  const maxClipped = poiData.filter(p => p.screenPos.clippedByDistance === 'max').length;
  const offScreen = total - visible - minClipped - maxClipped;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 POI Status</Text>
      <Text style={[styles.stat, { color: '#00ffff' }]}>Visible: {visible}</Text>
      <Text style={[styles.stat, { color: '#4CAF50' }]}>Near Clip: {minClipped} ({"<"} {minDistance}m)</Text>
      <Text style={[styles.stat, { color: '#2196F3' }]}>Far Clip: {maxClipped} ({">"} {maxDistance}m)</Text>
      <Text style={[styles.stat, { color: '#888' }]}>Off Screen: {offScreen}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    minWidth: 150,
  },
  title: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stat: {
    fontSize: 10,
    marginVertical: 1,
  },
});