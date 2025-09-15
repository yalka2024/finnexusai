import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Onboarding() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to FinAI Nexus</Text>
      <Text style={styles.subtitle}>Your AI-powered financial journey starts here.</Text>
      <Text style={styles.step}>Step 1: Connect your wallet</Text>
      <Text style={styles.step}>Step 2: Set your financial goals</Text>
      <Text style={styles.step}>Step 3: Explore demo mode and rewards</Text>
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
    fontSize: 28,
    color: '#39ff14',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#00eaff',
    marginBottom: 16,
  },
  step: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 6,
  },
});
