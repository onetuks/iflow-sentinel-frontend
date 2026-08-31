import { ref } from 'vue';

const STORAGE_KEY = 'iflow-sentinel-admin-key';

// 전역 싱글톤 반응형 상태 (localStorage와 동기화)
const adminKey = ref<string>(localStorage.getItem(STORAGE_KEY) || '');

export function useAdminKey() {
  const getAdminKey = (): string => adminKey.value;

  const setAdminKey = (value: string) => {
    adminKey.value = value.trim();
    if (adminKey.value) {
      localStorage.setItem(STORAGE_KEY, adminKey.value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearAdminKey = () => setAdminKey('');

  return {
    adminKey,
    getAdminKey,
    setAdminKey,
    clearAdminKey,
  };
}
