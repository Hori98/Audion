import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function TestAPIScreen() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001';

      const response = await fetch(`${API_BASE_URL}/docs`);
      if (response.ok) {
        setResult('✅ Backend connection successful!');
      } else {
        setResult(`❌ Backend returned status: ${response.status}`);
      }
    } catch (error) {
      setResult(`❌ Connection failed: ${error}`);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Connection Test</Text>
      <Text style={styles.subtitle}>API URL: {process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001'}</Text>

      <Button
        title={loading ? "Testing..." : "Test Backend Connection"}
        onPress={testBackendConnection}
        disabled={loading}
      />

      {result ? <Text style={styles.result}>{result}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 30,
    textAlign: 'center',
  },
  result: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
});