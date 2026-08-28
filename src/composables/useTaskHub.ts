import { ref, computed } from 'vue';
import { apiService } from '../services/api';
import type { LogLevel } from '../types';

export interface LogLevelTask {
  id: string;              // 고유 태스크 ID
  tenantId: number;        // 대상 테넌트 ID
  tenantName: string;      // 테넌트 이름
  targetLevel: LogLevel;   // 변경 목표 로그 레벨
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  message?: string;
  startTime: Date;
  elapsedSeconds: number;  // 실시간 경과 시간 (초)
}

// 전역 싱글톤 반응형 상태 (화면 이동이나 모달 닫기에도 유지됨)
const tasks = ref<LogLevelTask[]>([]);
const isMinimized = ref(false);
let timerInterval: number | null = null;

export function useTaskHub() {
  const activeTasks = computed(() => tasks.value.filter(t => t.status === 'RUNNING'));
  const hasTasks = computed(() => tasks.value.length > 0);
  
  const isTenantBusy = (tenantId: number) => 
    tasks.value.some(t => t.tenantId === tenantId && t.status === 'RUNNING');

  const getTenantRunningTask = (tenantId: number) =>
    tasks.value.find(t => t.tenantId === tenantId && t.status === 'RUNNING');

  // 경과 시간 1초 타이머 제어
  const ensureTimer = () => {
    if (!timerInterval && activeTasks.value.length > 0) {
      timerInterval = window.setInterval(() => {
        tasks.value.forEach(t => {
          if (t.status === 'RUNNING') {
            t.elapsedSeconds = Math.floor((Date.now() - t.startTime.getTime()) / 1000);
          }
        });
      }, 1000);
    }
  };

  const stopTimerIfIdle = () => {
    if (activeTasks.value.length === 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  // 백그라운드 작업 시작 (비동기 격리)
  const startLogLevelTask = async (
    tenantId: number, 
    tenantName: string, 
    level: LogLevel,
    onFinished?: (res: { success: boolean; message: string; logLevel?: LogLevel }) => void
  ) => {
    if (isTenantBusy(tenantId)) {
      throw new Error(`[${tenantName}] 테넌트는 이미 작업이 진행 중입니다.`);
    }

    const task: LogLevelTask = {
      id: `task-${tenantId}-${Date.now()}`,
      tenantId,
      tenantName: tenantName || `Tenant #${tenantId}`,
      targetLevel: level,
      status: 'RUNNING',
      startTime: new Date(),
      elapsedSeconds: 0
    };

    tasks.value.unshift(task);
    // 새 작업이 시작되면 자동으로 펼치기
    isMinimized.value = false;
    ensureTimer();

    try {
      // 프론트엔드가 백엔드 API를 백그라운드에서 비동기 호출
      const res = await apiService.batchUpdateTenantLogLevel(tenantId, level);
      
      if (res.success) {
        task.status = 'SUCCESS';
        task.message = res.message || '로그 레벨 일괄 적용이 성공적으로 완료되었습니다.';
        onFinished?.({ success: true, message: task.message, logLevel: level });
      } else {
        task.status = 'FAILED';
        task.message = res.message || '일부 아티팩트 적용에 실패했습니다.';
        onFinished?.({ success: false, message: task.message, logLevel: level });
      }
    } catch (err: any) {
      const errMsg = err?.message || '네트워크 통신 중 오류가 발생했습니다.';
      task.status = 'FAILED';
      task.message = errMsg;
      onFinished?.({ success: false, message: errMsg, logLevel: level });
    } finally {
      stopTimerIfIdle();
    }
  };

  const dismissTask = (taskId: string) => {
    tasks.value = tasks.value.filter(t => t.id !== taskId);
    stopTimerIfIdle();
  };

  const clearFinishedTasks = () => {
    tasks.value = tasks.value.filter(t => t.status === 'RUNNING');
    stopTimerIfIdle();
  };

  const toggleMinimize = () => {
    isMinimized.value = !isMinimized.value;
  };

  return {
    tasks,
    activeTasks,
    hasTasks,
    isMinimized,
    isTenantBusy,
    getTenantRunningTask,
    startLogLevelTask,
    dismissTask,
    clearFinishedTasks,
    toggleMinimize
  };
}
