import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../store/authStore';
import {useSrsQueue} from '../hooks/useVocab';
import type {RootStackParamList} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const nav = useNavigation<Nav>();
  const {data: srsQueue, isLoading: srsLoading} = useSrsQueue();

  const dueCount = srsQueue?.length ?? 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.flag}>🇯🇵</Text>
        <Text style={styles.title}>Nihongo</Text>
        <Text style={styles.subtitle}>React Native CLI · TanStack · Zustand</Text>
        {isLoggedIn && user ? (
          <Text style={styles.welcome}>Xin chào, {user.name}</Text>
        ) : (
          <Pressable style={styles.loginBtn} onPress={() => nav.navigate('Login')}>
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </Pressable>
        )}
      </View>

      {/* SRS Banner */}
      {srsLoading ? (
        <ActivityIndicator style={{marginVertical: 16}} color="#dc2626" />
      ) : dueCount > 0 ? (
        <Pressable
          style={styles.srsBanner}
          onPress={() => nav.getParent()?.navigate('Review')}>
          <Text style={styles.srsBannerText}>
            📚 {dueCount} thẻ cần ôn tập hôm nay
          </Text>
          <Text style={styles.srsBannerArrow}>›</Text>
        </Pressable>
      ) : null}

      {/* Nav cards */}
      <Text style={styles.section}>HỌC TẬP</Text>
      <NavCard
        icon="📖"
        title="Từ vựng"
        subtitle="Danh sách từ vựng theo JLPT"
        onPress={() => nav.getParent()?.navigate('Vocab')}
      />
      <NavCard
        icon="🔁"
        title="Ôn SRS"
        subtitle={dueCount > 0 ? `${dueCount} thẻ đang chờ` : 'Không có thẻ hôm nay'}
        onPress={() => nav.getParent()?.navigate('Review')}
      />

      <Text style={styles.section}>TÀI KHOẢN</Text>
      <NavCard
        icon="⭐️"
        title="Nâng cấp Premium"
        subtitle="Mua gói bằng Apple Pay / Google Pay"
        onPress={() => nav.navigate('Premium')}
      />
      <NavCard
        icon="👤"
        title={isLoggedIn ? 'Tài khoản' : 'Đăng nhập'}
        subtitle={isLoggedIn ? user?.email ?? '' : 'Sync tiến độ lên server'}
        onPress={() =>
          isLoggedIn
            ? nav.getParent()?.navigate('Profile')
            : nav.navigate('Login')
        }
      />
    </ScrollView>
  );
}

function NavCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1, backgroundColor: '#f5f3ef'},
  container: {padding: 16, paddingBottom: 32},
  hero: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  flag: {fontSize: 48, marginBottom: 8},
  title: {fontSize: 26, fontWeight: '700', color: '#111827'},
  subtitle: {fontSize: 12, color: '#9ca3af', marginTop: 4},
  welcome: {marginTop: 12, fontSize: 14, color: '#374151', fontWeight: '600'},
  loginBtn: {
    marginTop: 12,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loginBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  srsBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  srsBannerText: {flex: 1, color: '#dc2626', fontWeight: '600', fontSize: 14},
  srsBannerArrow: {fontSize: 20, color: '#dc2626'},
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardPressed: {opacity: 0.8},
  cardIcon: {fontSize: 28},
  cardBody: {flex: 1},
  cardTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  cardSub: {fontSize: 12, color: '#6b7280', marginTop: 2},
  cardArrow: {fontSize: 22, color: '#d1d5db'},
});
