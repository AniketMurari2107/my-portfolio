import { useEffect, useRef } from 'react';
import { carLiveState, useGameStore } from '../store/gameStore.js';
import { PORTFOLIO_ZONES, WORLD_LANDMARKS, worldToMinimap } from '../game/worldZones.js';
import { CHECKPOINTS, EASTER_EGGS, ENERGY_CRYSTALS } from '../game/worldGameplayData.js';
import { audioEngine } from '../game/audioEngine.js';

const MAP_SIZE = 148;
const WORLD_SPAN = 190;

/**
 * Live 2D radar minimap projecting the outer highway loop, radial roads,
 * checkpoints, energy crystals, discovered secrets, interactive districts, and player heading.
 */
export function Minimap() {
  const canvasRef = useRef(null);
  const teleportToZone = useGameStore((s) => s.teleportToZone);
  const activeSection = useGameStore((s) => s.activeSection);
  const visitedZones = useGameStore((s) => s.visitedZones);

  useEffect(() => {
    let rafId = 0;
    let lastDrawKey = '';

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const state = useGameStore.getState();
        const drawKey = `${carLiveState.x.toFixed(2)}|${carLiveState.z.toFixed(2)}|${carLiveState.yaw.toFixed(3)}|${state.collectedCrystals.length}|${state.checkpointsCleared.length}|${state.discoveredEggs.length}`;
        if (drawKey !== lastDrawKey) {
          lastDrawKey = drawKey;
          const ctx = canvas.getContext('2d');
          const size = MAP_SIZE;
          ctx.clearRect(0, 0, size, size);

        // Background disc
        ctx.fillStyle = 'rgba(5, 9, 22, 0.92)';
        ctx.fillRect(0, 0, size, size);

        const half = size / 2;
        const scale = half / (WORLD_SPAN * 0.5);

        // Island rim, outer loop highway, and central plaza rings
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(half, half, 126 * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.32)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(half, half, 76 * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(half, half, 46 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Radial roads to portfolio districts
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = 1.6;
        PORTFOLIO_ZONES.forEach((zone) => {
          const p = worldToMinimap(zone.position[0], zone.position[2], size, WORLD_SPAN);
          ctx.beginPath();
          ctx.moveTo(half, half);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });

        // Uncollected Energy Crystals (tiny cyan glints)
        ENERGY_CRYSTALS.forEach((crys) => {
          if (state.collectedCrystals.includes(crys.id)) return;
          const p = worldToMinimap(crys.position[0], crys.position[2], size, WORLD_SPAN);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        });

        // Checkpoints (cyan hollow ring until cleared, emerald filled when cleared)
        CHECKPOINTS.forEach((cp) => {
          const cleared = state.checkpointsCleared.includes(cp.id);
          const p = worldToMinimap(cp.position[0], cp.position[2], size, WORLD_SPAN);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          if (cleared) {
            ctx.fillStyle = '#10b981';
            ctx.fill();
          } else {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        });

        // Discovered Easter Eggs (amber beacon dots)
        EASTER_EGGS.forEach((egg) => {
          if (!state.discoveredEggs.includes(egg.id)) return;
          const p = worldToMinimap(egg.position[0], egg.position[2], size, WORLD_SPAN);
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Garage & Viewpoint markers
        const garagePt = worldToMinimap(0, 0, size, WORLD_SPAN);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(garagePt.x - 3.5, garagePt.y - 3.5, 7, 7);

        const viewPt = worldToMinimap(
          WORLD_LANDMARKS.viewpoint.position[0],
          WORLD_LANDMARKS.viewpoint.position[2],
          size,
          WORLD_SPAN
        );
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(viewPt.x - 2.5, viewPt.y - 2.5, 5, 5);

        // Portfolio Zone beacons
        PORTFOLIO_ZONES.forEach((zone) => {
          const p = worldToMinimap(zone.position[0], zone.position[2], size, WORLD_SPAN);
          ctx.fillStyle = zone.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Player car directional chevron
        const carPt = worldToMinimap(carLiveState.x, carLiveState.z, size, WORLD_SPAN);
        ctx.save();
        ctx.translate(carPt.x, carPt.y);
        ctx.rotate(-carLiveState.yaw);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4.2, 4.2);
        ctx.lineTo(0, 1.8);
        ctx.lineTo(-4.2, 4.2);
        ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="hud-surface rounded-xl p-2.5 flex flex-col gap-2 pointer-events-auto">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono-tech text-[10px] tracking-wider text-slate-400 uppercase">
          Island Radar
        </span>
        {PORTFOLIO_ZONES.length > 0 && (
          <span className="font-mono-tech text-[10px] text-cyan-400 tabular-nums">
            {visitedZones.length}/{PORTFOLIO_ZONES.length}
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={MAP_SIZE}
        height={MAP_SIZE}
        className="rounded-lg border border-white/10 block"
      />
    </div>
  );
}
