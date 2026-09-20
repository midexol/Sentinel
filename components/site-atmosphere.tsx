"use client";

import React, { useEffect, useRef, useState } from "react";

export default function SiteAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas) return;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const nodeCount = Math.min(45, Math.floor(W / 28));
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 1.8 + 1,
      baseAlpha: Math.random() * 0.4 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    const waves = [
      { yFrac: 0.3, amp: 24, freq: 0.002, speed: 0.00015, color: [201, 169, 97], alpha: 0.04 },
      { yFrac: 0.55, amp: 30, freq: 0.0016, speed: 0.00012, color: [175, 162, 145], alpha: 0.035 },
      { yFrac: 0.8, amp: 28, freq: 0.0022, speed: 0.00018, color: [201, 169, 97], alpha: 0.04 },
    ];

    let t = 0;
    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, W, H);

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${w.color.join(",")}, ${w.alpha})`;
        ctx.lineWidth = 1.1;

        for (let x = 0; x <= W; x += 14) {
          const y =
            H * w.yFrac +
            Math.sin(x * w.freq + t * w.speed * 8) * w.amp +
            Math.cos(x * w.freq * 0.6 + t * w.speed * 5) * (w.amp * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -10) node.x = W + 10;
        if (node.x > W + 10) node.x = -10;
        if (node.y < -10) node.y = H + 10;
        if (node.y > H + 10) node.y = -10;

        const dx = node.x - mousePos.x;
        const dy = node.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 0) {
          const force = (160 - dist) / 160;
          node.x += (dx / dist) * force * 1.2;
          node.y += (dy / dist) * force * 1.2;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 169, 97, ${node.baseAlpha})`;
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const ndx = node.x - other.x;
          const ndy = node.y - other.y;
          const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
          if (nDist < 115) {
            const lineAlpha = (1 - nDist / 115) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(201, 169, 97, ${lineAlpha})`;
            ctx.lineWidth = 0.7;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [mousePos.x, mousePos.y]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 opacity-70"
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(201, 169, 97, 0.03), transparent 80%)`,
        }}
      />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(201,169,97,0.04),rgba(0,0,0,0))] pointer-events-none z-0" />
    </>
  );
}
