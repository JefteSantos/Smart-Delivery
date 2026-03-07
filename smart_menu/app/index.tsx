import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';

export default function Index() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  if (user) {
    // Se o usuário tem nível 'master', poderíamos redirecionar para /(master) aqui!
    return <Redirect href="/(client)/home" />;
  }

  // Se não estiver logado, vai pra tela de login
  return <Redirect href="/(auth)/login" />;
}
