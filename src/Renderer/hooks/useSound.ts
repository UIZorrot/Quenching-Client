import { useRef, useEffect, useCallback } from 'react';

/**
 * 全局音效 Hook
 * 管理 clickmain, clicksmall, hover 三种基础音效
 */
export const useSound = () => {
    const mainClickRef = useRef<HTMLAudioElement | null>(null);
    const smallClickRef = useRef<HTMLAudioElement | null>(null);
    const hoverRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (typeof Audio === 'undefined') return;

        mainClickRef.current = new Audio('assets/quenching/clickmain.mp3');
        smallClickRef.current = new Audio('assets/quenching/clicksmall.mp3');
        hoverRef.current = new Audio('assets/quenching/hover.mp3');

        // 预加载
        mainClickRef.current.load();
        smallClickRef.current.load();
        hoverRef.current.load();

        // 设置音量，避免太吵
        mainClickRef.current.volume = 0.6;
        smallClickRef.current.volume = 0.5;
        hoverRef.current.volume = 0.3;
    }, []);

    const playMain = useCallback(() => {
        if (mainClickRef.current) {
            mainClickRef.current.currentTime = 0;
            mainClickRef.current.play().catch(() => { });
        }
    }, []);

    const playSmall = useCallback(() => {
        if (smallClickRef.current) {
            smallClickRef.current.currentTime = 0;
            smallClickRef.current.play().catch(() => { });
        }
    }, []);

    const playHover = useCallback(() => {
        if (hoverRef.current) {
            hoverRef.current.currentTime = 0;
            hoverRef.current.play().catch(() => { });
        }
    }, []);

    return {
        playMain,
        playSmall,
        playHover
    };
};
