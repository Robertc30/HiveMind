import React, { useEffect, useRef, useState } from 'react';
import getStroke from 'perfect-freehand';
import { X } from 'lucide-react';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface WhiteboardProps {
  onClose?: () => void;
  embedded?: boolean;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ onClose, embedded = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [paths, setPaths] = useState<Point[][]>([]);
  const [color, setColor] = useState('#000000');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Redraw all paths
      paths.forEach(path => {
        drawPath(ctx, path);
      });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [paths]);

  const drawPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    const stroke = getStroke(points, {
      size: 8,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });

    ctx.beginPath();
    ctx.fillStyle = color;

    if (stroke.length > 0) {
      ctx.moveTo(stroke[0][0], stroke[0][1]);

      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }

      ctx.fill();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    const point = { x, y, pressure: e.pressure };
    setCurrentPath([point]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const point = { x, y, pressure: e.pressure };
    setCurrentPath(prev => [...prev, point]);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    paths.forEach(path => {
      drawPath(ctx, path);
    });

    drawPath(ctx, [...currentPath, point]);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    if (currentPath.length > 0) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath([]);
    }
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  if (embedded) {
    return (
      <div className="absolute inset-0 flex flex-col bg-white">
        <div className="flex items-center justify-between p-2 border-b">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className="flex-grow touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOut={handlePointerUp}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[800px] max-w-[90vw]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <button
              onClick={handleClear}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className="border border-gray-200 rounded w-full h-[500px] touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOut={handlePointerUp}
        />
      </div>
    </div>
  );
};

export default Whiteboard;