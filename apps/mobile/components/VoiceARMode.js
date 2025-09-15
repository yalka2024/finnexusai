import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function VoiceARMode() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice & AR Mode</Text>
      <Text style={styles.subtitle}>Conversational AI and immersive portfolio visualizations coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#22223b',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 24,
    color: '#00eaff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
});
