"use client";

import React, { useRef, useState, useEffect } from "react";

/**
 * TiltCard: Hardware-accelerated 3D mouse tracking perspective tilt with specular glare.
 * Strictly respects prefers-reduced-motion.
 */
interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max tilt degrees (default 6)
  glare?: boolean;
  variant?: "gold" | "silver" | "glass" | "default";
}

export function TiltCard({
  children,
  className = "",
  maxTilt = 6,
  glare = true,
  variant = "default",
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((centerY - y) / centerY) * maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) translateZ(12px)`,
      transition: "transform 0.08s ease-out",
    });

    // Glare follow
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    const glareColor =
      variant === "gold"
        ? "rgba(243, 219, 158, 0.16)"
        : variant === "silver"
        ? "rgba(232, 236, 242, 0.16)"
        : "rgba(255, 255, 255, 0.10)";

    setGlareStyle({
      opacity: 1,
      background: `radial-gradient(circle at ${glareX}% ${glareY}%, ${glareColor} 0%, transparent 60%)`,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) translateZ(0px)",
      transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    });
    setGlareStyle({ opacity: 0, transition: "opacity 0.4s ease" });
  };

  const variantBorder =
    variant === "gold"
      ? "border-luxury-gold/30 hover:border-luxury-gold/60 shadow-gold-glow"
      : variant === "silver"
      ? "border-luxury-silver/30 hover:border-luxury-silver/60"
      : "border-white/[0.08] hover:border-luxury-gold/30";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={`relative overflow-hidden rounded-2xl bg-luxury-cream/80 backdrop-blur-md border ${variantBorder} transition-colors duration-300 ${className}`}
      {...props}
    >
      {/* Specular Glare Layer */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity"
        style={glareStyle}
      />
      {children}
    </div>
  );
}

/**
 * AnimatedNumber: Smooth numeric counter using requestAnimationFrame
 */
interface AnimatedNumberProps {
  value: number;
  duration?: number; // in ms
  formatter?: (val: number) => string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 800,
  formatter,
  decimals,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const startRef = useRef(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = startRef.current;
    const change = value - startValue;

    if (change === 0) return;

    const factor = decimals !== undefined ? Math.pow(10, decimals) : 1;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out expo curve
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round((startValue + change * easedProgress) * factor) / factor;
      setDisplayValue(current);
      startRef.current = current;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value, duration, decimals]);

  const formatted = formatter
    ? formatter(displayValue)
    : decimals !== undefined
    ? displayValue.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : displayValue.toLocaleString("en-IN");

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * GlassCard: Standard luxury dark graphite card with metallic hairline border
 */
export function GlassCard({
  children,
  className = "",
  elevated = false,
  goldRim = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
  goldRim?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${
        elevated ? "glass-panel-elevated" : "glass-panel"
      } ${
        goldRim
          ? "border-luxury-gold/35 shadow-gold-glow"
          : "border-white/[0.08] hover:border-luxury-gold/30"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * PulseDot: Subtle live indicator
 */
export function PulseDot({
  color = "gold",
  className = "",
  label,
}: {
  color?: "gold" | "green" | "amber" | "red";
  className?: string;
  label?: string;
}) {
  const colorMap = {
    gold: "bg-luxury-gold",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-rose-500",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${colorMap[color]}`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${colorMap[color]}`}
        />
      </span>
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold-champagne">
          {label}
        </span>
      )}
    </span>
  );
}
