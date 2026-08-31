import { ref, computed } from 'vue';

const TOKEN_KEY = 'iflow-sentinel-auth-token';
const USERNAME_KEY = 'iflow-sentinel-auth-username';

// 전역 싱글톤 반응형 상태 (localStorage와 동기화)
const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '');
const username = ref<string>(localStorage.getItem(USERNAME_KEY) || '');

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);

  const getToken = (): string => token.value;

  const login = (accessToken: string, user: string) => {
    token.value = accessToken;
    username.value = user;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USERNAME_KEY, user);
  };

  const logout = () => {
    token.value = '';
    username.value = '';
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  };

  return {
    token,
    username,
    isAuthenticated,
    getToken,
    login,
    logout,
  };
}
