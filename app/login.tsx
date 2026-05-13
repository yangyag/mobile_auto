import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

export default function LoginScreen() {
  const { state, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [showTotp, setShowTotp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (state.status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  async function onSubmit() {
    if (!username || !password) {
      setErrorMsg('아이디와 비밀번호를 입력하세요');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await login({ username, password, totp_code: totp || undefined });
    } catch (e: any) {
      setErrorMsg(e?.message ?? '로그인 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>AutoMobile</Text>
        <Text style={styles.subtitle}>자동매매 모니터링</Text>

        <TextInput
          style={styles.input}
          placeholder="아이디"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable onPress={() => setShowTotp((v) => !v)} style={styles.totpToggle}>
          <Text style={styles.totpToggleText}>
            {showTotp ? '▼' : '▶'} TOTP 사용
          </Text>
        </Pressable>
        {showTotp ? (
          <TextInput
            style={styles.input}
            placeholder="TOTP 6자리"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            maxLength={6}
            value={totp}
            onChangeText={setTotp}
          />
        ) : null}

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>로그인</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: colors.bg, color: colors.text,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6,
    marginBottom: 10, fontSize: 14,
  },
  totpToggle: { paddingVertical: 6 },
  totpToggleText: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.negative, fontSize: 12, marginVertical: 6, textAlign: 'center' },
  button: {
    backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 6,
    alignItems: 'center', marginTop: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.bg, fontWeight: '600' },
});
