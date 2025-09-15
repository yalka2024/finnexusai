import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import Onboarding from './components/Onboarding';
import VoiceARMode from './components/VoiceARMode';

export default function App() {
  return (
    <ScrollView style={styles.scroll}>
  <View style={styles.container} testID="main-app">
        <Onboarding />
        <VoiceARMode />
        {/* Advanced Analytics Widget */}
        <View style={{ backgroundColor: '#222', borderRadius: 12, padding: 16, marginVertical: 12, width: '90%' }}>
          <Text style={{ color: '#00eaff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Advanced Analytics</Text>
          <Text style={{ color: '#fff' }}>Forecasts: 1200, 950, 800</Text>
          <Text style={{ color: '#fff' }}>Volatility: 0.12</Text>
          <Text style={{ color: '#fff' }}>Risk Scores: 0.2, 0.4, 0.1</Text>
        </View>
        {/* Leaderboard Widget */}
        <View style={{ backgroundColor: '#222', borderRadius: 12, padding: 16, marginVertical: 12, width: '90%' }}>
          <Text style={{ color: '#00eaff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Leaderboard</Text>
          <Text style={{ color: '#fff' }}>Alice - $1.2M</Text>
          <Text style={{ color: '#fff' }}>Bob - $950K</Text>
          <Text style={{ color: '#fff' }}>Carol - $800K</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
});
