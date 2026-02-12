import { useState, useCallback } from 'react';

interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}

/**
 * 비동기 함수 상태 관리 훅
 * @param asyncFunction 실행할 비동기 함수
 * @param immediate 마운트 시 자동 실행 여부 (기본값: false)
 */
export function useAsync<T, A extends any[]>(
    asyncFunction: (...args: A) => Promise<T>,
    immediate = false
) {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        loading: immediate,
        error: null,
    });

    const execute = useCallback(
        async (...args: A) => {
            setState((prev) => ({ ...prev, loading: true, error: null }));
            try {
                const data = await asyncFunction(...args);
                setState({ data, loading: false, error: null });
                return data;
            } catch (error) {
                setState({ data: null, loading: false, error: error as Error });
                throw error;
            }
        },
        [asyncFunction]
    );

    // immediate가 true일 경우 useEffect로 실행하는 로직은 사용하는 컴포넌트에서 처리하도록 권장
    // (args 주입 등의 문제로 hook 내부에서 useEffect 처리보다는 execute 반환이 유연함)

    return { ...state, execute, setData: (data: T) => setState(prev => ({ ...prev, data })) };
}
