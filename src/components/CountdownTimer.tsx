'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Flame, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string | Date;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showSeconds?: boolean;
  showIcon?: boolean;
  prefix?: string;
  expiredText?: string;
  onExpire?: () => void;
  className?: string;
}

export function CountdownTimer({
  targetDate,
  size = 'sm',
  showSeconds = true,
  showIcon = true,
  prefix = '',
  expiredText = 'Kickoff Passed',
  onExpire,
  className = '',
}: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isUrgent: boolean;
    isCritical: boolean;
    isExpired: boolean;
    formatted: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    const calculateTime = () => {
      const targetTime = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({
          totalMs: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isUrgent: false,
          isCritical: false,
          isExpired: true,
          formatted: expiredText,
        });
        onExpire?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const isCritical = diff < 15 * 60 * 1000; // < 15 mins
      const isUrgent = diff < 60 * 60 * 1000; // < 1 hour

      let formatted = '';
      if (days > 0) {
        formatted = `${days}d ${hours}h ${minutes}m`;
        if (showSeconds && days === 1) {
          formatted += ` ${seconds}s`;
        }
      } else if (hours > 0) {
        formatted = `${hours}h ${minutes}m`;
        if (showSeconds) {
          formatted += ` ${seconds}s`;
        }
      } else {
        formatted = `${minutes}m ${seconds}s`;
      }

      setTimeLeft({
        totalMs: diff,
        days,
        hours,
        minutes,
        seconds,
        isUrgent,
        isCritical,
        isExpired: false,
        formatted,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, showSeconds, expiredText, onExpire]);

  if (!mounted || !timeLeft) {
    return (
      <span className={`inline-flex items-center gap-1 text-neutral-500 font-mono text-xs ${className}`}>
        {showIcon && <Clock className="w-3.5 h-3.5 animate-pulse" />}
        <span>Calculating...</span>
      </span>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <span className={`inline-flex items-center gap-1 text-neutral-500 font-mono text-xs ${className}`}>
        {showIcon && <Clock className="w-3.5 h-3.5 text-neutral-600" />}
        <span>{expiredText}</span>
      </span>
    );
  }

  const sizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm font-semibold',
    lg: 'text-base font-bold',
  }[size];

  // Colors based on urgency
  let colorClasses = 'text-neutral-300';
  let badgeClasses = '';
  let Icon = Clock;

  if (timeLeft.isCritical) {
    colorClasses = 'text-rose-400 font-bold';
    badgeClasses = 'bg-rose-950/50 border-rose-800/80 animate-pulse';
    Icon = Flame;
  } else if (timeLeft.isUrgent) {
    colorClasses = 'text-amber-400 font-semibold';
    badgeClasses = 'bg-amber-950/40 border-amber-800/80';
    Icon = AlertCircle;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono ${sizeClasses} ${colorClasses} ${className}`}
      title={`Kickoff: ${new Date(targetDate).toLocaleString()}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>
        {prefix}
        {timeLeft.formatted}
      </span>
    </span>
  );
}
